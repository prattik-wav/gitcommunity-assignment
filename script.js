var TOTAL_BUBBLES = 40; // 5 rows x 8 columns

var themes = {
    pink: { primary: '#ff477e', dark: '#d81b53' },
    purple: { primary: '#9d4edd', dark: '#7b2cbf' },
    blue: { primary: '#4361ee', dark: '#3a0ca3' },
    green: { primary: '#06d6a0', dark: '#02c39a' },
    orange: { primary: '#f77f00', dark: '#d62828' }
};

var score = 0;
var best = parseInt(localStorage.getItem('popit-best')) || 0;
var comboStreak = 0;
var soundOn = localStorage.getItem('popit-sound') !== 'false';
var darkMode = localStorage.getItem('popit-dark') === 'true';
var currentTheme = localStorage.getItem('popit-theme') || 'pink';

var isPlaying = false;
var spawnTimer = null;
var currentBubble = null;

var board = document.getElementById('board');
var scoreDisplay = document.getElementById('scoreDisplay');
var bestDisplay = document.getElementById('bestDisplay');
var playBtn = document.getElementById('playBtn');
var resetBtn = document.getElementById('resetBtn');
var darkBtn = document.getElementById('darkBtn');
var soundBtn = document.getElementById('soundBtn');
var bunnyEl = document.getElementById('cuteBunny');
var speechEl = document.getElementById('bunnySpeech');

// Web Audio Context for sound effects
var audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(freq, duration) {
    if (!soundOn || !audioCtx) return;
    try {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, audioCtx.currentTime + duration);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}

function createBoard() {
    board.innerHTML = '';
    for (var i = 0; i < TOTAL_BUBBLES; i++) {
        var bubble = document.createElement('div');
        bubble.className = 'bubble popped';

        bubble.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            popBubble(this);
        });

        bubble.addEventListener('touchstart', function (e) {
            e.preventDefault();
            popBubble(this);
        }, { passive: false });

        board.appendChild(bubble);
    }
}

function resetGame() {
    score = 0;
    best = 0;
    comboStreak = 0;
    save();
    updateDisplay();

    isPlaying = false;
    playBtn.textContent = 'Play';
    playBtn.classList.add('btn-primary');
    clearTimeout(spawnTimer);

    if (currentBubble) {
        clearTimeout(currentBubble.dataset.warningId);
        clearTimeout(currentBubble.dataset.escapeId);
        currentBubble = null;
    }

    document.querySelectorAll('.bubble').forEach(function (b) {
        b.className = 'bubble popped';
    });
}

function toggleGame() {
    initAudio();
    isPlaying = !isPlaying;

    if (isPlaying) {
        playBtn.textContent = 'Pause';
        playBtn.classList.remove('btn-primary');
        scheduleNext(200);
    } else {
        playBtn.textContent = 'Play';
        playBtn.classList.add('btn-primary');
        clearTimeout(spawnTimer);

        if (currentBubble) {
            clearTimeout(currentBubble.dataset.warningId);
            clearTimeout(currentBubble.dataset.escapeId);
            currentBubble.className = 'bubble popped';
            currentBubble = null;
        }
    }
}

function scheduleNext(delay) {
    if (!isPlaying) return;
    clearTimeout(spawnTimer);
    spawnTimer = setTimeout(spawnBubble, delay);
}

function spawnBubble() {
    if (!isPlaying) return;

    var inactive = document.querySelectorAll('.bubble.popped');
    if (inactive.length === 0) return;

    var bubble = inactive[Math.floor(Math.random() * inactive.length)];
    currentBubble = bubble;

    // Warning state
    bubble.classList.remove('popped');
    bubble.classList.add('warning');

    var speedFactor = Math.min(score / 100, 0.75);
    var warningTime = Math.max(250 * (1 - speedFactor), 100);

    bubble.dataset.warningId = setTimeout(function () {
        if (!isPlaying || currentBubble !== bubble) return;

        // Fully pop up
        bubble.classList.remove('warning');
        playSound(300, 0.05);

        var isGolden = Math.random() < 0.08;
        if (isGolden) bubble.classList.add('golden');

        var activeTime = Math.max((isGolden ? 600 : 900) * (1 - speedFactor), isGolden ? 250 : 300);

        bubble.dataset.escapeId = setTimeout(function () {
            escapeBubble(bubble);
        }, activeTime);

    }, warningTime);
}

function escapeBubble(bubble) {
    if (!isPlaying || currentBubble !== bubble) return;

    bubble.className = 'bubble popped missed';
    setTimeout(function () { bubble.classList.remove('missed'); }, 400);

    var wasStreak = comboStreak > 0;
    score = 0;
    comboStreak = 0;
    updateDisplay();
    playSound(150, 0.2); // Miss sound
    currentBubble = null;

    board.classList.remove('shake');
    void board.offsetWidth;
    board.classList.add('shake');

    if (wasStreak) {
        if (bunnyTimer) clearTimeout(bunnyTimer);
        peekBunny(true);
    }

    scheduleNext(150);
}

function popBubble(bubble) {
    if (!isPlaying) {
        toggleGame();
        return;
    }

    if (bubble !== currentBubble || bubble.classList.contains('popped') || bubble.classList.contains('warning')) return;

    clearTimeout(bubble.dataset.escapeId);
    currentBubble = null;

    var isGolden = bubble.classList.contains('golden');

    // Visually push the bubble down
    bubble.className = 'bubble popped';
    playSound(isGolden ? 800 : 400, 0.15); // Pop sound

    var points = isGolden ? 5 : 1;
    score += points;
    comboStreak++;
    if (score > best) best = score;

    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('score-pop');

    showFloatingText(bubble, '+' + points, isGolden);
    checkCombo();
    updateDisplay();
    save();

    scheduleNext(50);
}

function updateDisplay() {
    scoreDisplay.textContent = score;
    bestDisplay.textContent = best;
}

function showFloatingText(element, text, isGolden) {
    var rect = element.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'pop-text' + (isGolden ? ' golden-text' : '');
    el.textContent = text;
    el.style.left = (rect.left + rect.width / 2) + 'px';
    el.style.top = rect.top + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 800);
}

var comboTexts = {
    5: { text: 'Nice', color: '#f77f00' },
    10: { text: 'Amazing', color: '#ff477e' },
    15: { text: 'Legendary', color: '#9d4edd' },
    20: { text: 'Godlike', color: '#4361ee' },
    30: { text: 'Unstoppable', color: '#06d6a0' }
};

function checkCombo() {
    if (comboTexts[comboStreak]) {
        var el = document.createElement('div');
        el.className = 'combo-text';
        el.textContent = comboTexts[comboStreak].text;
        el.style.color = comboTexts[comboStreak].color;
        document.body.appendChild(el);
        setTimeout(function () { el.remove(); }, 1000);
    }
}

function applyTheme(name) {
    var t = themes[name];
    var s = document.documentElement.style;
    s.setProperty('--primary', t.primary);
    s.setProperty('--primary-dark', t.dark);

    document.querySelectorAll('.theme-dot').forEach(function (dot) {
        dot.classList.toggle('active', dot.dataset.theme === name);
    });
    currentTheme = name;
}

function toggleDark() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    darkBtn.textContent = darkMode ? 'Light' : 'Night';
    save();
}

function toggleSound() {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? 'Sound' : 'Muted';
    save();
}

function save() {
    localStorage.setItem('popit-best', best);
    localStorage.setItem('popit-sound', soundOn);
    localStorage.setItem('popit-dark', darkMode);
    localStorage.setItem('popit-theme', currentTheme);
}

// Event Listeners
playBtn.addEventListener('click', toggleGame);
resetBtn.addEventListener('click', resetGame);
darkBtn.addEventListener('click', toggleDark);
soundBtn.addEventListener('click', toggleSound);

document.querySelectorAll('.theme-dot').forEach(function (dot) {
    dot.addEventListener('click', function () {
        applyTheme(dot.dataset.theme);
        save();
    });
});

var titleEl = document.querySelector('.title');
var titleClicks = 0;
titleEl.addEventListener('click', function () {
    titleClicks++;
    if (titleClicks >= 5) {
        document.body.classList.toggle('rainbow-mode');
        titleClicks = 0;
        if (soundOn && audioCtx) {
            playSound(800, 0.1);
            setTimeout(() => playSound(1200, 0.2), 100);
        }
    }
});

// Bunny Logic
var bunnyTimer = null;
var bunnyPhrases = [
    "Good luck!",
    "You're doing great!",
    "Ganbare ganbare!",
    "Machate raho!",
    "Shabaash!",
    "Pop 'em all!",
    "You got this!",
    "I believe in you!"
];

var idlePhrases = [
    "Start fast!",
    "U lazy as hell",
    "I'm waiting for u...",
    "Click Play already!",
    "Wake up!",
    "Are we playing or what?",
    "Boring..."
];

var sadPhrases = [
    "Oh no!",
    "Streak lost...",
    "Don't give up!",
    "Oops!",
    "Aww man!",
    "Try again!"
];

function scheduleBunny() {
    if (bunnyTimer) clearTimeout(bunnyTimer);
    var delay = Math.random() * 12000 + 8000; // 8-20s
    bunnyTimer = setTimeout(peekBunny, delay);
}

function peekBunny(isSad) {
    if (!isPlaying && isSad === true) return; // for safety

    // Clear old positions completely using 'auto' to override CSS defaults
    bunnyEl.className = '';
    bunnyEl.style.top = 'auto'; bunnyEl.style.bottom = 'auto';
    bunnyEl.style.left = 'auto'; bunnyEl.style.right = 'auto';
    bunnyEl.style.transform = '';

    var randomText;
    var mouth = document.getElementById('bunnyMouth');

    if (isSad === true) {
        randomText = sadPhrases[Math.floor(Math.random() * sadPhrases.length)];
        mouth.setAttribute('d', 'M46 71 Q 50 67 54 71'); // Frown
    } else {
        randomText = isPlaying
            ? bunnyPhrases[Math.floor(Math.random() * bunnyPhrases.length)]
            : idlePhrases[Math.floor(Math.random() * idlePhrases.length)];
        mouth.setAttribute('d', 'M46 68 Q 50 72 54 68'); // Smile
    }

    speechEl.textContent = randomText;

    // Pick random side (0: bottom, 1: top, 2: left, 3: right)
    var side = Math.floor(Math.random() * 4);
    var randPos = Math.floor(Math.random() * 60) + 20; // 20% to 80% to avoid corners

    if (side === 0) {
        bunnyEl.classList.add('side-bottom');
        bunnyEl.style.bottom = '-120px';
        bunnyEl.style.left = randPos + '%';
    } else if (side === 1) {
        bunnyEl.classList.add('side-top');
        bunnyEl.style.top = '-120px';
        bunnyEl.style.left = randPos + '%';
    } else if (side === 2) {
        bunnyEl.classList.add('side-left');
        bunnyEl.style.left = '-120px';
        bunnyEl.style.top = randPos + '%';
    } else if (side === 3) {
        bunnyEl.classList.add('side-right');
        bunnyEl.style.right = '-120px';
        bunnyEl.style.top = randPos + '%';
    }

    // Small delay to let position apply before peeking
    setTimeout(function () {
        if (side === 0) bunnyEl.style.transform = 'translateY(-110px)';
        if (side === 1) bunnyEl.style.transform = 'translateY(110px)';
        if (side === 2) bunnyEl.style.transform = 'translateX(110px)';
        if (side === 3) bunnyEl.style.transform = 'translateX(-110px)';

        bunnyEl.classList.add('peek');

        if (soundOn && audioCtx) {
            if (isSad === true) {
                playSound(400, 0.05);
                setTimeout(function () { playSound(300, 0.05); }, 150);
            } else {
                playSound(800, 0.05);
                setTimeout(function () { playSound(1000, 0.05); }, 80);
            }
        }
    }, 50);

    // Bunny timer
    bunnyTimer = setTimeout(function () {
        bunnyEl.style.transform = ''; // drops back off screen
        bunnyEl.classList.remove('peek');
        scheduleBunny();
    }, 3000);
}

function catchBunny() {
    if (!isPlaying) return;

    bunnyEl.style.transform = '';
    bunnyEl.classList.remove('peek');
    clearTimeout(bunnyTimer);

    // reset mouth to smile
    document.getElementById('bunnyMouth').setAttribute('d', 'M46 68 Q 50 72 54 68');

    score += 25;
    if (score > best) best = score;

    scoreDisplay.classList.remove('score-pop');
    void scoreDisplay.offsetWidth;
    scoreDisplay.classList.add('score-pop');

    updateDisplay();
    save();

    showFloatingText(bunnyEl, '+25 BUNNY!', true);
    if (soundOn && audioCtx) {
        playSound(900, 0.1);
        setTimeout(function () { playSound(1200, 0.15); }, 100);
    }

    scheduleBunny();
}

bunnyEl.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || !bunnyEl.classList.contains('peek')) return;
    catchBunny();
});

bunnyEl.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (!bunnyEl.classList.contains('peek')) return;
    catchBunny();
}, { passive: false });

function init() {
    createBoard();
    applyTheme(currentTheme);
    document.body.classList.toggle('dark-mode', darkMode);
    darkBtn.textContent = darkMode ? 'Light' : 'Night';
    soundBtn.textContent = soundOn ? 'Sound' : 'Muted';
    updateDisplay();
    scheduleBunny();
}

init();