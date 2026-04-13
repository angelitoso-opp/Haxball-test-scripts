const { db, saveDB, initPlayerDB } = require('./database');
const { state, CONFIG } = require('./state');
const { checkCierreApuestas, pagarGanadores, devolverDinero } = require('./apuestas');
const { activarEfectoDisco } = require('./efectos');

// 🕵️‍♂️ EL NUEVO RASTREADOR INFALIBLE
function getBallIndex(room) {
    let ballPos = room.getBallPosition();
    if (!ballPos) return -1; // Si no hay pelota en el mapa, aborta

    // Plan A: Buscar qué disco tiene las mismas coordenadas que la pelota
    for (let i = 0; i < room.getDiscCount(); i++) {
        let props = room.getDiscProperties(i);
        // Usamos un margen de 0.1 por si hay decimales en la física
        if (props && Math.abs(props.x - ballPos.x) < 0.1 && Math.abs(props.y - ballPos.y) < 0.1) {
            return i;
        }
    }
    
    // Plan B: El método clásico por si el Plan A falla
    for (let i = 0; i < room.getDiscCount(); i++) {
        let props = room.getDiscProperties(i);
        if (props && (props.cGroup & 2) !== 0) return i;
    }
    
    return -1; // Definitivamente no se encontró el ID
}

function setBallColor(room, touches) {
    let ball = getBallIndex(room);
    if (ball === -1) return; // 🛡️ BLOQUEO ANTI-CRASHEO
    
    if (touches <= 1) room.setDiscProperties(ball, { color: 0xFFFFFF }); 
    if (touches == 2) room.setDiscProperties(ball, { color: 0xFFFF00 }); 
    if (touches >= 3) room.setDiscProperties(ball, { color: 0xFF0000 }); 
}

function procesarToqueBola(player, room) {
    if (!state.match_stats[player.name]) {
        state.match_stats[player.name] = { touches: 0, goals: 0, assists: 0, score: 0 };
    }

    if (state.lastTouch.id !== player.id) {
        state.match_stats[player.name].touches++; 
        state.match_stats[player.name].score += 1; 
        
        if (state.lastTouch.id !== null && state.lastTouch.team === player.team && state.match_stats[state.lastTouch.name]) { 
            state.match_stats[state.lastTouch.name].score += 2; 
        } 
        state.secondLastTouch = Object.assign({}, state.lastTouch); 
        state.lastTouch = { id: player.id, team: player.team, name: player.name };
    }

    var pos = player.position, ballPos = room.getBallPosition(), team = player.team;
    if (!pos || !ballPos) return;
    
    var allowDoubleTouch = (room.getPlayerList().filter(p => p.team == team).length <= 1);
    var isBlocking = Math.abs(pos.x) <= CONFIG.NET_ZONE_X && pos.y <= CONFIG.NET_ZONE_Y;
    var isKickoff = (state.redTouches === 0 && state.blueTouches === 0);
    
    let ball = getBallIndex(room); 

    // 🛠️ FIX DOBLE TOQUE: Invertimos las coordenadas
    if (!allowDoubleTouch && !isKickoff && state.voleyLastPlayer == player.id && !state.wasLastTouchBlock) { 
        room.sendAnnouncement("❌ Falta: Doble toque", null, 0xFF0000, "bold"); 
        // Si el Rojo (1) hace doble toque, va a -460 (su arco). Si es el Azul, va a 460.
        if (ball !== -1) room.setDiscProperties(ball, { x: (team == 1 ? -460 : 460), y: 200, xspeed: 0, yspeed: 0 }); 
        return; 
    }
    
    if (isBlocking && (!state.wasLastTouchBlock || state.voleyLastPlayer != player.id)) {
        room.sendAnnouncement("🧱 ¡MURALLA DE " + player.name.toUpperCase() + "!", null, (team == 1) ? 0xFF5555 : 0x5555FF, "bold");
    }

    if (team == 1) { 
        if (state.voleyLastTeam != 1) state.redTouches = 0; 
        if (!isBlocking) {
            state.redTouches++; setBallColor(room, state.redTouches);
            // 🛠️ FIX 4 TOQUES ROJO: Mandamos la bola al arco izquierdo (-460)
            if (state.redTouches > 3) { 
                if (ball !== -1) room.setDiscProperties(ball, { x: -460, y: 200, xspeed: 0, yspeed: 0 }); 
                return; 
            }
            if (state.redTouches == 3) { 
                if (ball !== -1) {
                    var cb = room.getDiscProperties(ball); 
                    room.setDiscProperties(ball, { xspeed: cb.xspeed * CONFIG.BOOST_MATE, yspeed: cb.yspeed * CONFIG.BOOST_MATE }); 
                }
            }
        } else { state.redTouches = 0; setBallColor(room, 1); }
    } else if (team == 2) { 
        if (state.voleyLastTeam != 2) state.blueTouches = 0; 
        if (!isBlocking) {
            state.blueTouches++; setBallColor(room, state.blueTouches);
            // 🛠️ FIX 4 TOQUES AZUL: Mandamos la bola al arco derecho (460)
            if (state.blueTouches > 3) { 
                if (ball !== -1) room.setDiscProperties(ball, { x: 460, y: 200, xspeed: 0, yspeed: 0 }); 
                return; 
            }
            if (state.blueTouches == 3) { 
                if (ball !== -1) {
                    var cb = room.getDiscProperties(ball); 
                    room.setDiscProperties(ball, { xspeed: cb.xspeed * CONFIG.BOOST_MATE, yspeed: cb.yspeed * CONFIG.BOOST_MATE }); 
                }
            }
        } else { state.blueTouches = 0; setBallColor(room, 1); }
    }
    
    state.wasLastTouchBlock = isBlocking; state.voleyLastTeam = team; state.voleyLastPlayer = player.id;
}

function procesarGol(team, room) {
    checkCierreApuestas(room); 
    var scorerId = null, scorerName = "Cancha", isOwnGoal = false, assistName = null;
    
    if (state.lastTouch.team === team) { 
        scorerName = state.lastTouch.name; 
        scorerId = state.lastTouch.id; 
        if (state.secondLastTouch.id !== null && state.secondLastTouch.team === team && state.secondLastTouch.id !== scorerId) assistName = state.secondLastTouch.name; 
    } 
    else if (state.lastTouch.team !== null) { scorerName = state.lastTouch.name; isOwnGoal = true; }

    if (!state.match_stats[scorerName]) { state.match_stats[scorerName] = { touches: 0, goals: 0, assists: 0, score: 0 }; }

    if (!isOwnGoal && scorerId) {
        state.match_stats[scorerName].goals++; 
        state.match_stats[scorerName].score += 15;
        room.sendAnnouncement("🔥 ¡PUNTAZO DE " + scorerName.toUpperCase() + "! 🏐" + (assistName ? " 🧠 Armado de: " + assistName.toUpperCase() : ""), null, 0x88FF88, "bold");
        room.setPlayerDiscProperties(scorerId, { radius: 24 });

        // 🪩 EFECTO DE CELEBRACIÓN MODULARIZADO
        if (db.players[scorerName] && db.players[scorerName].efecto === "disco") {
            activarEfectoDisco(room, scorerId); // 👈 ¡Una sola línea de código!
        }

    } else if (isOwnGoal) { 
        room.sendAnnouncement("🤡 QUE IMBECIL: " + scorerName + " la cagó.", null, 0xFF8888, "bold"); 
    }
}

function procesarVictoria(scores, room) {
    if (scores.red === scores.blue) {
        room.sendAnnouncement("⏱️ ¡TIEMPO AGOTADO! El partido terminó en EMPATE.", null, 0xFFDD00, "bold");
        devolverDinero(room); 
        setTimeout(() => { if (state.botActive) fillCancha(room); }, 1500);
        return; 
    }

    var winningTeam = scores.red > scores.blue ? 1 : 2; 
    var losingTeam = winningTeam === 1 ? 2 : 1;
    pagarGanadores(room, winningTeam); 

    var bestScore = -1, mvpName = "";
    var inGame = room.getPlayerList().filter(p => p.team !== 0);
    
    inGame.forEach(p => { 
        var s = state.match_stats[p.name] || {score:0}; 
        if (s.score > bestScore) { bestScore = s.score; mvpName = p.name; } 
    });
    
    if (mvpName !== "") room.sendAnnouncement("🏆 MVP DEL SET: " + mvpName + " 🌟", null, 0xFFD700, "bold");

    inGame.forEach(p => {
        if (!db.players[p.name]) initPlayerDB(p.name); 
        var dbUser = db.players[p.name];
        
        // 🔒 EL CANDADO: Solo damos ELO si es Ranked
        if (state.isRankedMatch) { 
            if (p.team === winningTeam) { 
                dbUser.wins++; dbUser.elo += 25; dbUser.coins += 10; 
                room.sendAnnouncement(`📈 +25 ELO | 💰 +10 Coins`, p.id, 0x88FF88);
            } else { 
                dbUser.losses++; dbUser.elo = Math.max(0, dbUser.elo - 15); 
                room.sendAnnouncement(`📉 -15 ELO`, p.id, 0xFF8888);
            }
        } else {
            // Si es Unranked, le avisamos al perdedor que se salvó
            if (p.team === losingTeam) {
                room.sendAnnouncement(`🤝 Partida Unranked: Tu ELO está a salvo.`, p.id, 0xAAAAAA);
            }
        }
        
        // El perdedor siempre sale a la banca, sea ranked o no
        if (p.team === losingTeam) room.setPlayerTeam(p.id, 0); 
        
        saveDB(); 
    });
    
    var specs = room.getPlayerList().filter(p => p.team === 0 && p.id !== 0 && !state.afkModeUsers[p.id]);
    for (var i = 0; i < CONFIG.TEAM_SIZE; i++) { if (specs[i]) room.setPlayerTeam(specs[i].id, losingTeam); }

    setTimeout(() => { if (state.botActive) fillCancha(room); }, 1500);
}
  
function fillCancha(room) {
    if (!state.botActive || state.isSubstituting) return;
    var p = room.getPlayerList(), red = p.filter(x => x.team === 1), blue = p.filter(x => x.team === 2);
    
    // Obtenemos a los espectadores activos
    var specs = p.filter(x => x.team === 0 && x.id !== 0 && !state.afkModeUsers[x.id]);
    
    // 🎟️ MAGIA VIP: Reordenamos la lista de espectadores. Los que están en state.colaVIP van de primeros.
    specs.sort((a, b) => {
        let aIsVip = state.colaVIP.includes(a.id) ? 1 : 0;
        let bIsVip = state.colaVIP.includes(b.id) ? 1 : 0;
        return bIsVip - aIsVip; 
    });

    while (specs.length > 0 && (red.length < CONFIG.TEAM_SIZE || blue.length < CONFIG.TEAM_SIZE)) {
        var spec = specs.shift(); // Saca al primero en la fila (que será un VIP si hay alguno)

        // Limpieza: Si el jugador que entró era VIP, le quitamos la pulsera para que no salte la cola gratis la próxima vez
        let vipIndex = state.colaVIP.indexOf(spec.id);
        if (vipIndex !== -1) {
            state.colaVIP.splice(vipIndex, 1);
        }

        // Lo metemos al equipo con menos jugadores
        if (red.length <= blue.length) { 
            room.setPlayerTeam(spec.id, 1); 
            red.push(spec); 
        } else { 
            room.setPlayerTeam(spec.id, 2); 
            blue.push(spec); 
        }
    }

    // Re-evaluamos para ver si la cancha ya está llena y arrancar el Sistema GO
    red = room.getPlayerList().filter(x => x.team === 1); 
    blue = room.getPlayerList().filter(x => x.team === 2);
    
    if (room.getScores() == null && red.length === CONFIG.TEAM_SIZE && blue.length === CONFIG.TEAM_SIZE && !state.isWaitingForPlayers) {
        state.isWaitingForPlayers = true; state.readyPlayers.clear();
        room.sendAnnouncement("📢 ¡CANCHA LLENA! GRITA TU 'GO' PARA INICIAR EL SET", null, 0xFFDD00, "bold");
    }
}

module.exports = { procesarToqueBola, procesarGol, procesarVictoria, fillCancha };