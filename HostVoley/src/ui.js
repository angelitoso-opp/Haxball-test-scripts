// ==========================================
// MENÚS Y RECUADROS
// ==========================================
function sendHelpBox(room, player) {
    // 📖 CAJA NORMAL (Para todos)
    var userHelp = 
    "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n" +
    "┃ 📖 MANUAL DEL JUGADOR 📖\n" +
    "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n" +
    "┃ 🎮 Juego: go (listo), -1 (expulsar inactivo), !afk (modo afk)\n" +
    "┃ 👤 Perfil: !me / !perfil (estadísticas), !ids (ver jugadores)\n" +
    "┃ 💸 Economía: !apostar [rojo/azul] [monto], !tienda\n" +
    "┃ 🛒 Inventario: !vip (saltar cola), !usar gigante\n" +
    "┃ 🎮 REGLAS: Máx 3 toques. El bloqueo (saltar) no cuenta.\n" +
    "┃ 💰 RANKED: Gana +25 ELO y +10 Coins. Perder resta 15 ELO.\n"+
    "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";

    room.sendAnnouncement(userHelp, player.id, 0xebfbf6, "bold");

    // 👑 CAJA DE ADMIN (Solo si tiene permisos)
    if (player.admin) {
        var adminHelp = 
        "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n" +
        "┃ 👑 PANEL DE ADMINISTRADOR 👑\n" +
        "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n" +
        "┃ ⚙️ Sala: !modo [n], !bot (on/off), !autoafk (on/off)\n" +
        "┃ 🔨 Mod: !kick [id] [razón], !ban [id] [razón], !clearbans\n" +
        "┃ 💰 Eco: !darplata [id] [monto], !reseteco (borrar todo)\n" +
        "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";

        // Usamos un pequeñísimo retraso de 100ms para que Haxball no 
        // superponga los mensajes ni marque error por enviar mucho texto de golpe.
        setTimeout(() => {
            room.sendAnnouncement(adminHelp, player.id, 0xFFD700, "bold");
        }, 100);
    }
}

function sendWelcomeBox(room, player) {
    var box = 
    "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n" +
    "┃ 🏐 ¡Bienvenido a la Liga Profesional de Vóley, " + player.name + "!\n" +
    "┃ 💡 Escribe !help o !ayuda para ver las reglas y comandos.\n" +
    "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";
    room.sendAnnouncement(box, player.id, 0x88FFCC, "bold");
}

function sendTiendaBox(room, playerId) {
    var boxTienda = 
    "┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n" +
    "┃ 🛒 MERCADO NEGRO DEL VÓLEY 🛒\n" +
    "┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n" +
    "┃ 🏷️ !tienda tag [texto] - 50 Coins (Cambia tu Tag del chat)\n" +
    "┃ 🎨 !tienda color [hex] - 50 Coins (Ej: !comprar color FF0000)\n" +
    "┃ ✨ !tienda efecto disco - 150 Coins (Luces locas al meter gol)\n" +
    "┃ 🎟️ !tienda vip - 200 Coins (Pase para saltar la cola a jugar)\n" +
    "┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛";
    room.sendAnnouncement(boxTienda, playerId, 0xebfbf6, "bold");
}

// ==========================================
// ANUNCIOS AUTOMÁTICOS ROTATIVOS (NUEVO)
// ==========================================
const MENSAJES_AUTOMATICOS = [
    "🎮 ¿No sabes jugar? Escribe !help para ver las reglas y comandos de la sala.",
    "🎰 ¡Multiplica tu dinero! Usa '!apostar rojo' o '!apostar azul' al inicio de cada partido.",
    "🛒 ¿Te sobran las monedas? Usa !tienda para comprar tags personalizados o pociones gigantes.",
    "🏆 Gana partidos para sumar ELO y pasar de Canterano a Dios del Vóley. Revisa tu !perfil",
    "💬 Recuerda que tienes los comandos !tienda, !me para ver todo lo que ofrece la sala"
];

let indiceAnuncio = 0;

function iniciarAnuncios(room) {
    // 90000 milisegundos = 1.5 minutos
    setInterval(() => {
        if (room.getPlayerList().length > 0) {
            room.sendAnnouncement("📢 [INFO]: " + MENSAJES_AUTOMATICOS[indiceAnuncio], null, 0x88FFFF, "bold");
            indiceAnuncio = (indiceAnuncio + 1) % MENSAJES_AUTOMATICOS.length;
        }
    }, 90000); 
}

// Asegúrate de exportar la nueva función iniciarAnuncios
module.exports = { sendHelpBox, sendWelcomeBox, sendTiendaBox, iniciarAnuncios, sendTiendaBox };