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
const { explotarConfeti } = require ('./src/efectos.js')

const HaxballInit = HaxballJS.default || HaxballJS;


HaxballInit().then((HBInit) => {
    var room = HBInit({
      roomName: "🏐 VOLEY SERIEDAD | SOLO CABRAZOS Y CON NIVEL ",
      maxPlayers: 16,
      public: true,
      noPlayer: false,
      token: "thr1.AAAAAGncCg-m_YL3adCOcA.jEME9HfTpYU" // Considera renovarlo si caducó
    });



    room.setScoreLimit(5); 
    room.setTimeLimit(3);
    try { room.setCustomStadium(fs.readFileSync('./3dVolley.hbs', 'utf8')); console.log("✅ Mapa cargado."); } catch (e) {}
    
    loadDB(); // Inicia la base de datos

    // === EVENTOS DEL JUEGO ===
    iniciarAnuncios(room); 

    // === EVENTOS DEL JUEGO ===
    room.onPlayerJoin = function(p) { initPlayerDB(p.name); };
    room.onPlayerLeave = function(p) { if (state.readyPlayers.has(p.id)) state.readyPlayers.delete(p.id); };
    
    room.onPlayerChat = function(player, message) {
      // ✍️ RASTREADOR DE CHAT: Si habla, no está AFK
        if (!state.afkData[player.id]) state.afkData[player.id] = {};
        state.afkData[player.id].lastMove = Date.now();

        return procesarChat(player, message, room); // Llama a comandos.js
    };

    room.onGameStart = function() {
      // Limpiamos variables
      state.lastTouch = { id: null, team: null, name: "" }; state.secondLastTouch = { id: null, team: null, name: "" };
      state.redTouches = 0; state.blueTouches = 0; state.wasLastTouchBlock = false;
      state.voleyLastTeam = null; state.voleyLastPlayer = null; 
      state.match_stats = {}; state.isWaitingForPlayers = false; state.readyPlayers.clear();
      
      room.getPlayerList().filter(p => p.team !== 0).forEach(p => { state.match_stats[p.name] = { touches: 0, goals: 0, assists: 0, score: 0 }; });
      
      // 💥 SISTEMA RANKED/UNRANKED DINÁMICO
      var redCount = room.getPlayerList().filter(p => p.team === 1).length;
      var blueCount = room.getPlayerList().filter(p => p.team === 2).length;
      
      // Será Ranked SOLO si ambos equipos tienen la cantidad oficial (ej. 2 vs 2)
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

      // 💥 Ejecutamos el cálculo de la casa de apuestas
      calcularCuotas(room);

      room.sendAnnouncement("🎰 ¡PARTIDO INICIADO! Escribe '!apostar rojo (monto)' o '!apostar azul (monto)'", null, 0xFFD700, "bold");
    };

    // 👁️ RASTREADOR: Guarda el milisegundo exacto de la última actividad
    room.onPlayerActivity = function(player) {
        if (!state.afkData[player.id]) state.afkData[player.id] = {};
        state.afkData[player.id].lastMove = Date.now();
    };

    room.onPositionsReset = function() {
        // Tus variables de reinicio (toques, bloqueos, etc)
        resetVoleyTouches(); 
        resetGameVars();
        normalizeSizes();

        // 🎨 FIX: Usamos db_players en vez de db.players
        room.getPlayerList().filter(p => p.team !== 0).forEach(p => {
            if (db_players[p.name] && db_players[p.name].color !== undefined) {
                room.setPlayerDiscProperties(p.id, { color: db_players[p.name].color });
            }
        });

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
        };
      }  
    };

    room.onGameStop = function() {
      devolverDinero(room); // Llama a apuestas.js
      state.apuestas = {}; state.apuestasAbiertas = false;
    };

    room.onPositionsReset = function() {
        state.redTouches = 0; state.blueTouches = 0; state.wasLastTouchBlock = false;
        state.voleyLastTeam = null; state.voleyLastPlayer = null; 

        // Re-aplicar colores personalizados a los que hayan comprado pintura
        room.getPlayerList().filter(p => p.team !== 0).forEach(p => {
            if (db.players[p.name] && db.players[p.name].color !== undefined) {
                room.setPlayerDiscProperties(p.id, { color: db.players[p.name].color });
            }
        });
    };

    room.onPlayerBallKick = function(player) {
      procesarToqueBola(player, room); // Llama a gameplay.js
    };

    room.onTeamGoal = function(team) {

      procesarGol(team, room); // Llama a gameplay.js
      explotarConfeti(room);

    };

    room.onTeamVictory = function(scores) {
      procesarVictoria(scores, room); // Llama a gameplay.js
    };

    room.onRoomLink = function(link) { console.log("\n🔥 👉 ENTRA AQUÍ: " + link + "\n"); };
});