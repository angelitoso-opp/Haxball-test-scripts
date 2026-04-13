// src/minijuegos/autohost.js

let estadoAuto = {
    activo: false,
    minJugadores: 2 // Mínimo de personas para que el bot decida arrancar
};

// ⚙️ INTERRUPTOR DEL BOT
function toggleAutoHost(room, player) {
    if (!player.admin) return;

    estadoAuto.activo = !estadoAuto.activo;

    if (estadoAuto.activo) {
        room.sendAnnouncement("🤖 [AUTO-HOST ACTIVADO]: El bot tomará el control de las partidas.", null, 0x88FF88, "bold");
        gestionarSala(room); // Ejecuta la revisión inmediatamente
    } else {
        room.sendAnnouncement("🛑 [AUTO-HOST DESACTIVADO]: Control manual devuelto al Admin.", null, 0xFF5555, "bold");
    }
}

// 🧠 EL CEREBRO QUE REPARTE Y INICIA
function gestionarSala(room) {
    if (!estadoAuto.activo) return;

    let todosLosJugadores = room.getPlayerList();
    
    // 1. Mover al Admin (Tú) a espectadores automáticamente
    todosLosJugadores.forEach(p => {
        if (p.admin && p.team !== 0) {
            room.setPlayerTeam(p.id, 0);
            room.sendAnnouncement(`👑 ${p.name} se retira a la zona VIP (Espectadores).`, null, 0xFFD700);
        }
    });

    // Volvemos a leer la lista por si hubo cambios
    todosLosJugadores = room.getPlayerList();
    let jugadoresNormales = todosLosJugadores.filter(p => !p.admin); // Solo los mortales juegan

    // 2. Comprobar si hay gente suficiente
    if (jugadoresNormales.length >= estadoAuto.minJugadores) {
        room.stopGame();

        // 3. Repartir equitativamente (Rojo y Azul)
        // Mezclamos un poco la lista para que no sean siempre los mismos equipos
        jugadoresNormales.sort(() => Math.random() - 0.5);

        jugadoresNormales.forEach((p, index) => {
            // Pares al Rojo (1), Impares al Azul (2)
            let equipoDestino = (index % 2 === 0) ? 1 : 2;
            room.setPlayerTeam(p.id, equipoDestino);
        });

        room.sendAnnouncement(`⚖️ El bot ha repartido los equipos. ¡Empezando en 3 segundos!`, null, 0x88FFFF, "bold");

        // 4. Iniciar partida con un pequeño retraso
        setTimeout(() => {
            if (estadoAuto.activo) {
                room.startGame();
            }
        }, 3000);
    } else {
        room.sendAnnouncement(`⏳ Faltan jugadores para auto-iniciar (Hay ${jugadoresNormales.length}/${estadoAuto.minJugadores}).`, null, 0xFFEE99);
    }
}

// 🚪 CUANDO ALGUIEN ENTRA O SALE, EL BOT REVISA LA SALA
function revisarAutoHost(room) {
    if (estadoAuto.activo) gestionarSala(room);
}

module.exports = { toggleAutoHost, gestionarSala, revisarAutoHost };