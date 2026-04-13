
const HaxballJS = require('haxball.js'); 

const { iniciar16Man, procesarGol16Man, removerJugadorDesconectado } = require('./src/minijuegos/16man');
const { toggleAutoHost, revisarAutoHost } = require('./src/minijuegos/autohost');
// 1. INICIALIZAMOS LA SALA PRIMERO
const HaxballInit = HaxballJS.default || HaxballJS;


HaxballInit().then((HBInit) => {
    
    // Aquí es donde nace la variable 'room'
    var room = HBInit({
        roomName: "⚔️ BATTLE ROYALE | 16 MAN ⚔️",
        maxPlayers: 16,
        public: true,
        noPlayer: true,
        token: "thr1.AAAAAGnc0C_J26oTtLGXUg.kWVk6fEC2SQ" // <--- ⚠️ PON TU TOKEN AQUÍ
    });

    // ==========================================
    // 2. EVENTOS
    // ==========================================

    room.onPlayerChat = function(player, message) {
    
    // 👑 1. LA CONTRASEÑA SECRETA PARA SER ADMIN
    if (message === "liam" || message === "!liam") { 
        room.setPlayerAdmin(player.id, true);
        room.sendAnnouncement(`👑 ¡Bienvenido de vuelta, jefe! Tienes permisos de Admin.`, player.id, 0xFFD700, "bold");
        return false; // Esto evita que los demás jugadores lean la contraseña en el chat
    }

    // 🎮 2. EL COMANDO PARA INICIAR (Solo admins)
    if (message === "!start") {
        if (player.admin) {
            iniciar16Man(room);
        } else {
            room.sendAnnouncement("⚠️ Solo el Admin puede iniciar la partida.", player.id, 0xFF0000);
        }
        return false;
    }
    // 3. autohost para 16man
    if (message === "!autohost") {
        toggleAutoHost(room, player);
        return false;
    }
};

    room.onTeamGoal = function(team) {
        procesarGol16Man(room);
    };

    room.onPlayerJoin = function(player) {
    revisarAutoHost(room);
    };

    // Si termina un partido (por tiempo o goles), el bot vuelve a repartir y empezar
    room.onTeamVictory = function(scores) {
    setTimeout(() => {
        revisarAutoHost(room);
    }, 5000); // 5 segundos de celebración antes del siguiente partido
    };

    room.onPlayerLeave = function(player) {
        removerJugadorDesconectado(room, player);
    };

    // Mensaje en consola para saber que todo salió bien
    room.onRoomLink = function(link) {
        console.log("=========================================");
        console.log("✅ SALA DE MINIJUEGOS ONLINE");
        console.log("🔗 Link:", link);
        console.log("=========================================");
    };

});