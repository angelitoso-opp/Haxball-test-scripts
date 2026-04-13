const fs = require('fs');
const DB_FILE = './database.json';

const db = { players: {} }; // Base de datos viva

const RANGOS = [
    { elo: 3000, name: "Dios del Vóley", emoji: "👑", color: 0xFFD700 }, 
    { elo: 2000, name: "Titán", emoji: "💎", color: 0x00FFFF }, 
    { elo: 1500, name: "Rematador Pro", emoji: "🔥", color: 0xFF4500 }, 
    { elo: 1200, name: "Armador", emoji: "🧠", color: 0x32CD32 }, 
    { elo: 1050, name: "Líbero", emoji: "🛡️", color: 0x1E90FF }, 
    { elo: 0,    name: "Canterano", emoji: "👶", color: 0xDDDDDD }  
];

function loadDB() {
    try {
        if (fs.existsSync(DB_FILE)) {
            db.players = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            console.log("✅ Base de datos cargada.");
        } else saveDB();
    } catch (e) { console.log("❌ Error DB:", e); }
}

function saveDB() {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db.players, null, 2)); } catch (e) {}
}

function getRank(elo) { return RANGOS.find(r => elo >= r.elo); }

function initPlayerDB(name) { 
    if (!db.players[name]) {
        db.players[name] = { elo: 1000, coins: 0, wins: 0, losses: 0, tag: "🏐", items: {} };
        saveDB();
    }
}

module.exports = { db, loadDB, saveDB, getRank, initPlayerDB };