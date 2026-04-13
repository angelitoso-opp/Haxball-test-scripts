const uniforms = [ 
// PREMIER LEAGUE
    { kit: 60, textColor: 0x12255D, colors: [0xFFFFFF, 0xFFFFFF, 0xFFFFFF], name: "uniforme del Tottenham🦩" },
    { kit: 0, textColor: 0xFFFFFF, colors: [0xFFFFFF, 0xEB0000, 0xFFFFFF], name: "uniforme del Arsenal🏟" },
    { kit: 60, textColor: 0xFCFCFC, colors: [0xB00000, 0x990000, 0x820000], name: "uniforme del liverpool🔴" },
    { kit: 0, textColor: 0x990202, colors: [0x000000, 0xFAF7F7, 0x000000], name: "uniforme del New Castle🏰" },
    { kit: 25, textColor: 0x1BB1E7, colors: [0x5E1E2C, 0x7A263A, 0x5E1E2C], name: "uniforme del Westham🛠" },
    { kit: 0, textColor: 0xFFFFFF, colors: [0x0065C1, 0xF23141, 0x0065C1], name: "uniforme del Crystal Palace🦅" },
    { kit: 45, textColor: 0xFFFFFF, colors: [0xB4CFED, 0xA12750, 0xA12750], name: "uniforme del Aston Villa🦹‍" },
    { kit: 60, textColor: 0x000000, colors: [0xFAC336, 0xFAC336, 0xFAC336], name: "uniforme de los Wolves🐺" },
    { kit: 0, textColor: 0x171717, colors: [0x005BB5, 0xFFFFFF, 0x005BB5], name: "uniforme del brighton🕊️" },
    { kit: 90, textColor: 0xFFFFFF, colors: [0x002CA3, 0x0033BF, 0x0033BF], name: "uniforme del Chelsea🥶" },
    { kit: 0, textColor: 0xFFFFFF, colors: [0xE6001D, 0x080808, 0xE6001D], name: "uniforme del bournemouth🍒" },
    { kit: 0, textColor: 0xFFFFFF, colors: [0xB0DFFF, 0x91CFFF, 0xB0DFFF], name: "uniforme del Manchester City🦁" },
    { kit: 0, textColor: 0x000000, colors: [0x000000, 0xFFFFFF, 0x000000], name: "uniforme del Fulham💪" },
    { kit: 0, textColor: 0xFFFFFF, colors: [0xE9121A, 0xDE0E10, 0xE9121A], name: "uniforme del Manchester United😈" },

// LA LIGA
    { kit: 0, textColor: 0x01387b, colors: [0xDBBF03, 0xE5CD22, 0xDBBF03], name: "uniforme de Las Palmas🐤" },
    { kit: 0, textColor: 0x0D0D0D, colors: [0xF7F7F7, 0xFAFAFA, 0xFFFFFF], name: "uniforme del Real Madrid🏆" },
    { kit: 0, textColor: 0xFFD700, colors: [0x023094, 0xF13050], name: "uniforme del Barcelona🐹" },
    { kit: 0, textColor: 0x0E0E99, colors: [0xF5121E, 0xFFFFFF, 0xF5121E], name: "uniforme del Atletico de madrid🐱‍👤" },
    { kit: 0, textColor: 0x000000, colors: [0x022DA6, 0xFFFFFF, 0x022DA6], name: "uniforme del Real sociedad👑" },
    { kit: 0, textColor: 0x000000, colors: [0x19AA67, 0xFEFCFF, 0x18BA81], name: "uniforme del Real Betis🐼" }
];

function getRandomUniform() {
    return uniforms[Math.floor(Math.random() * uniforms.length)];
}

function aplicarUniformesAleatorios(room) {
    let redUniform = getRandomUniform();
    let blueUniform = getRandomUniform();

    // Evitamos que ambos equipos tengan el mismo uniforme
    while (redUniform.name === blueUniform.name) {
        blueUniform = getRandomUniform();
    }

    // Aplicar los colores a la sala
    room.setTeamColors(1, redUniform.kit, redUniform.textColor, redUniform.colors);
    room.setTeamColors(2, blueUniform.kit, blueUniform.textColor, blueUniform.colors);

    // Anunciar en el chat
    room.sendAnnouncement(`🔴 ROJO usará el ${redUniform.name}`, null, 0xFF7777, "bold");
    room.sendAnnouncement(`🔵 AZUL usará el ${blueUniform.name}`, null, 0x7777FF, "bold");
}

module.exports = { aplicarUniformesAleatorios };