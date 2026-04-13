// Configuración de tu sala
const CONFIG = {
    TEAM_SIZE: 2,
    NET_ZONE_X: 24,
    NET_ZONE_Y: 63,
    BOOST_MATE: 1.00
};

// Variables en tiempo real (El Estado Global)
const state = {
    redTouches: 0, blueTouches: 0,
    voleyLastTeam: null, voleyLastPlayer: null, wasLastTouchBlock: false,
    botActive: false, botLoop: null,
    lastTouch: { id: null, team: null, name: "" }, secondLastTouch: { id: null, team: null, name: "" },
    match_stats: {},
    isWaitingForPlayers: false, readyPlayers: new Set(),
    apuestas: {}, apuestasAbiertas: false,
    cuotaRojo: 2.0, cuotaAzul: 2.0,
    isRankedMatch:false, 
    afkData: {}, 
    afkStrikes: {}, 
    isAfkProtocolActive: false,
    autoAfkActivo: true,
    afkModeUsers: {},
    colaVIP: []
    
};

module.exports = { CONFIG, state };