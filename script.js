// ============================================================
// CYBER-INTERFACE OMEGA - JAVASCRIPT CORE
// Version: 4.0.0 (Extended Edition)
// ============================================================

// --- CONFIGURATION & VARIABLES GLOBALES ---
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

const canvas = document.getElementById('canvas');
const viewport = document.getElementById('viewport');

// --- 1. REVENU AUTOMATIQUE (1 PX / 5s) ---
setInterval(() => {
    if (gameActive) {
        px += 1;
        statsEarned += 1;
        updateUI();
        checkEventTriggers(); // Vérifie les événements aléatoires
    }
}, 5000);

// --- 2. MÉGA BLACKLIST & FILTRE ---
const BLACKLIST = [
    "merde", "putain", "con", "connard", "salope", "encule", "fdp", "pute", "bite", "couille", "nique", "chier", "batard",
    "shit", "fuck", "bitch", "asshole", "dick", "pussy", "cunt", "faggot", "motherfucker", "whore", "bastard",
    "m.e.r.d.e", "p.u.t.a.i.n", "f.u.c.k", "s.h.i.t", "p_u_t_e", "c0n", "p0utre", "sal0pe", "encu1e", "b4tard", "niqu3r",
    "merdouille", "saligaud", "cretin", "debile", "abruti", "trouduc", "va chier", "salau", "salaud"
];

function filterText(text) {
    let cleanText = text.toLowerCase();
    let simplifiedText = cleanText.replace(/[^a-zA-Z0-9]/g, "");
    let censored = text;
    BLACKLIST.forEach(word => {
        let simplifiedWord = word.replace(/[^a-zA-Z0-9]/g, "");
        if (simplifiedText.includes(simplifiedWord) || cleanText.includes(word.toLowerCase())) {
            let stars = "*".repeat(word.length);
            let regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
            censored = censored.replace(regex, stars);
        }
    });
    return censored;
}

// --- 3. DÉPLACEMENT (SOURIS, CLAVIER & BOUTONS) ---

function moveMap(direction) {
    if (!gameActive) return;
    if (direction === 'up') camY += arrowMoveSpeed;
    if (direction === 'down') camY -= arrowMoveSpeed;
    if (direction === 'left') camX += arrowMoveSpeed;
    if (direction === 'right') camX -= arrowMoveSpeed;
    applyMapTransform();
}

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return; 
    if (e.key === "ArrowUp" || e.key === "z") moveMap('up');
    if (e.key === "ArrowDown" || e.key === "s") moveMap('down');
    if (e.key === "ArrowLeft" || e.key === "q") moveMap('left');
    if (e.key === "ArrowRight" || e.key === "d") moveMap('right');
    if (e.key === "Escape") toggleArsenal(false);
});

function applyMapTransform() {
    canvas.style.left = camX + 'px';
    canvas.style.top = camY + 'px';
}

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

window.addEventListener('wheel', (e) => {
    if (!gameActive) return;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomLevel = Math.min(Math.max(0.1, zoomLevel + delta), 5);
    canvas.style.transform = `scale(${zoomLevel})`;
}, { passive: true });

// --- 4. DRAG & DROP DES PANELS ---
function makeDraggable(el) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = el.querySelector('.panel-header');
    if (header) { header.onmousedown = dragMouseDown; }

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
            el.style.bottom = "auto";
        };
    }
}
if(document.getElementById('chat')) makeDraggable(document.getElementById('chat'));
if(document.getElementById('leaderboard')) makeDraggable(document.getElementById('leaderboard'));

// --- 5. CLASSEMENT (DYNAMIQUE) ---
let onlinePlayers = [
    {n: "Alpha_Admin", s: 150000},
    {n: "Omega_User", s: 75000},
    {n: "Pixel_Hunter", s: 45000}
];

function updateLeaderboard() {
    let fullList = [...onlinePlayers];
    let meIdx = fullList.findIndex(p => p.n === pseudo);
    if(meIdx !== -1) { fullList[meIdx].s = score; } 
    else if(pseudo) { fullList.push({n: pseudo, s: score}); }

    fullList.sort((a, b) => b.s - a.s);
    let h = "";
    fullList.forEach((p, i) => {
        let isMe = (p.n === pseudo) ? "color:#00f2ff; font-weight:bold;" : "";
        h += `<div style="${isMe} margin-bottom: 4px;">${i+1}. ${p.n} - ${p.s.toLocaleString()}</div>`;
    });
    const tp = document.getElementById('top-players');
    if(tp) tp.innerHTML = h;
    let rankPos = fullList.findIndex(p => p.n === (pseudo || "Toi")) + 1;
    const mr = document.getElementById('my-rank');
    if(mr) mr.innerText = "Votre Rang: #" + rankPos;
}

// --- 6. GESTION DES B-BOTS ---
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
        const blockers = document.querySelectorAll(`.pixel:not(.bbot-unit)`);
        let isCovered = false;
        blockers.forEach(p => {
            if(p.style.left === bot.style.left && p.style.top === bot.style.top) isCovered = true;
        });

        if(isCovered || !gameActive) {
            clearInterval(income);
            bot.style.filter = "grayscale(1)";
            setTimeout(() => { bot.remove(); statsBots--; updateUI(); }, 500);
            return;
        }

        px += power; statsEarned += power;
        updateUI();
        createParticleEffect(parseInt(bot.style.left), parseInt(bot.style.top), 'rgba(0,242,255,0.5)');
        if(--life <= 0) { clearInterval(income); bot.remove(); statsBots--; updateUI(); }
    }, speed);
}

// --- 7. MOTEUR DE TIR & SYSTÈME DE COMBO ---
canvas.onclick = (e) => {
    if (!gameActive || isDraggingMap) return; 
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel;
    const col = document.getElementById('pixelColor')?.value || "#00f2ff";

    if(px < prix) {
        shakeElement(document.getElementById('px-total'));
        return;
    } 

    // Gestion Combo
    let now = Date.now();
    if(now - lastClickTime < 500) comboCount++; else comboCount = 0;
    lastClickTime = now;

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
    const p = document.createElement('div');
    p.className = 'pixel';
    p.style.left = Math.floor(x/25)*25 + 'px';
    p.style.top = Math.floor(y/25)*25 + 'px';
    p.style.backgroundColor = color;
    p.style.position = "absolute"; p.style.width = "25px"; p.style.height = "25px";
    p.style.boxShadow = `0 0 5px ${color}`;
    canvas.appendChild(p);
    statsPlaced++;
}

// --- 8. EFFETS SPÉCIAUX (EXTENSIONS) ---
function triggerNuke(x, y, color) {
    createParticleEffect(x, y, color);
    for(let i=-10; i<=10; i++) {
        for(let j=-10; j<=10; j++) {
            if(Math.sqrt(i*i + j*j) <= 10) {
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
    let pull = setInterval(() => {
        document.querySelectorAll('.pixel:not(.bbot-unit)').forEach(p => {
            const dx = parseInt(p.style.left) - x;
            const dy = parseInt(p.style.top) - y;
            if(Math.sqrt(dx*dx+dy*dy) < 500) p.remove();
        });
    }, 100);
    setTimeout(() => { clearInterval(pull); bh.remove(); }, 4000);
}

function spawnZombie(x, y) {
    const z = document.createElement('div');
    z.innerHTML = '🧟'; z.style.cssText = `position:absolute; left:${x}px; top:${y}px; font-size:40px; z-index:3000; transition: 0.3s;`;
    canvas.appendChild(z);
    let s = 30;
    let mv = setInterval(() => {
        let nx = parseInt(z.style.left) + (Math.random()*100-50);
        let ny = parseInt(z.style.top) + (Math.random()*100-50);
        z.style.left = nx+'px'; z.style.top = ny+'px';
        createPixel(nx, ny, '#32cd32');
        if(--s <= 0) { clearInterval(mv); z.remove(); }
    }, 300);
}

// --- 9. SYSTÈME SOCIAL & CHAT ---
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
    div.style.padding = "2px 0";
    div.innerHTML = `<span style="color:#00f2ff; font-weight:bold;">${user}:</span> ${text}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    if(box.childNodes.length > 50) box.removeChild(box.firstChild);
}

// --- 10. SYSTÈME DE QUÊTES & SUCCÈS ---
function checkQuestStatus() {
    if(currentQuest.current >= currentQuest.target) {
        px += currentQuest.reward;
        addChatMessage("SYSTEM", `Quête terminée : ${currentQuest.desc} (+${currentQuest.reward} PX)`);
        currentQuest.id++;
        currentQuest.target *= 2;
        currentQuest.current = 0;
        currentQuest.reward *= 1.5;
        updateUI();
    }
}

function checkEventTriggers() {
    let rand = Math.random();
    if(rand < 0.05) { // 5% de chance d'un mini-événement
        weatherActive = "STORM";
        addChatMessage("METEO", "Tempête solaire en cours ! Revenu automatique doublé !");
        px += 50;
        setTimeout(() => weatherActive = "NEUTRAL", 10000);
    }
}

// --- 11. UI & UTILITAIRES ---
function initGame() {
    console.log("Game Core Initialized...");
    updateUI();
    // Support Entrée pour le chat
    document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });
}

function login() {
    let p = document.getElementById('reg-pseudo').value;
    if(p.length < 3) return alert("Pseudo trop court !");
    pseudo = p; gameActive = true;
    document.getElementById('auth-overlay').style.opacity = '0';
    setTimeout(() => {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('game-ui').style.display = 'block';
        document.getElementById('display-username').innerText = "@" + pseudo;
    }, 500);
    addChatMessage("SYSTEM", `Bienvenue ${pseudo} dans le secteur OMEGA.`);
}

function updateUI() {
    const pxTotal = document.getElementById('px-total');
    const scoreTotal = document.getElementById('score-total');
    if(pxTotal) pxTotal.innerText = Math.floor(px).toLocaleString();
    if(scoreTotal) scoreTotal.innerText = Math.floor(score).toLocaleString();
    
    const sP = document.getElementById('stat-placed');
    const sE = document.getElementById('stat-earned');
    const sB = document.getElementById('stat-bots');
    
    if(sP) sP.innerText = statsPlaced;
    if(sE) sE.innerText = Math.floor(statsEarned);
    if(sB) sB.innerText = statsBots;
    
    updateLeaderboard();
}

function selectItem(el, a, p) {
    document.querySelectorAll('.item').forEach(i => i.classList.remove('active'));
    el.classList.add('active'); 
    arme = a; 
    prix = p;
    createParticleEffect(el.offsetLeft, el.offsetTop, 'var(--accent)');
}

function showTab(t) {
    document.querySelectorAll('.tab-pane').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
    const target = document.getElementById(t);
    if(target) target.style.display = 'flex';
    const btn = document.getElementById('btn-' + t);
    if(btn) btn.classList.add('active');
}

function shakeElement(el) {
    if(!el) return;
    el.style.color = "var(--danger)";
    el.style.transform = "translateX(5px)";
    setTimeout(() => el.style.transform = "translateX(-5px)", 50);
    setTimeout(() => { el.style.transform = "translateX(0)"; el.style.color = ""; }, 100);
}

function createParticleEffect(x, y, color) {
    for(let i=0; i<5; i++) {
        const part = document.createElement('div');
        part.style.cssText = `position:absolute; left:${x}px; top:${y}px; width:4px; height:4px; background:${color}; border-radius:50%; pointer-events:none; z-index:10000;`;
        canvas.appendChild(part);
        let vx = (Math.random()-0.5)*10;
        let vy = (Math.random()-0.5)*10;
        let op = 1;
        let anim = setInterval(() => {
            part.style.left = (parseFloat(part.style.left) + vx) + "px";
            part.style.top = (parseFloat(part.style.top) + vy) + "px";
            op -= 0.1; part.style.opacity = op;
            if(op <= 0) { clearInterval(anim); part.remove(); }
        }, 30);
    }
}

// --- 12. GESTION DES PANELS & INVENTAIRE ---
function openInventory() {
    toggleArsenal(true);
}

function toggleArsenal(s) {
    const menu = document.getElementById('arsenalMenu');
    const btn = document.getElementById('openBtn');
    if(menu) menu.style.display = s ? 'flex' : 'none';
    if(btn) btn.style.display = s ? 'none' : 'block';
}

function togglePanel(id) {
    const panel = document.getElementById(id);
    if(!panel) return;
    const body = panel.querySelector('.panel-body') || document.getElementById(id + '-content');
    if(body) body.style.display = (body.style.display === 'none') ? 'block' : 'none';
}

function checkCreatorCode() {
    const val = document.getElementById('creatorInput')?.value;
    if(val === "C26062012s!") {
        px += 1000000; 
        updateUI(); 
        alert("💎 CODE CRÉATEUR ALPHA ACTIVÉ (+1M PX)");
        addChatMessage("SYSTEM", "Un code créateur légendaire a été utilisé !");
    } else {
        alert("Code invalide...");
    }
}

// Nettoyage automatique des particules orphelines
setInterval(() => {
    if(activeParticles.length > 100) {
        activeParticles.splice(0, 50).forEach(p => p.remove());
    }
}, 30000);

// Lancement automatique
window.onload = initGame;

// ============================================================
// FIN DU CORE JS - 350+ LIGNES DE CODE OPTIMISÉ
// ============================================================
