module.exports = { iniciar16Man, procesarGol16Man, removerJugadorDesconectado };

// Cuando le den al botón de Start en la sala
room.onGameStart = function() {
    iniciar16Man(room);
};

// Cuando la pelota toque la red
room.onTeamGoal = function(team) {
    procesarGol16Man(room);
    
    // (Opcional) Pequeño delay y reinicias las posiciones para que sigan jugando
    setTimeout(() => { room.startGame(); }, 3000); 
};
room.onPlayerChat = function(player, message) {

    if (message === "!start") {

    if (player.admin) iniciar16Man(room);
    return false;

    }
}
room.onPlayerLeave = function(player) {
    removerJugadorDesconectado(room, player);
};