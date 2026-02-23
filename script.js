// ============================================================
// CYBER-INTERFACE OMEGA - JAVASCRIPT CORE (FULL MULTIPLAYER)
// Version: 7.5.0 - Leaderboard & Chat Sync Fixed
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const pixelsRef = db.ref('pixels');
const chatRef = db.ref('globalChat');    // Ajouté pour le multi-chat
const statsRef = db.ref('leaderboard');  // Ajouté pour le classement

// --- 2. CONFIGURATION & VARIABLES GLOBALES ---
let px = 100; 
let score = 0; 
let arme = 'BASE'; 
let prix = 1; 
let pseudo = ""; 
let zoomLevel = 1;
let level = 1; // Ajouté pour le classement
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

// --- 3. ÉCOUTEURS MULTIJOUEUR (Pixels, Chat, Stats) ---

// Synchronisation des Pixels
pixelsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    drawPixelLocally(data.x, data.y, data.color);
});

// Synchronisation du Chat Mondial (NOUVEAU)
chatRef.limitToLast(20).on('child_added', (snap) => {
    const data = snap.val();
    if (data.u && data.m) {
        addChatMessage(data.u, data.m, true); // true = vient de Firebase
    }
});

// Synchronisation du Classement (NOUVEAU)
statsRef.on('value', (snapshot) => {
    const lp = document.getElementById('top-players') || document.getElementById('leader-list');
    if(!lp) return;

    let players = [];
    snapshot.forEach(child => {
        let val = child.val();
        players.push({ n: child.key, s: val.score || 0, l: val.level || 1 });
    });

    players.sort((a, b) => b.s - a.s); 

    let html = "";
    players.slice(0, 15).forEach((p, i) => {
        let isMe = (p.n === pseudo) ? "color:#00f2ff; font-weight:bold; background:rgba(0,242,255,0.1);" : "";
        html += `<div style="${isMe} padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
                    <span>${i+1}. ${p.n}</span>
                    <span>${p.s.toLocaleString()} PX</span>
                 </div>`;
    });
    lp.innerHTML = html || "En attente...";
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
    updateLeaderboard(); // Mise à jour Firebase du score
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
        time: firebase.database.ServerValue.TIMESTAMP
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

// --- 10. CHAT & UI (MULTI-SYNC) ---

function updateLeaderboard() {
    if(!pseudo || !gameActive) return;
    statsRef.child(pseudo).set({
        score: score,
        level: level,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if(!input || input.value.trim() === "" || !gameActive) return;
    
    // ENVOI MULTIJOUEUR
    chatRef.push({
        u: pseudo || "Anonyme",
        m: filterText(input.value.trim()),
        t: firebase.database.ServerValue.TIMESTAMP
    });
    
    input.value = "";
}

function addChatMessage(user, text, isFromFirebase = false) {
    const box = document.getElementById('chat-box') || document.getElementById('chat-messages');
    if(!box) return;
    const div = document.createElement('div');
    div.innerHTML = `<span style="color:#00f2ff; font-weight:bold;">${user}:</span> ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function login() {
    let p = document.getElementById('reg-pseudo').value;
    if(p.length < 3) return alert("Pseudo trop court !");
    pseudo = p.replace(/[^a-zA-Z0-9]/g, '_'); // Sécurité pseudo
    gameActive = true;
    document.getElementById('auth-overlay').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('display-username').innerText = "@" + pseudo;
    
    // Notification système locale
    addChatMessage("SYSTEM", `Connexion établie. Bienvenue ${pseudo} !`);
    
    updateUI();
    updateLeaderboard();
}

function updateUI() {
    const pxEl = document.getElementById('px-total');
    const scEl = document.getElementById('score-total');
    if(pxEl) pxEl.innerText = Math.floor(px).toLocaleString();
    if(scEl) scEl.innerText = Math.floor(score).toLocaleString();
    
    if(document.getElementById('stat-placed')) document.getElementById('stat-placed').innerText = statsPlaced;
    if(document.getElementById('stat-earned')) document.getElementById('stat-earned').innerText = Math.floor(statsEarned);
    if(document.getElementById('stat-bots')) document.getElementById('stat-bots').innerText = statsBots;
}

function selectItem(el, a, p) {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
    el.classList.add('active'); 
    arme = a; prix = p;
}

function showTab(t) {
    document.querySelectorAll('.tab-pane').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    const target = document.getElementById(t);
    if(target) target.style.display = 'flex';
    const btn = document.getElementById('btn-' + t);
    if(btn) btn.classList.add('active');
}

function toggleArsenal(s) {
    document.getElementById('arsenalMenu').style.display = s ? 'flex' : 'none';
}

function togglePanel(id) {
    const body = document.querySelector(`#${id} .panel-body`);
    if(body) body.style.display = (body.style.display === 'none') ? 'block' : 'none';
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
        px += 10000000; score += 10000000; updateUI(); alert("👑 ACCÈS CRÉATEUR ACTIVÉ !");
    }
}

function initGame() {
    updateUI();
    const chatInput = document.getElementById('chatInput');
    if(chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') sendMessage();
        });
    }
}

window.onload = initGame;
