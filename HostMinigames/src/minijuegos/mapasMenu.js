const fs = require('fs');
const path = require('path');

// 📖 EL CATÁLOGO DE MAPAS (Palabra clave : Nombre del archivo real)
const catalogoMapas = {
    "banear": "BanearAlguien.hbs",
    "caida": "Caida Wind.hbs",
    "carrera": "Carrera Pekka.hbs",
    "circulo": "Circulo Pelea.hbs",
    "dodgeball": "Dodgeball.hbs",
    "laser": "Esquivar Laser.hbs",
    "lucky": "Luckymap.hbs",
    "mma": "MMA BOXEO.hbs",
    "parkour": "Parkour.hbs",
    "parkour2": "Parkour Dificil.hbs",
    "espadas": "pelea de espadas.hbs",
    "rey": "Rey De la escalera.hbs",
    "salta": "Salta Sobrevive.hbs",
    "sillas": "Sillitas.hbs",
    "lucky2": "Lucky2.hbs",
    "lucky3": "Lucky3.hbs",
    "Parkour3": "ParkourVertical.hbs",
    "Parkour4": "Reversa Salto.hbs",
    "salta2": "Salta Sobrevive2.hbs",
    "kk": "Kong.hbs",
    "carrera2": "Carrera2.hbs",
    "carrera3": "Carrera3.hbs",
    "bajar": "CarreraBaja.hbs",
    "esquivar2": "Esquivar2.hbs"
};

// 📜 MOSTRAR EL MENÚ EN EL CHAT
function enviarMenuMapas(room, playerId) {
    let mensaje = "🗺️ MENÚ DE MINIJUEGOS 🗺️\nEscribe '!mapa [nombre]' para cargar:\n\n";
    
    // Armamos la lista para el chat
    for (let clave in catalogoMapas) {
        mensaje += `🔸 ${clave} -> ${catalogoMapas[clave].replace('.hbs', '')}\n`;
    }
    
    mensaje += "\nEjemplo: !mapa mma";
    room.sendAnnouncement(mensaje, playerId, 0x88FFFF, "bold");
}

// 🚀 CARGAR EL MAPA SELECCIONADO
function cargarMapaManual(room, comandoPeticion, playerId) {
    let claveMapa = comandoPeticion.trim().toLowerCase();

    // Verificamos si la palabra existe en nuestro catálogo
    if (!catalogoMapas[claveMapa]) {
        room.sendAnnouncement("⚠️ Mapa no encontrado. Escribe '!mapas' para ver la lista.", playerId, 0xFFAA00);
        return;
    }

    let nombreArchivo = catalogoMapas[claveMapa];

    try {
        let rutaMapa = path.join(__dirname, '../../mapas', nombreArchivo);

        if (!fs.existsSync(rutaMapa)) {
            room.sendAnnouncement("🚨 No se encontró el archivo del mapa en disco.", playerId, 0xFF0000);
            console.log("❌ Archivo no encontrado:", rutaMapa);
            return;
        }
        
        let contenidoMapa = fs.readFileSync(rutaMapa, 'utf8');
        room.stopGame(); // Frenamos por si se estaba jugando
        room.setCustomStadium(contenidoMapa);
        
        room.sendAnnouncement(`🌍 ¡El Admin ha cargado el mapa: ${nombreArchivo.replace('.hbs', '').toUpperCase()}!`, null, 0x88FF88, "bold");
        
    } catch (err) {
        console.log("❌ Error cargando el mapa manual:", err);
        room.sendAnnouncement("🚨 Hubo un error técnico al leer el archivo del mapa.", playerId, 0xFF0000);
    }
}

module.exports = { enviarMenuMapas, cargarMapaManual };