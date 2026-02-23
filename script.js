// ============================================================
// CYBER-INTERFACE OMEGA - JAVASCRIPT CORE (FULL MULTIPLAYER)
// ============================================================

// --- 1. INITIALISATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCpEPUL6u1DHcU8w10UxoN6NthYX_VKSSM",
  authDomain: "pixel-omega-game.firebaseapp.com",
  databaseURL: "https://pixel-omega-game-default-rtdb.firebaseio.com",
  projectId: "pixel-omega-game",
  storageBucket: "pixel-omega-game.firebasestorage.app",
  messagingSenderId: "259832658085",
  appId: "1:259832658085:web:e8d3ab59f3bcc06caf754c",
  measurementId: "G-YGEG188XHL"
};

// Lancement de Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const pixelsRef = db.ref('pixels');

// --- 2. CONFIGURATION & VARIABLES GLOBALES ---
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

// Navigation
let isDraggingMap = false;
let startX, startY;
let camX = 0, camY = 0;
const arrowMoveSpeed = 50; 

// Extensions
let lastClickTime = 0;
let comboCount = 0;
let currentQuest = { id: 1, target: 50, current: 0, reward: 500, desc: "Poser 50 pixels" };
let weatherActive = "NEUTRAL";
let activeParticles = [];

const canvas = document.getElementById('canvas');
const viewport = document.getElementById('viewport');

// --- 3. ÉCOUTEUR MULTIJOUEUR (L'âme du jeu) ---
// Quand quelqu'un (toi ou un autre) pose un pixel, il apparaît ici
pixelsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    drawPixelLocally(data.x, data.y, data.color);
});

function drawPixelLocally(x, y, color) {
    const p = document.createElement('div');
    p.className = 'pixel';
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    p.style.backgroundColor = color;
    p.style.position = "absolute"; 
    p.style.width = "25px"; 
    p.style.height = "25px";
    p.style.boxShadow = `0 0 5px ${color}`;
    canvas.appendChild(p);
}

// --- 4. REVENU AUTOMATIQUE & EVENT ---
setInterval(() => {
    if (gameActive) {
        px += 1;
        statsEarned += 1;
        updateUI();
        checkEventTriggers();
    }
}, 5000);

// --- 5. FILTRE CHAT ---
const BLACKLIST = ["merde", "putain", "con", "connard", "salope", "encule", "fdp", "pute", "bite", "nique"];
function filterText(text) {
    let clean = text.toLowerCase();
    let censored = text;
    BLACKLIST.forEach(word => {
        if (clean.includes(word)) {
            censored = censored.replace(new RegExp(word, 'gi'), "*".repeat(word.length));
        }
    });
    return censored;
}

// --- 6. DÉPLACEMENT & ZOOM ---
function moveMap(direction) {
    if (!gameActive) return;
    if (direction === 'up') camY += arrowMoveSpeed;
    if (direction === 'down') camY -= arrowMoveSpeed;
    if (direction === 'left') camX += arrowMoveSpeed;
    if (direction === 'right') camX -= arrowMoveSpeed;
    applyMapTransform();
}

function resetView() {
    camX = 0; camY = 0; zoomLevel = 1;
    canvas.style.transform = `scale(${zoomLevel})`;
    applyMapTransform();
}

function applyMapTransform() {
    canvas.style.left = camX + 'px';
    canvas.style.top = camY + 'px';
}

// Drag souris
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
window.addEventListener('mouseup', () => {
    isDraggingMap = false;
    viewport.style.cursor = "crosshair";
});

// --- 7. GESTION DES B-BOTS ---
function spawnBBot(x, y, type) {
    const bot = document.createElement('div');
    bot.className = 'pixel bbot-unit';
    const gridX = Math.floor(x/25)*25;
    const gridY = Math.floor(y/25)*25;
    bot.style.left = gridX + 'px'; bot.style.top = gridY + 'px';
    bot.style.fontSize = "30px"; bot.style.position = "absolute"; bot.style.zIndex = "2000";
    
    let power = 1; let speed = 3000;
    if(type === 'BBOT_V1') { bot.innerHTML = '🤖'; power = 1; speed = 3000; }
    if(type === 'BBOT_V2') { bot.innerHTML = '⚙️'; power = 5; speed = 2500; }
    if(type === 'BBOT_V5') { bot.innerHTML = '👑'; power = 200; speed = 1000; }

    canvas.appendChild(bot);
    statsBots++;

    let life = 50; 
    let income = setInterval(() => {
        if(!gameActive) { clearInterval(income); bot.remove(); return; }
        px += power; statsEarned += power;
        updateUI();
        createParticleEffect(parseInt(bot.style.left), parseInt(bot.style.top), '#00f2ff');
        if(--life <= 0) { clearInterval(income); bot.remove(); statsBots--; updateUI(); }
    }, speed);
}

// --- 8. MOTEUR DE TIR (CLICK) ---
canvas.onclick = (e) => {
    if (!gameActive || isDraggingMap) return; 
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    const col = document.getElementById('pixelColor')?.value || "#00f2ff";

    if(px < prix) { shakeElement(document.getElementById('px-total')); return; } 

    if(arme === 'BASE') createPixel(x, y, col);
    else if(arme === 'LASER') for(let i=0; i<15; i++) createPixel(x+(i*25), y, col);
    else if(arme === 'SNOW') for(let i=0; i<80; i++) setTimeout(() => createPixel(x+(Math.random()*400-200), y+(Math.random()*400-200), '#fff'), i*2);
    else if(arme === 'ZOMBIE') spawnZombie(x, y);
    else if(arme === 'NUKE') triggerNuke(x, y, col);
    else if(arme === 'BLACKHOLE') triggerBlackHole(x, y);
    else if(arme.startsWith('BBOT')) spawnBBot(x, y, arme);

    px -= prix; score += prix;
    currentQuest.current++;
    checkQuestStatus();
    updateUI();
};

function createPixel(x, y, color) {
    const gridX = Math.floor(x/25)*25;
    const gridY = Math.floor(y/25)*25;
    
    // ENVOI À FIREBASE
    pixelsRef.push({
        x: gridX,
        y: gridY,
        color: color,
        user: pseudo,
        time: Date.now()
    });
    
    statsPlaced++;
}

// --- 9. EFFETS SPÉCIAUX ---
function triggerNuke(x, y, color) {
    for(let i=-5; i<=5; i++) {
        for(let j=-5; j<=5; j++) {
            if(Math.sqrt(i*i + j*j) <= 5) {
                setTimeout(() => createPixel(x+(i*25), y+(j*25), color), Math.random()*500);
            }
        }
    }
}

function triggerBlackHole(x, y) {
    const bh = document.createElement('div');
    bh.className = 'blackhole-effect';
    bh.style.left = x + 'px'; bh.style.top = y + 'px';
    canvas.appendChild(bh);
    setTimeout(() => bh.remove(), 3000);
}

function spawnZombie(x, y) {
    const z = document.createElement('div');
    z.innerHTML = '🧟'; z.style.cssText = `position:absolute; left:${x}px; top:${y}px; font-size:40px; z-index:3000;`;
    canvas.appendChild(z);
    let s = 20;
    let mv = setInterval(() => {
        let nx = parseInt(z.style.left) + (Math.random()*60-30);
        let ny = parseInt(z.style.top) + (Math.random()*60-30);
        z.style.left = nx+'px'; z.style.top = ny+'px';
        createPixel(nx, ny, '#32cd32');
        if(--s <= 0) { clearInterval(mv); z.remove(); }
    }, 400);
}

// --- 10. CHAT & UI ---
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
    div.innerHTML = `<span style="color:#00f2ff; font-weight:bold;">${user}:</span> ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function login() {
    let p = document.getElementById('reg-pseudo').value;
    if(p.length < 3) return alert("Pseudo trop court !");
    pseudo = p; gameActive = true;
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('display-username').innerText = "@" + pseudo;
    addChatMessage("SYSTEM", `Bienvenue ${pseudo} !`);
    updateUI();
}

function updateUI() {
    document.getElementById('px-total').innerText = Math.floor(px).toLocaleString();
    document.getElementById('score-total').innerText = Math.floor(score).toLocaleString();
    document.getElementById('stat-placed').innerText = statsPlaced;
    document.getElementById('stat-earned').innerText = Math.floor(statsEarned);
    document.getElementById('stat-bots').innerText = statsBots;
}

function selectItem(el, a, p) {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
    el.classList.add('active'); 
    arme = a; prix = p;
}

function showTab(t) {
    document.querySelectorAll('.tab-pane').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(t).style.display = 'flex';
    document.getElementById('btn-' + t).classList.add('active');
}

function toggleArsenal(s) {
    document.getElementById('arsenalMenu').style.display = s ? 'flex' : 'none';
}

function togglePanel(id) {
    const body = document.querySelector(`#${id} .panel-body`);
    body.style.display = (body.style.display === 'none') ? 'block' : 'none';
}

function checkQuestStatus() {
    if(currentQuest.current >= currentQuest.target) {
        px += currentQuest.reward;
        addChatMessage("SYSTEM", `Quête finie : +${currentQuest.reward} PX`);
        currentQuest.target *= 2; currentQuest.current = 0;
    }
}

function checkEventTriggers() {}

function shakeElement(el) {
    if(!el) return;
    el.style.color = "red";
    setTimeout(() => el.style.color = "", 500);
}

function createParticleEffect(x, y, color) {
    const p = document.createElement('div');
    p.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:4px; height:4px; background:${color}; pointer-events:none;`;
    canvas.appendChild(p);
    setTimeout(() => p.remove(), 1000);
}

function checkCreatorCode() {
    if(document.getElementById('creatorInput').value === "C26062012s!") {
        px += 1000000; updateUI(); alert("CODE CRÉATEUR ACTIVÉ !");
    }
}

function initGame() {
    updateUI();
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });
}

window.onload = initGame;
