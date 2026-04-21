// Configuración de tu sala
const CONFIG = {
    TEAM_SIZE: 2, // Empezará en 2v2 por defecto
    NET_ZONE_X: 24,
    NET_ZONE_Y: 63,
    BOOST_MATE: 1.00
};

// Variables en tiempo real (El Estado Global)
const state = {
    redTouches: 0, 
    blueTouches: 0,
    scoreLimit: 5, // Límite de puntos por defecto (lo gestionaremos manualmente)    voleyLastTeam: null, 
    juegoTerminadoPorVictoria: false, // 🛡️ Escudo para que las apuestas no se bugueen
    voleyLastPlayer: null, 
    wasLastTouchBlock: false,
    botActive: true, // 🤖 ¡Se prende solo al abrir la sala!
    botLoop: null,
    lastTouch: { id: null, team: null, name: "" }, 
    secondLastTouch: { id: null, team: null, name: "" },
    match_stats: {},
    isWaitingForPlayers: false, 
    readyPlayers: new Set(),
    apuestas: {}, 
    apuestasAbiertas: false,
    cuotaRojo: 2.0, 
    cuotaAzul: 2.0,
    isRankedMatch:false, 
    afkData: {}, 
    afkStrikes: {}, 
    isAfkProtocolActive: false,
    autoAfkActivo: true,
    afkModeUsers: {},
    isPicking: false,
    capitanes: { 1: null, 2: null },
    turnoPick: 0,
    pickTimer: null, // 1 (Rojo) o 2 (Azul)
    colaVIP: []
    
};

module.exports = { CONFIG, state };