const HaxballJS = require('haxball.js');
const fs = require('fs');

// IMPORTAMOS TODOS LOS MÓDULOS DE SRC/
const { CONFIG, state } = require('./src/state.js');
const { db, loadDB, initPlayerDB } = require('./src/database.js');
const { devolverDinero, calcularCuotas } = require('./src/apuestas.js');
const { procesarChat } = require('./src/comandos.js');
const { procesarToqueBola, procesarGol, procesarVictoria } = require('./src/gameplay.js');
const { sendHelpBox, sendWelcomeBox, sendTiendaBox, iniciarAnuncios } = require('./src/ui.js');
const { aplicarUniformesAleatorios } = require('./src/uniforms.js');
const { explotarConfeti, activarEfectoDisco } = require ('./src/efectos.js')

const HaxballInit = HaxballJS.default || HaxballJS;


HaxballInit().then((HBInit) => {
    var room = HBInit({
      roomName: "🏐 VOLEY SERIEDAD | SOLO CABRAZOS Y CON NIVEL ",
      maxPlayers: 16,
      public: true, 
      noPlayer: false,
      token: "thr1.AAAAAGnn60fR5ghc4lvzkw.uSy3cjBlGCs" // Considera renovarlo si caducó
    });

    room.setTimeLimit(0);
    try { room.setCustomStadium(fs.readFileSync('./HostVoley/mapaVoli.hbs', 'utf8')); console.log("✅ Mapa cargado."); } catch (e) {}
    
    loadDB(); // Inicia la base de datos

    // === EVENTOS DEL JUEGO ===
    iniciarAnuncios(room); 
    
    // 🤖 EL MOTOR DEL BOT AUTOMÁTICO
    state.botLoop = setInterval(() => {
        if (state.botActive) {
            const { fillCancha } = require('./src/gameplay.js');
            fillCancha(room);
        }
    }, 1500);

    // === EVENTOS DEL JUEGO ===
    room.onPlayerJoin = function(p) { 
    initPlayerDB(p.name); 
    gestionarMapas(room); // 👈 ¡NUEVO!
    };

   room.onPlayerLeave = function(p) { 
        if (state.readyPlayers.has(p.id)) state.readyPlayers.delete(p.id); 
        
        // 🛡️ SISTEMA DE SUSTITUCIÓN POR PICKEO
        if (room.getScores() != null && p.team !== 0) {
            let equipoAfectado = p.team;
            // Buscamos al compañero que se quedó solo en la cancha
            let sobreviviente = room.getPlayerList().find(x => x.team === equipoAfectado && x.id !== p.id);

            if (sobreviviente) {
                room.stopGame(); // Detenemos el partido
                state.isPicking = true; // Activamos modo elección
                state.capitanes[equipoAfectado] = sobreviviente.id;
                state.turnoPick = equipoAfectado;

                room.sendAnnouncement(`⚠️ ${p.name} abandonó el partido.`, null, 0xFF4444, "bold");
                room.sendAnnouncement(`📢 ${sobreviviente.name}, elige a tu nuevo compañero de los espectadores.`, null, 0xFFFFFF, "bold");
                
                // Llamamos a la función de turnos que ya tenemos en gameplay.js
                const { iniciarTurnoCapitan } = require('./src/gameplay.js');
                iniciarTurnoCapitan(room, equipoAfectado);
            } else {
                // Si el equipo quedó vacío (ej. era 1v1), reseteamos la sala
                room.stopGame();
                state.isPicking = false;
                room.getPlayerList().forEach(x => { if(x.id !== 0) room.setPlayerTeam(x.id, 0); });
            }
        }
        
        gestionarMapas(); 
    };
    
    room.onGameStart = function() {
      // ♾️ SISTEMA DE LÍMITE MANUAL
      state.scoreLimit = 5; // Volvemos al límite oficial
      state.juegoTerminadoPorVictoria = false; // Bajamos el escudo de apuestas
      state.isStarting = false; // 👈 Bajamos el escudo al iniciar
      room.setScoreLimit(0); // Forzamos a Haxball a infinito

      // Limpiamos variables
      state.lastTouch = { id: null, team: null, name: "" }; state.secondLastTouch = { id: null, team: null, name: "" };
      state.redTouches = 0; state.blueTouches = 0; state.wasLastTouchBlock = false;
      state.voleyLastTeam = null; state.voleyLastPlayer = null; 
      state.match_stats = {}; state.isWaitingForPlayers = false; state.readyPlayers.clear();
      
      room.getPlayerList().filter(p => p.team !== 0).forEach(p => { state.match_stats[p.name] = { touches: 0, goals: 0, assists: 0, score: 0 }; });
      
      // 💥 SISTEMA RANKED/UNRANKED DINÁMICO
      var redCount = room.getPlayerList().filter(p => p.team === 1).length;
      var blueCount = room.getPlayerList().filter(p => p.team === 2).length;
      
      state.isRankedMatch = (redCount === CONFIG.TEAM_SIZE && blueCount === CONFIG.TEAM_SIZE);
      
      if (state.isRankedMatch) {
          room.sendAnnouncement("💥 INICIANDO PARTIDA RANKED 💥 (ELO en juego)", null, 0x73F527, "bold");
      } else {
          room.sendAnnouncement("⚠️ PARTIDA UNRANKED ⚠️ (Faltan jugadores, no sumará ELO)", null, 0xF52757, "bold");
      }

      // 👕 APLICAR UNIFORMES
      aplicarUniformesAleatorios(room);

      // 🎰 APUESTAS
      state.apuestas = {}; 
      state.apuestasAbiertas = true;
      calcularCuotas(room);
      room.sendAnnouncement("🎰 ¡PARTIDO INICIADO! Escribe '!apostar rojo (monto)' o '!apostar azul (monto)'", null, 0xFFD700, "bold");
    };

    // 👁️ RASTREADOR: Guarda el milisegundo exacto de la última actividad
    room.onPlayerActivity = function(player) {
        if (!state.afkData[player.id]) state.afkData[player.id] = {};
        state.afkData[player.id].lastMove = Date.now();
    };

    room.onPositionsReset = function() {
        // 1. Reiniciar variables de Vóley (Toques, bloqueos, etc)
        state.redTouches = 0; 
        state.blueTouches = 0; 
        state.wasLastTouchBlock = false;
        state.voleyLastTeam = null; 
        state.voleyLastPlayer = null; 

        // 2. Re-aplicar colores personalizados a los que hayan comprado pintura
        room.getPlayerList().filter(p => p.team !== 0).forEach(p => {
            if (db.players[p.name] && db.players[p.name].color !== undefined) {
                room.setPlayerDiscProperties(p.id, { color: db.players[p.name].color });
            }
        });

        // 3. Sistema Anti-AFK al saque
        if (state.autoAfkActivo) {
            let ahora = Date.now();
            let jugadores = room.getPlayerList().filter(p => p.team !== 0);
            let afksEncontrados = [];
            
            jugadores.forEach(p => {
                // Si no se ha movido en los últimos 10 segundos (mientras celebraban el gol)
                let tiempoInactivo = ahora - (state.afkData[p.id]?.lastMove || 0);
                if (tiempoInactivo > 10000) { 
                    afksEncontrados.push(p);
                }
            });

            if (afksEncontrados.length > 0) {
                room.pauseGame(true); // PAUSA INMEDIATA
                afksEncontrados.forEach(p => {
                    room.sendAnnouncement(`⚠️ [SISTEMA]: ${p.name}, parece que estás AFK. Muévete para reanudar.`, null, 0xFF8800, "bold");
                });
                
                // Re-verificación tras 5 segundos de gracia
                setTimeout(() => {
                    let todaviaAfks = afksEncontrados.filter(p => (Date.now() - (state.afkData[p.id]?.lastMove || 0)) > 4000);
                    
                    todaviaAfks.forEach(p => {
                        state.afkStrikes[p.name] = (state.afkStrikes[p.name] || 0) + 1;
                        if (state.afkStrikes[p.name] >= 2) {
                            room.kickPlayer(p.id, "deja el afk mano", false);
                        } else {
                            room.sendAnnouncement(`💤 ${p.name} enviado a la banca por inactividad al saque.`, null, 0xFF8888);
                            room.setPlayerTeam(p.id, 0);
                        }
                    });
                    
                    room.pauseGame(false);
                    if (state.botActive) { const { fillCancha } = require('./src/gameplay.js'); fillCancha(room); }
                }, 5000);
            }
        }  
    };

    room.onGameStop = function() {
        // 🛡️ Solo devuelve el dinero si el partido se cortó manualmente (No si alguien ganó)
        if (!state.juegoTerminadoPorVictoria) {
            devolverDinero(room); 
        }
        state.apuestas = {}; state.apuestasAbiertas = false;
        state.juegoTerminadoPorVictoria = false; // Lo reiniciamos por si acaso
    };

     // 🗺️ GESTOR DE MAPAS AUTOMÁTICO
    const gestionarMapas = () => {
        // Contamos SOLO a los jugadores reales que NO están en modo AFK voluntario
        let count = room.getPlayerList().filter(p => p.id !== 0 && !state.afkModeUsers[p.id]).length;
        
        if (count === 1 && state.currentMap !== "practica") {
            try {
                room.stopGame();
                room.setCustomStadium(fs.readFileSync('./HostVoley/practica.hbs', 'utf8'));
                state.currentMap = "practica";
                room.sendAnnouncement("🏗️ MODO PRÁCTICA: Entrenando solo...", null, 0x88FFFF, "bold");
                
                // Buscamos al único jugador y lo metemos a la cancha
                let unicoJugador = room.getPlayerList().find(p => p.id !== 0 && !state.afkModeUsers[p.id]);
                if (unicoJugador) room.setPlayerTeam(unicoJugador.id, 1);
                
                room.startGame();
            } catch (e) { console.log("Error mapa práctica", e); }
            
        } else if (count >= 2 && state.currentMap !== "voley") {
            try {
                room.stopGame();
                room.setCustomStadium(fs.readFileSync('./HostVoley/mapaVoli.hbs', 'utf8'));
                state.currentMap = "voley";
                room.sendAnnouncement("🏐 ¡RIVAL DETECTADO! Mapa Oficial Cargado.", null, 0x88FF88, "bold");
            } catch (e) { console.log("Error mapa oficial", e); }
        }
    };

    let ultimoEnPatear = null;

    room.onPlayerBallKick = function(player) {
      procesarToqueBola(player, room); // Llama a gameplay.js
      ultimoEnPatear = player.id; // Guardamos el ID del último que tocó el balón
    };

    room.onTeamGoal = function(team) {
        procesarGol(team, room); 
        explotarConfeti(room);
        
        // 🪩 1. EFECTO DISCO (Solo si alguien pateó)
        if (ultimoEnPatear) {
            let goleador = room.getPlayer(ultimoEnPatear);
            
            if (goleador && db.players[goleador.name]) {
                let datosUsuario = db.players[goleador.name];
                if (datosUsuario.efecto === "disco") {
                    room.sendAnnouncement(`🪩 ¡EFECTO DISCO DE ${goleador.name.toUpperCase()}! 🪩`, null, 0xFFD700, "bold");
                    activarEfectoDisco(room, goleador.id, goleador.name);
                }
            }
        }
        
        // Limpiamos el último en patear
        ultimoEnPatear = null;

        // 🏆 2. ÁRBITRO DE VICTORIA Y DEUCE (Siempre se ejecuta, haya pateado quien haya pateado)
        let puntajes = room.getScores();
        if (puntajes) {
            let redPts = puntajes.red;
            let bluePts = puntajes.blue;

            // 🔥 DEUCE
            if (redPts === state.scoreLimit - 1 && bluePts === state.scoreLimit - 1) {
                state.scoreLimit++;
                room.sendAnnouncement(`🔥 ¡DEUCE! Empate técnico. El límite sube a ${state.scoreLimit} puntos 🔥`, null, 0xFF6600, "bold");
            }

            // 🏆 VICTORIA MANUAL
            let redGana = redPts >= state.scoreLimit && (redPts - bluePts) >= 2;
            let blueGana = bluePts >= state.scoreLimit && (bluePts - redPts) >= 2;

            if (redGana || blueGana) {
                state.juegoTerminadoPorVictoria = true; // Escudo activado
                room.stopGame(); // Frenamos manualmente
                procesarVictoria(puntajes, room); // Entregamos premios y elo
            }
        }
    };

    room.onTeamVictory = function(scores) {
      procesarVictoria(scores, room); // Llama a gameplay.js
    };

    
    room.onRoomLink = function(link) { console.log("\n🔥 👉 ENTRA AQUÍ: " + link + "\n"); };
});