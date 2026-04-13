const { db, saveDB } = require('./database');
const { state } = require('./state');

// 🧮 NUEVO: MOTOR MATEMÁTICO DE CUOTAS
// 🧮 MOTOR MATEMÁTICO DE CUOTAS Y PROBABILIDADES
function calcularCuotas(room) {
    let redPlayers = room.getPlayerList().filter(p => p.team === 1);
    let bluePlayers = room.getPlayerList().filter(p => p.team === 2);

    let probRojoFinal = 50;
    let probAzulFinal = 50;

    // Si la cancha está vacía por algún error, cuotas base
    if (redPlayers.length === 0 || bluePlayers.length === 0) {
        state.cuotaRojo = 2.0; state.cuotaAzul = 2.0; 
    } else {
        // Calculamos el ELO promedio de cada equipo
        let eloRed = redPlayers.reduce((sum, p) => sum + (db.players[p.name]?.elo || 1000), 0) / redPlayers.length;
        let eloBlue = bluePlayers.reduce((sum, p) => sum + (db.players[p.name]?.elo || 1000), 0) / bluePlayers.length;

        // Fórmula matemática oficial de ELO para sacar % de victoria
        let probRed = 1 / (1 + Math.pow(10, (eloBlue - eloRed) / 400));
        let probBlue = 1 - probRed;

        // Guardamos los porcentajes visuales (ej. 45.5%)
        probRojoFinal = (probRed * 100).toFixed(1);
        probAzulFinal = (probBlue * 100).toFixed(1);

        // Cuota = 1 dividido por la probabilidad (con 5% de ganancia del casino)
        let cuotaR = (1 / probRed) * 0.95;
        let cuotaB = (1 / probBlue) * 0.95;

        // Limitamos las cuotas
        state.cuotaRojo = Math.max(1.15, Math.min(4.50, cuotaR)).toFixed(2);
        state.cuotaAzul = Math.max(1.15, Math.min(4.50, cuotaB)).toFixed(2);
    }

    // 📊 RECUADRO DE ESTADÍSTICAS Y APUESTAS
    var boxApuestas = 
    "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n" +
    "┃ 📊 ANÁLISIS DE LA CASA DE APUESTAS 📊\n" +
    "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n" +
    "┃ 🔴 ROJO:  Ganar: " + probRojoFinal + "%  |  Paga: x" + state.cuotaRojo + "\n" +
    "┃ 🔵 AZUL:  Ganar: " + probAzulFinal + "%  |  Paga: x" + state.cuotaAzul + "\n" +
    "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";

    room.sendAnnouncement(boxApuestas, null, 0xFFDD00, "bold");
}

function apostar(player, args, room) {
    if (!state.apuestasAbiertas) return room.sendAnnouncement("⛔ Apuestas cerradas.", player.id, 0xFF8888);
    if (state.apuestas[player.name]) return room.sendAnnouncement("⚠️ Ya apostaste.", player.id, 0xFF8888);
    
    let equipo = args[1] ? args[1].toLowerCase() : ""; let monto = parseInt(args[2]);
    if ((equipo !== "rojo" && equipo !== "azul") || isNaN(monto) || monto <= 0) return room.sendAnnouncement("⚠️ Uso: !apostar rojo 50", player.id, 0xFFEE99);
    
    let dbUser = db.players[player.name];
    if (dbUser.coins < monto) return room.sendAnnouncement(`💸 Eres pobre.`, player.id, 0xFF8888);

    let teamNum = (equipo === "rojo") ? 1 : 2;
    if (player.team !== 0 && player.team !== teamNum) return room.sendAnnouncement("❌ Juega limpio, solo apuesta por tu equipo.", player.id, 0xFF0000, "bold");

    dbUser.coins -= monto; saveDB();
    state.apuestas[player.name] = { team: teamNum, amount: monto };
    
    // Anuncio de confirmación
    let cuotaFijada = teamNum === 1 ? state.cuotaRojo : state.cuotaAzul;
    room.sendAnnouncement(`🎰 ${player.name} apostó ${monto} Coins al ${equipo.toUpperCase()} (Cuota: x${cuotaFijada}).`, null, 0xFFD700, "bold");
}

function checkCierreApuestas(room) {
    var sc = room.getScores();
    if (state.apuestasAbiertas && (sc.red >= 1 || sc.blue >= 1)) {
        state.apuestasAbiertas = false;
        room.sendAnnouncement("⛔ ¡ÚLTIMO PUNTO! Apuestas cerradas.", null, 0xFF8888, "bold");
    }
}

// 💸 NUEVO: PAGO DINÁMICO
function pagarGanadores(room, winningTeam) {
    let ganadores = [];
    let multiplicador = winningTeam === 1 ? state.cuotaRojo : state.cuotaAzul;

    for (let user in state.apuestas) {
        if (state.apuestas[user].team === winningTeam && db.players[user]) {
            // Calculamos la ganancia neta redondeada hacia abajo para no dar céntimos
            let gananciaNeta = Math.floor(state.apuestas[user].amount * multiplicador);
            db.players[user].coins += gananciaNeta;
            ganadores.push(`${user} (+${gananciaNeta}💰)`);
        }
    }
    if (ganadores.length > 0) room.sendAnnouncement(`🎰 GANADORES: ${ganadores.join(", ")}`, null, 0xFFD700, "bold");
    saveDB();
}

function devolverDinero(room) {
    if (Object.keys(state.apuestas).length > 0) {
        for (let user in state.apuestas) { if (db.players[user]) db.players[user].coins += state.apuestas[user].amount; }
        saveDB(); room.sendAnnouncement("🔄 Partido detenido. Coins devueltos.", null, 0x88FFFF, "bold");
    }
}

// Asegúrate de exportar la nueva función
module.exports = { apostar, checkCierreApuestas, pagarGanadores, devolverDinero, calcularCuotas };