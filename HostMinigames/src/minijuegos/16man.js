const fs = require('fs');
const path = require('path');

let gameState = {
    jugadoresVivos: [],
    vidas: {},
    angulosDefensa: {},
    jugando: false
};

// 🗺️ CARGADOR AUTOMÁTICO DE MAPAS
function cargarMapa(room, numJugadores) {
    try {
        let nombreMapa = numJugadores + ".hbs";
        if (numJugadores === 1) nombreMapa = "Campeon.hbs"; // Mapa de victoria

        // Calculamos la ruta correcta hacia la carpeta de mapas
        let rutaMapa = path.join(__dirname, '../../mapas/16man', nombreMapa);
        
        // Leemos el archivo y se lo metemos a la sala
        let contenidoMapa = fs.readFileSync(rutaMapa, 'utf8');
        room.setCustomStadium(contenidoMapa);
        
    } catch (err) {
        console.log("❌ Error cargando el mapa: " + numJugadores, err);
        room.sendAnnouncement("⚠️ Falla técnica cargando la arena.", null, 0xFF0000);
    }
}

// 📊 ESCALADO DE VIDAS
function calcularVidasMaximas(sobrevivientes) {
    if (sobrevivientes > 8) return 1;
    if (sobrevivientes > 4) return 2;
    if (sobrevivientes > 2) return 3;
    return 5;
}

// 🚀 INICIO DEL MODO BATTLE ROYALE
function iniciar16Man(room) {
    let jugadores = room.getPlayerList().filter(p => p.team !== 0);
    if (jugadores.length < 2) {
        room.sendAnnouncement("⚠️ Mínimo 2 jugadores para iniciar.", null, 0xFFEE99);
        return;
    }

    room.stopGame(); // Frenamos cualquier cosa que estuviera pasando
    gameState.jugadoresVivos = jugadores.map(p => p.id);
    let vidasIniciales = calcularVidasMaximas(gameState.jugadoresVivos.length);

    gameState.jugadoresVivos.forEach(id => {
        gameState.vidas[id] = vidasIniciales;
    });

    // 1. Cargamos el mapa inicial
    cargarMapa(room, gameState.jugadoresVivos.length);

    // 2. Esperamos un segundo para que Haxball asimile el mapa y damos inicio
    setTimeout(() => {
        room.startGame();
        gameState.jugando = true;
        room.sendAnnouncement(`⚔️ ¡COMIENZA LA MASACRE! Arena de ${gameState.jugadoresVivos.length}.`, null, 0xFFD700, "bold");

        // 3. Medio segundo después de arrancar, les tomamos una "foto" a sus posiciones (ángulos)
        setTimeout(() => {
            gameState.angulosDefensa = {};
            gameState.jugadoresVivos.forEach(id => {
                let ficha = room.getPlayerDiscProperties(id);
                if (ficha) gameState.angulosDefensa[id] = Math.atan2(ficha.y, ficha.x);
            });
        }, 500);
    }, 1000);
}

// 💥 EVENTO DE GOL (Con Transiciones Dinámicas)
function procesarGol16Man(room) {
    if (!gameState.jugando) return;

    let pelota = room.getDiscProperties(0);
    if (!pelota) return;

    let anguloPelota = Math.atan2(pelota.y, pelota.x);
    let idVictima = null;
    let menorDiff = Infinity;

    // Buscamos de quién es la zona donde entró la bola
    gameState.jugadoresVivos.forEach(id => {
        let anguloJugador = gameState.angulosDefensa[id];
        if (anguloJugador !== undefined) {
            let diff = Math.abs(anguloPelota - anguloJugador);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            if (diff < menorDiff) {
                menorDiff = diff;
                idVictima = id;
            }
        }
    });

    if (!idVictima) return;
    
    let player = room.getPlayer(idVictima);
    if (!player) return;

    gameState.vidas[idVictima]--;

    if (gameState.vidas[idVictima] <= 0) {
        // 💀 JUGADOR ELIMINADO - ACTIVAR TRANSICIÓN DE MAPA
        gameState.jugando = false;
        room.stopGame(); 
        
        // Expulsamos al jugador (si prefieres mandarlo a la tribuna usa room.setPlayerTeam(idVictima, 0))
        room.kickPlayer(idVictima, "¡Tú arco fue destruido! Estás eliminado.", false);
        room.sendAnnouncement(`💀 ¡${player.name} HA CAÍDO!`, null, 0xFF5555, "bold");

        gameState.jugadoresVivos = gameState.jugadoresVivos.filter(id => id !== idVictima);
        let sobrevivientes = gameState.jugadoresVivos.length;

        // 🏆 CORONAR GANADOR
        if (sobrevivientes === 1) {
            let idGanador = gameState.jugadoresVivos[0];
            let ganador = room.getPlayer(idGanador);
            cargarMapa(room, 1); // Carga el mapa "Campeon.hbs"
            room.sendAnnouncement(`🏆 ¡${ganador.name.toUpperCase()} HA GANADO EL BATTLE ROYALE! 🏆`, null, 0xFFD700, "bold");
            return;
        }

        // 🔥 CONTINUAR LA MASACRE EN ARENA MÁS PEQUEÑA
        let nuevasVidas = calcularVidasMaximas(sobrevivientes);
        room.sendAnnouncement(`🌪️ LA ARENA SE REDUCE A ${sobrevivientes} JUGADORES.`, null, 0xFF8800, "bold");
        
        gameState.jugadoresVivos.forEach(id => { gameState.vidas[id] = nuevasVidas; });
        cargarMapa(room, sobrevivientes);

        setTimeout(() => {
            room.startGame();
            gameState.jugando = true;
            room.sendAnnouncement(`❤️ Vidas restauradas a ${nuevasVidas}. ¡PELEEN!`, null, 0x88FF88, "bold");
            
            setTimeout(() => {
                gameState.angulosDefensa = {};
                gameState.jugadoresVivos.forEach(id => {
                    let ficha = room.getPlayerDiscProperties(id);
                    if (ficha) gameState.angulosDefensa[id] = Math.atan2(ficha.y, ficha.x);
                });
            }, 500);
        }, 3000);

    } else {
        // ⚠️ AÚN VIVE (Dejamos que Haxball siga su flujo normal de reinicio de gol)
        room.sendAnnouncement(`⚠️ Arco de ${player.name} perforado. Le quedan ${gameState.vidas[idVictima]} vidas.`, null, 0xFFEE99);
    }

    // 🏃‍♂️ EVENTO: ALGUIEN ABANDONA LA SALA
    function removerJugadorDesconectado(room, player) {
        if (!gameState.jugando) return;
        
        // Verificamos si el que huyó estaba vivo en la arena
        if (gameState.jugadoresVivos.includes(player.id)) {
            gameState.jugadoresVivos = gameState.jugadoresVivos.filter(id => id !== player.id);
            room.sendAnnouncement(`🏃💨 ¡${player.name} ha huido de la arena cobardemente!`, null, 0xFFAA00, "bold");
            
            let sobrevivientes = gameState.jugadoresVivos.length;

            // Verificamos si su huida coronó a un ganador automático
            if (sobrevivientes === 1) {
                let idGanador = gameState.jugadoresVivos[0];
                let ganador = room.getPlayer(idGanador);
                if (ganador) {
                    // Puedes usar tu cargarMapa(room, 1) aquí si quieres que ponga el mapa Campeon
                    room.sendAnnouncement(`🏆 ¡${ganador.name.toUpperCase()} GANA POR ABANDONO! 🏆`, null, 0xFFD700, "bold");
                    gameState.jugando = false;
                    room.stopGame();
                }
            }
        }
    }

}

module.exports = { iniciar16Man, procesarGol16Man };