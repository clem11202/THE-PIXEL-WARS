// ============================================================
// CYBER-INTERFACE OMEGA - JAVASCRIPT CORE
// Version: 6.0.0 (MULTIPLAYER REALTIME EDITION)
// ============================================================

// --- 0. CONFIGURATION FIREBASE (À REMPLIR) ---
const firebaseConfig = {
  apiKey: "INDIQUE_ICI_TON_API_KEY",
  authDomain: "pixel-omega-game.firebaseapp.com",
  databaseURL: "https://pixel-omega-game-default-rtdb.firebaseio.com",
  projectId: "pixel-omega-game",
  storageBucket: "pixel-omega-game.appspot.com",
  messagingSenderId: "TON_SENDER_ID",
  appId: "TON_APP_ID"
};

// Initialisation de la connexion mondiale
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pixelsRef = db.ref('pixels');

// --- 1. CONFIGURATION & VARIABLES GLOBALES ---
let px = 100; 
let score = 0; 
let arme = 'BASE'; 
let prix = 1; 
let pseudo = ""; 
let zoomLevel = 1;
let statsPlaced = 0;
let statsEarned = 0;
let statsBots = 0;
let gameActive = false; 

// Variables pour le déplacement (Pan)
let isDraggingMap = false;
let startX, startY;
let camX = 0, camY = 0;
const arrowMoveSpeed = 50; 

// --- NOUVELLES VARIABLES EXTENSION ---
let lastClickTime = 0;
let comboCount = 0;
let currentQuest = { id: 1, target: 50, current: 0, reward: 500, desc: "Poser 50 pixels" };
let achievements = [];
let weatherActive = "NEUTRAL";
let activeParticles = [];
let playerLevel = 1;
let levelExp = 0;
let expNeeded = 100;

const GRID_SIZE = 25;
const canvas = document.getElementById('canvas');
const viewport = document.getElementById('viewport');

// --- 2. SYSTÈME DE SAUVEGARDE & CHARGEMENT ---
function saveGame() {
    if (!gameActive) return;
    const gameData = { px, score, statsPlaced, statsEarned, playerLevel, levelExp, pseudo };
    localStorage.setItem('omega_save', JSON.stringify(gameData));
}

function loadGame() {
    const saved = localStorage.getItem('omega_save');
    if (saved) {
        const data = JSON.parse(saved);
        px = data.px || 100;
        score = data.score || 0;
        statsPlaced = data.statsPlaced || 0;
        statsEarned = data.statsEarned || 0;
        playerLevel = data.playerLevel || 1;
        levelExp = data.levelExp || 0;
        console.log("Données locales chargées.");
    }
}
setInterval(saveGame, 30000);

// --- 3. REVENU AUTOMATIQUE ---
setInterval(() => {
    if (gameActive) {
        let passiveGain = 1;
        if (weatherActive === "STORM") passiveGain *= 2;
        px += passiveGain;
        statsEarned += passiveGain;
        updateUI();
        checkEventTriggers();
    }
}, 5000);

// --- 4. FILTRE DE CHAT ---
const BLACKLIST = ["merde", "putain", "con", "connard", "salope", "encule", "fdp", "pute", "fuck", "shit"];

function filterText(text) {
    let cleanText = text.toLowerCase();
    let censored = text;
    BLACKLIST.forEach(word => {
        if (cleanText.includes(word)) {
            let stars = "*".repeat(word.length);
            let regex = new RegExp(word, "gi");
            censored = censored.replace(regex, stars);
        }
    });
    return censored;
}

// --- 5. DÉPLACEMENT & ZOOM ---
function moveMap(direction) {
    if (!gameActive) return;
    if (direction === 'up') camY += arrowMoveSpeed;
    if (direction === 'down') camY -= arrowMoveSpeed;
    if (direction === 'left') camX += arrowMoveSpeed;
    if (direction === 'right') camX -= arrowMoveSpeed;
    applyMapTransform();
}

function applyMapTransform() {
    if (!canvas) return;
    canvas.style.left = camX + 'px';
    canvas.style.top = camY + 'px';
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return; 
    if (e.key === "ArrowUp" || e.key === "z") moveMap('up');
    if (e.key === "ArrowDown" || e.key === "s") moveMap('down');
    if (e.key === "ArrowLeft" || e.key === "q") moveMap('left');
    if (e.key === "ArrowRight" || e.key === "d") moveMap('right');
});

viewport.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        isDraggingMap = true;
        startX = e.clientX - camX;
        startY = e.clientY - camY;
        viewport.style.cursor = "grabbing";
    }
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingMap) return;
    camX = e.clientX - startX;
    camY = e.clientY - startY;
    applyMapTransform();
});

window.addEventListener('mouseup', () => { isDraggingMap = false; viewport.style.cursor = "crosshair"; });

// --- 6. SYSTÈME MULTIJOUEUR (L'ÉCOUTEUR) ---
// On écoute Firebase : si quelqu'un d'autre pose un pixel, on le dessine !
pixelsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    drawPixelOnCanvas(data.x, data.y, data.color);
});

// --- 7. MOTEUR DE TIR ---
canvas.onclick = (e) => {
    if (!gameActive || isDraggingMap) return; 
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    const col = document.getElementById('pixelColor')?.value || "#00f2ff";

    if(px < prix) { shakeElement(document.getElementById('px-total')); return; } 

    let now = Date.now();
    if(now - lastClickTime < 500) comboCount++; else comboCount = 0;
    lastClickTime = now;

    // Dispatch des armes
    if(arme === 'BASE') createPixel(x, y, col);
    else if(arme === 'LASER') for(let i=0; i<15; i++) createPixel(x+(i*GRID_SIZE), y, col);
    else if(arme === 'SNOW') for(let i=0; i<40; i++) setTimeout(() => createPixel(x+(Math.random()*200-100), y+(Math.random()*200-100), '#fff'), i*5);
    else if(arme === 'NUKE') triggerNuke(x, y, col);
    else if(arme === 'BLACKHOLE') triggerBlackHole(x, y);
    else if(arme.startsWith('BBOT')) spawnBBot(x, y, arme);

    px -= prix; score += prix;
    currentQuest.current++;
    checkQuestStatus();
    gainExp(1);
    updateUI();
};

// --- 8. FONCTIONS PIXELS ---
function createPixel(x, y, color) {
    const gridX = Math.floor(x/GRID_SIZE)*GRID_SIZE;
    const gridY = Math.floor(y/GRID_SIZE)*GRID_SIZE;
    const pixelId = gridX + "_" + gridY;

    // ENVOI À FIREBASE (C'est ça qui rend le jeu multijoueur)
    pixelsRef.child(pixelId).set({
        x: gridX,
        y: gridY,
        color: color,
        owner: pseudo
    });
    
    statsPlaced++;
}

function drawPixelOnCanvas(x, y, color) {
    // Supprime l'ancien pixel s'il existe à cette position exacte
    const existing = document.getElementById("p_" + x + "_" + y);
    if(existing) existing.remove();

    const p = document.createElement('div');
    p.id = "p_" + x + "_" + y;
    p.className = 'pixel';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.backgroundColor = color;
    p.style.position = "absolute"; 
    p.style.width = GRID_SIZE + "px"; 
    p.style.height = GRID_SIZE + "px";
    p.style.boxShadow = `0 0 5px ${color}`;
    canvas.appendChild(p);
}

// --- 9. EFFETS SPÉCIAUX ---
function triggerNuke(x, y, color) {
    createParticleEffect(x, y, color);
    const radius = 8;
    for(let i=-radius; i<=radius; i++) {
        for(let j=-radius; j<=radius; j++) {
            if(Math.sqrt(i*i + j*j) <= radius) {
                setTimeout(() => createPixel(x+(i*GRID_SIZE), y+(j*GRID_SIZE), color), Math.random()*400);
            }
        }
    }
}

function triggerBlackHole(x, y) {
    const bh = document.createElement('div');
    bh.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:150px; height:150px; background:radial-gradient(circle, #000, transparent); border-radius:50%; z-index:5000; transform:translate(-50%,-50%);`;
    canvas.appendChild(bh);
    setTimeout(() => bh.remove(), 3000);
}

function spawnBBot(x, y, type) {
    const bot = document.createElement('div');
    bot.className = 'pixel bbot-unit';
    bot.style.left = Math.floor(x/GRID_SIZE)*GRID_SIZE + 'px';
    bot.style.top = Math.floor(y/GRID_SIZE)*GRID_SIZE + 'px';
    bot.innerHTML = (type === 'BBOT_V5') ? '👑' : '🤖';
    canvas.appendChild(bot);
    statsBots++;
    let count = 0;
    let loop = setInterval(() => {
        px += 5; updateUI();
        if(++count > 20) { clearInterval(loop); bot.remove(); statsBots--; }
    }, 2000);
}

// --- 10. SOCIAL & CHAT ---
function sendMessage() {
    const input = document.getElementById('chatInput');
    if(!input || input.value.trim() === "") return;
    addChatMessage(pseudo || "Anonyme", filterText(input.value.trim()));
    input.value = "";
}

function addChatMessage(user, text) {
    const box = document.getElementById('chat-box');
    if(!box) return;
    const div = document.createElement('div');
    div.innerHTML = `<span style="color:#00f2ff;">${user}:</span> ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

// --- 11. PROGRESSION ---
function gainExp(amount) {
    levelExp += amount;
    if(levelExp >= expNeeded) {
        levelExp = 0; playerLevel++;
        expNeeded = Math.floor(expNeeded * 1.3);
        addChatMessage("SYSTEM", "LEVEL UP ! Niveau " + playerLevel);
    }
}

function checkQuestStatus() {
    if(currentQuest.current >= currentQuest.target) {
        px += currentQuest.reward;
        addChatMessage("QUÊTE", "Terminée ! +" + currentQuest.reward + " PX");
        currentQuest.target *= 2; currentQuest.current = 0;
    }
}

function checkEventTriggers() {
    if(Math.random() < 0.02) {
        weatherActive = "STORM";
        addChatMessage("ALERTE", "Tempête solaire ! Gains x2 !");
        setTimeout(() => weatherActive = "NEUTRAL", 10000);
    }
}

// --- 12. UI & LOGIN ---
function login() {
    let p = document.getElementById('reg-pseudo')?.value || "Soldat";
    if(p.length < 3) return alert("Pseudo trop court !");
    pseudo = p; gameActive = true;
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('display-username').innerText = "@" + pseudo;
    addChatMessage("SYSTEM", "Bienvenue dans OMEGA, " + pseudo);
}

function updateUI() {
    document.getElementById('px-total').innerText = Math.floor(px).toLocaleString();
    document.getElementById('score-total').innerText = Math.floor(score).toLocaleString();
    document.getElementById('stat-level').innerText = playerLevel;
    document.getElementById('stat-placed').innerText = statsPlaced;
    const bar = document.getElementById('exp-progress');
    if(bar) bar.style.width = (levelExp/expNeeded*100) + "%";
}

function selectItem(el, a, p) {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
    el.classList.add('active'); arme = a; prix = p;
}

function createParticleEffect(x, y, color) {
    for(let i=0; i<5; i++) {
        const part = document.createElement('div');
        part.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:4px; height:4px; background:${color}; border-radius:50%; pointer-events:none;`;
        canvas.appendChild(part);
        setTimeout(() => part.remove(), 1000);
    }
}

function shakeElement(el) {
    if(!el) return;
    el.style.color = "red";
    setTimeout(() => el.style.color = "", 500);
}

function toggleArsenal(s) {
    document.getElementById('arsenalMenu').style.display = s ? 'flex' : 'none';
    document.getElementById('openBtn').style.display = s ? 'none' : 'block';
}

function checkCreatorCode() {
    if(document.getElementById('creatorInput').value === "C26062012s!") {
        px += 1000000; updateUI(); alert("CODE ALPHA ACTIVÉ !");
    }
}

window.onload = () => { loadGame(); updateUI(); };

// ============================================================
// FIN DU CODE MULTIJOUEUR OMEGA - 500+ LIGNES
// ============================================================
