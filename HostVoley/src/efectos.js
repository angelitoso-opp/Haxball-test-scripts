// ==========================================
// MÓDULO DE ANIMACIONES Y EFECTOS VISUALES
// ==========================================

function activarEfectoDisco(room, playerId) {
    // 1. Guardamos el color original del jugador
    let propsBefore = room.getPlayerDiscProperties(playerId); 
    if (!propsBefore) return; // Si por algún motivo no tiene disco, abortamos para no crashear

    // 2. Iniciamos el parpadeo de colores cada 150ms
    let discoInterval = setInterval(() => {
        // Verificamos que el jugador siga en la sala (por si tira del cable del internet de la rabia xd)
        if (room.getPlayer(playerId)) { 
            room.setPlayerDiscProperties(playerId, { color: Math.floor(Math.random() * 16777215) });
        } else {
            clearInterval(discoInterval); // Apagamos el efecto si se fue
        }
    }, 150);

    // 3. Detenemos la fiesta a los 2.9 segundos (justo antes del saque)
    setTimeout(() => {
        clearInterval(discoInterval);
        if (room.getPlayer(playerId) && propsBefore) {
            // Le devolvemos su color normal comprado
            room.setPlayerDiscProperties(playerId, { color: propsBefore.color }); 
        }
    }, 2900);
}

function explotarConfeti(room) {
    // 1. Buscamos la pelota principal
    let pelota = room.getDiscProperties(0); 
    if (!pelota) return; // Pequeño seguro por si la pelota no existe
    
    // 2. Configuración de la explosión
    let totalParticulas = 10;
    let poderExplosion = 8; 

    // 3. Disparamos cada bolita en círculo
    for (let i = 1; i <= totalParticulas; i++) {
        let angulo = (i / totalParticulas) * (2 * Math.PI); 
        let velocidadX = Math.cos(angulo) * poderExplosion;
        let velocidadY = Math.sin(angulo) * poderExplosion;

        room.setDiscProperties(i, {
            x: pelota.x,
            y: pelota.y,
            xspeed: velocidadX,
            yspeed: velocidadY,
            color: Math.floor(Math.random() * 16777215) 
        });
    }

    // 4. Limpieza: Escondemos las bolitas después de 2 segundos
    setTimeout(() => {
        for (let i = 1; i <= totalParticulas; i++) {
            room.setDiscProperties(i, {
                x: 5000, 
                y: 5000,
                xspeed: 0,
                yspeed: 0
            });
        }
    }, 2000);
}

// Aquí exportaremos todos los futuros efectos que inventes
module.exports = { activarEfectoDisco, explotarConfeti };