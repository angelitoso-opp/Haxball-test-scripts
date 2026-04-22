const { db, saveDB, getRank, initPlayerDB } = require('./database');
const { state, CONFIG } = require('./state');
const { apostar } = require('./apuestas');
const { fillCancha, iniciarSistemaPickeo, iniciarTurnoCapitan } = require('./gameplay.js'); 
const { sendHelpBox, sendTiendaBox } = require('./ui.js');
const { activarEfectoDisco } = require('./efectos.js');

function procesarChat(player, message, room) {
    
    if (!db.players[player.name]) initPlayerDB(player.name); 
    var dbUser = db.players[player.name];
    var userRank = getRank(dbUser.elo);
    var msg = message.trim(), args = msg.split(" "), cmd = args[0].toLowerCase();

    // 🎯 SISTEMA DE PICKEO POR NÚMEROS (1, 2, 3...)
    if (state.isPicking) {
        let equipoTurno = state.turnoPick;
        let idCapitanTurno = state.capitanes[equipoTurno];

        // Validamos si el que escribió es el capitán de turno
        if (player.id === idCapitanTurno) {
            
            let numeroElegido = parseInt(msg);

            // Si es un número válido (mayor a 0)
            if (!isNaN(numeroElegido) && numeroElegido > 0) {
                
                // 🛠️ EL MISMO PARCHE: Que el chat lea exactamente la misma lista que se imprimió
                let elegibles = room.getPlayerList().filter(p => 
                    p.team === 0 && 
                    p.id !== 0 && 
                    p.id !== state.capitanes[1] && 
                    p.id !== state.capitanes[2] && 
                    !state.afkModeUsers[p.id]
                );
                
                if (numeroElegido > elegibles.length) {
                    room.sendAnnouncement("❌ Número inválido. Ese jugador no existe en la lista.", player.id, 0xFF8888);
                    return false; 
                }

                // Rescatamos al jugador elegido
                let targetPlayer = elegibles[numeroElegido - 1]; 

                clearTimeout(state.pickTimer);
                state.pickTimer = null; // Eliminamos rastro del timer

                room.setPlayerTeam(targetPlayer.id, equipoTurno);
                let colorAviso = equipoTurno === 1 ? 0xFF8888 : 0x8888FF;
                room.sendAnnouncement(`✅ ¡${player.name} ha reclutado a ${targetPlayer.name}!`, null, colorAviso, "bold");

                // 🧠 EVALUACIÓN INTELIGENTE (PREDICTIVA ANTI-BUGS)
                // Contamos nosotros mismos a los jugadores en vez de esperar a que Haxball actualice
                let redCount = 0;
                let blueCount = 0;
                
                room.getPlayerList().forEach(p => {
                    // Si es el jugador que acabamos de mover, le sumamos a su nuevo equipo manualmente
                    let equipoReal = (p.id === targetPlayer.id) ? equipoTurno : p.team;
                    if (equipoReal === 1) redCount++;
                    if (equipoReal === 2) blueCount++;
                });

                if (redCount == CONFIG.TEAM_SIZE && blueCount == CONFIG.TEAM_SIZE) {
                    state.isPicking = false; // Se acabó el pickeo
                    state.isStarting = true; // 🛡️ LEVANTAMOS EL ESCUDO AQUÍ TAMBIÉN
                    room.sendAnnouncement("🚀 ¡EQUIPOS COMPLETOS! Empezando en 2 segundos...", null, 0x88FF88, "bold");
                    setTimeout(() => { room.startGame(); }, 2000);
                } else {
                    // Si faltan cupos, le damos el turno al equipo que tenga menos jugadores
                    if (redCount < CONFIG.TEAM_SIZE) {
                        state.turnoPick = 1;
                        iniciarTurnoCapitan(room, 1);
                    } else {
                        state.turnoPick = 2;
                        iniciarTurnoCapitan(room, 2);
                    }
                }
                
                return false;
            }
        }
    }

    // ⚙️ COMANDO ADMIN: CAMBIAR TAMAÑO DE EQUIPOS (1v1, 2v2, 3v3, etc)
    if (cmd === "!modo" || cmd === "!size") {
        if (!player.admin) return false;
        let nuevoTamano = parseInt(args[1]);

        if (nuevoTamano !== 2 && nuevoTamano !== 3) {
            room.sendAnnouncement("⚠️ Uso: !modo 2 o !modo 3 (El servidor es exclusivo para 2v2 y 3v3)", player.id, 0xFFEE99);
            return false;
        }

        CONFIG.TEAM_SIZE = nuevoTamano;
        room.sendAnnouncement(`⚙️ [SISTEMA] El Admin cambió el formato a ${nuevoTamano} vs ${nuevoTamano}.`, null, 0x88FFFF, "bold");
        return false;
    }

    if (cmd === "liam" || cmd === "!liam") { room.setPlayerAdmin(player.id, true); return false; }
    
    if (cmd === "!apostar") { apostar(player, args, room); return false; }

    if (cmd === "!perfil" || cmd === "!me") { 
        room.sendAnnouncement(`📊 PERFIL DE ${player.name} | ${userRank.emoji} Rango: ${userRank.name} | ⭐ ELO: ${dbUser.elo} | 💰 Coins: ${dbUser.coins} | 🏆 V/D: ${dbUser.wins}/${dbUser.losses}`, player.id, 0xFFEE99, "bold"); 
        return false; 
    }
    if (cmd === "!bot") {
        if (!player.admin) return false; 
            state.botActive = !state.botActive;
        if (state.botActive) { 
            room.sendAnnouncement("🤖 BOT ON", null, 0x88FFFF, "bold"); 
            fillCancha(room); 
            state.botLoop = setInterval(() => fillCancha(room), 1500); 
        } else { 
            room.sendAnnouncement("🛑 BOT OFF", null, 0xFF8888, "bold"); 
            clearInterval(state.botLoop); 
        } 
        return false;
    }

    if (cmd === "!tienda") {
        var item = args[1] ? args[1].toLowerCase() : "";
        
        if (item === "") {
            sendTiendaBox(room, player.id); // Muestra el cartel visual de la tienda
            return false;
        }

        if (item === "tag") {
            var newTag = args.slice(2).join(" ");
            if (!newTag || dbUser.coins < 50) return false;
            dbUser.coins -= 50; dbUser.tag = newTag; saveDB(); 
            room.sendAnnouncement(`✅ Tag actualizado a [${newTag}].`, player.id, 0x88FF88);
        } 

        else if (item === "color") {
            // Diccionario de colores fáciles (puedes agregar los que quieras)
            const coloresDisponibles = {
                "rojo": 0xFF0000,
                "azul": 0x0000FF,
                "verde": 0x00FF00,
                "amarillo": 0xFFFF00,
                "blanco": 0xFFFFFF,
                "negro": 0x000000,
                "rosa": 0xFF66B2,
                "naranja": 0xFFA500,
                "celeste": 0x00FFFF,
                "morado": 0x800080,
                "oro": 0xFFD700
            };

            var colorName = args[2] ? args[2].toLowerCase() : "";

            // Verificamos si el color que escribió está en nuestro diccionario
            if (!coloresDisponibles.hasOwnProperty(colorName)) {
                let listaFiltro = Object.keys(coloresDisponibles).join(", ");
                room.sendAnnouncement(`⚠️ Uso: !tienda color [nombre]\n🎨 Colores: ${listaFiltro}`, player.id, 0xFFEE99);
                return false;
            }

            if (dbUser.coins < 50) {
                room.sendAnnouncement("💸 Te faltan Coins para pintar tu ficha.", player.id, 0xFF8888);
                return false;
            }
            
            // Le cobramos y le ponemos el color traducido a número
            let colorInt = coloresDisponibles[colorName];
            dbUser.coins -= 50; 
            dbUser.color = colorInt; 
            saveDB(); 

            // Si está jugando en la cancha, se lo aplicamos en vivo
            if (player.team !== 0) room.setPlayerDiscProperties(player.id, { color: colorInt });
            
            room.sendAnnouncement(`🎨 Color ${colorName.toUpperCase()} comprado y equipado exitosamente.`, player.id, 0x88FF88);
        }

        else if (item === "vip") {
            if (dbUser.coins < 200) {
                room.sendAnnouncement("💸 Eres pobre. Te faltan Coins para ser VIP.", player.id, 0xFF8888);
                return false;
            }
            dbUser.coins -= 200; 
            if (!dbUser.items) dbUser.items = {}; // Por si alguien no tenía inventario
            dbUser.items["vip"] = (dbUser.items["vip"] || 0) + 1; 
            saveDB(); 
            room.sendAnnouncement(`🎟️ Pase VIP comprado. Escribe '!vip' cuando estés en la tribuna para saltar la fila.`, player.id, 0x88FF88);
        }

        else if (item === "efecto" && args[2] === "disco") {
            if (dbUser.coins < 150) return false;
            dbUser.coins -= 150; dbUser.efecto = "disco"; saveDB(); 
            room.sendAnnouncement(`✨ Compraste la celebración DISCO. ¡Mete un gol para verla en acción!`, player.id, 0x88FF88);
        }
        else {
            room.sendAnnouncement("❌ Objeto no encontrado. Revisa la !tienda", player.id, 0xFF8888);
        }
        return false;
    }

    // 🎟️ ACTIVAR PASE VIP PARA SALTAR LA COLA
    if (cmd === "!vip") {
        if (player.team !== 0) {
            room.sendAnnouncement("⚠️ Ya estás en la cancha. Úsalo cuando estés en la tribuna.", player.id, 0xFFEE99);
            return false;
        }
        if (!dbUser.items || !dbUser.items["vip"] || dbUser.items["vip"] <= 0) {
            room.sendAnnouncement("❌ No tienes Pases VIP. Cómpralo en la !tienda", player.id, 0xFF8888);
            return false;
        }
        if (state.colaVIP.includes(player.id)) {
            room.sendAnnouncement("⚠️ Tranquilo, ya usaste el pase. Estás primero en la fila.", player.id, 0xFFEE99);
            return false;
        }

        // 1. Cobramos el pase y lo anotamos en el cerebro del bot
        dbUser.items["vip"] -= 1; 
        saveDB();
        state.colaVIP.push(player.id);
        
        // 🌪️ 2. EL REVOLEO VISUAL (Hack de la interfaz)
        // Obtenemos a todos los espectadores EXCEPTUANDO al que acaba de usar el VIP
        let otrosEspectadores = room.getPlayerList().filter(p => p.team === 0 && p.id !== player.id);
        
        // Los movemos al equipo 1 (Rojo) y al instante de vuelta al 0 (Espectadores)
        otrosEspectadores.forEach(p => {
            room.setPlayerTeam(p.id, 1); 
            room.setPlayerTeam(p.id, 0); 
        });

        // 3. Anuncio triunfal
        room.sendAnnouncement(`🎟️ ¡ALFOMBRA ROJA! ${player.name} usó un PASE VIP y ahora es el número 1 en la fila.`, null, 0xFFD700, "bold");
        return false;
    }
    
    // 📖 COMANDO DE AYUDA (Dinámico según el rol)
    if (cmd === "!help" || cmd === "!ayuda" || cmd === "!comandos") {
        sendHelpBox(room, player);
        return false;
    }

    // 💰 COMANDO ADMIN: ASIGNAR MONEDAS (Para testeo o premios)
    if (cmd === "!darplata") {
        if (!player.admin) return false;

        let targetId = parseInt(args[1]);
        let monto = parseInt(args[2]);

        // Validación de argumentos
        if (isNaN(targetId) || isNaN(monto)) {
            room.sendAnnouncement("⚠️ Uso: !darplata [ID] [monto]\nEjemplo: !darplata 7 500", player.id, 0xFFEE99);
            return false;
        }

        let targetPlayer = room.getPlayer(targetId);
        if (!targetPlayer) {
            room.sendAnnouncement("❌ ID no encontrada. Usa !ids para ver quién está en la sala.", player.id, 0xFF8888);
            return false;
        }

        // Aseguramos que el jugador tenga perfil en la base de datos
        if (!db.players[targetPlayer.name]) {
            const { initPlayerDB } = require('./database');
            initPlayerDB(targetPlayer.name);
        }

        // Sumamos el monto (puedes usar números negativos para quitar coins también)
        db.players[targetPlayer.name].coins += monto;
        saveDB();

        room.sendAnnouncement(`💰 [BANCO]: El Admin ha transferido ${monto} plata a ${targetPlayer.name}.`, null, 0xFFD700, "bold");
        
        // Avisar al jugador específico por si no estaba atento al chat general
        room.sendAnnouncement(`✨ Has recibido ${monto} plata. Nuevo saldo: ${db.players[targetPlayer.name].coins}`, targetId, 0x88FF88);
        
        return false;
    }

    // 💤 COMANDO VOLUNTARIO AFK
    if (cmd === "!afk") {
        state.afkModeUsers[player.id] = !state.afkModeUsers[player.id];
        
        if (state.afkModeUsers[player.id]) {
            room.sendAnnouncement(`💤 ${player.name} ahora está modo AFK (El bot no te meterá a jugar).`, null, 0xAAAAAA, "bold");
            if (player.team !== 0) room.setPlayerTeam(player.id, 0);
        } else {
            room.sendAnnouncement(`🏃‍♂️ ${player.name} volvió y está listo para jugar.`, null, 0x88FF88, "bold");
        }
        return false;
    }

    // 📋 VER LISTA DE IDs (Cualquiera puede usarlo)
    if (cmd === "!ids" || cmd === "!jugadores") {
        let lista = room.getPlayerList().map(p => `[ID: ${p.id}] ${p.name}`).join("\n");
        room.sendAnnouncement("📋 LISTA DE JUGADORES EN LA SALA:\n" + lista, player.id, 0x88FFFF);
        return false;
    }
    // RELACIONADO A LO AFK
    if (msg === "-1" || msg === "-2") {
        // 🛡️ Si el sistema está apagado, el bot no hace nada
        if (!state.autoAfkActivo) {
            room.sendAnnouncement("⚠️ El bot de moderación AFK está desactivado en este momento.", player.id, 0xFFEE99);
            return false;
        }
        
        if (player.team === 0 || state.isAfkProtocolActive) return false;

        let ahora = Date.now();
        // Buscamos compañeros que NO se hayan movido en el ÚLTIMO SEGUNDO (1000ms)
        let sospechosos = room.getPlayerList().filter(p => 
            p.team === player.team && 
            p.id !== player.id && 
            (ahora - (state.afkData[p.id]?.lastMove || 0)) > 3000 
        );

        if (sospechosos.length > 0) {
            // PROTOCOLO AFK REAL DETECTADO
            state.isAfkProtocolActive = true;
            room.pauseGame(true);
            
            let nombres = sospechosos.map(s => s.name).join(", ");
            room.sendAnnouncement(`🚨 ${player.name} reportó inactividad en [${nombres}].`, null, 0xFFEE99, "bold");
            room.sendAnnouncement(`⏳ 5 segundos para reaccionar...`, null, 0xFFFFFF);

            setTimeout(() => {
                sospechosos.forEach(s => {
                    // Si después de la pausa sigue sin moverse (margen de seguridad)
                    if ((Date.now() - (state.afkData[s.id]?.lastMove || 0)) > 4000) {
                        state.afkStrikes[s.name] = (state.afkStrikes[s.name] || 0) + 1;
                        
                        if (state.afkStrikes[s.name] >= 2) {
                            room.kickPlayer(s.id, "deja el afk mano", false);
                        } else {
                            room.sendAnnouncement(`💤 ${s.name} movido a la banca.`, null, 0xFF8888);
                            room.setPlayerTeam(s.id, 0);
                        }
                    }
                });
                
                room.pauseGame(false);
                state.isAfkProtocolActive = false;
                if (state.botActive) { const { fillCancha } = require('./gameplay'); fillCancha(room); }
            }, 5000);

        } else {
            // 🛡️ BARRERA ANTI-TROLL: Si se movió hace menos de 1 segundo
            room.sendAnnouncement(`🛑 RECHAZADO: Tu compañero está activo. ¡Sigue jugando!`, player.id, 0xFF8888, "bold");
        }
        return false;
    }

    // 👢 KICKEAR A UN JUGADOR
    if (cmd === "!kick") {
        if (!player.admin) return false;
        let targetId = parseInt(args[1]);
        let razon = args.slice(2).join(" ") || "No especificada";
        
        let targetPlayer = room.getPlayer(targetId);
        if (!targetPlayer) { room.sendAnnouncement("❌ ID no encontrada. Usa !ids para ver la lista.", player.id, 0xFF8888); return false; }
        
        room.kickPlayer(targetId, "Expulsado por el Admin. Razón: " + razon, false);
        return false;
    }
    // ⚙️ COMANDO ADMIN: APAGAR/PRENDER SISTEMA AFK
    if (cmd === "!autoafk") {
        if (!player.admin) return false;
        
        state.autoAfkActivo = !state.autoAfkActivo; // Invierte el estado actual
        
        if (state.autoAfkActivo) {
            room.sendAnnouncement("🟢 [SISTEMA]: El bot AFK automático y el comando '-1' han sido ACTIVADOS.", null, 0x88FF88, "bold");
        } else {
            room.sendAnnouncement("🔴 [SISTEMA]: El bot AFK ha sido DESACTIVADO. El Admin se encargará de moderar.", null, 0xFF8888, "bold");
        }
        return false;
    }

    // 🔨 BANEAR A UN JUGADOR
    if (cmd === "!ban") {
        if (!player.admin) return false;
        let targetId = parseInt(args[1]);
        let razon = args.slice(2).join(" ") || "Tóxico / Troll";
        
        let targetPlayer = room.getPlayer(targetId);
        if (!targetPlayer) { room.sendAnnouncement("❌ ID no encontrada. Usa !ids para ver la lista.", player.id, 0xFF8888); return false; }
        
        room.kickPlayer(targetId, "BANEADO. Razón: " + razon, true);
        return false;
    }

    // 🧹 LIMPIAR TODOS LOS BANEOS DE LA SALA
    if (cmd === "!clearbans" || cmd === "!limpiarbans") {
        if (!player.admin) return false; // Solo admins
        
        room.clearBans(); // Función nativa de Haxball que borra la lista negra
        
        room.sendAnnouncement("🧹 [SISTEMA]: El Admin ha limpiado la lista de baneos. Todos los jugadores expulsados pueden volver a entrar.", null, 0x88FF88, "bold");
        return false;
    }

    // 🚨 COMANDO DE EMERGENCIA: REINICIAR ECONOMÍA
    if (cmd === "!reseteco") {
        if (!player.admin) return false; // Solo admins pueden usarlo
        
        // Recorremos a todos los jugadores registrados en la base de datos
        for (let userName in db.players) {
            db.players[userName].coins = 0;       // Todos a 0 monedas
        }
        
        saveDB(); // Guardamos el archivo
        room.sendAnnouncement("📉 ¡LA BOLSA DE VALORES HA CAÍDO! El Admin ha reiniciado la economía de todos a 0 Coins.", null, 0xFF5555, "bold");
        return false;
    }

    if (cmd === "!usar" && args[1] === "gigante") {
        if (!dbUser.items["gigante"] || dbUser.items["gigante"] <= 0 || player.team === 0) return false;
        dbUser.items["gigante"] -= 1; saveDB(); room.setPlayerDiscProperties(player.id, { radius: 25 });
        room.sendAnnouncement(`🦍 ¡${player.name} se ha tomado la poción GIGANTE!`, null, 0xFF5555, "bold");
        return false;
    }
    
    if (!msg.startsWith("!")) {
        room.sendAnnouncement(`[${dbUser.tag}] ${userRank.emoji} ${player.name}: ${msg}`, null, userRank.color, "bold");
        return false; 
    }
    
    return false; 
}

module.exports = { procesarChat };