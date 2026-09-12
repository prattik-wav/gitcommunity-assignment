let TOTAL_BUBBLES = 40;
let myScore = 0;
let myBestScore = 0;
let comboStreak = 0;

// try to load saved data
if (localStorage.getItem('popit-best')) {
    myBestScore = parseInt(localStorage.getItem('popit-best'));
}

let soundIsOn = true;
if (localStorage.getItem('popit-sound') == 'false') {
    soundIsOn = false;
}

let darkModeIsOn = false;
if (localStorage.getItem('popit-dark') == 'true') {
    darkModeIsOn = true;
}

let currentThemeColor = 'pink';
if (localStorage.getItem('popit-theme')) {
    currentThemeColor = localStorage.getItem('popit-theme');
}

let isPlayingGame = false;
let spawnBubbleTimer;
let theCurrentBubble = null;

// get HTML elements
let boardArea = document.getElementById('board');
let scoreDisplay = document.getElementById('scoreDisplay');
let bestDisplay = document.getElementById('bestDisplay');
let btnPlay = document.getElementById('playBtn');
let btnReset = document.getElementById('resetBtn');
let btnDark = document.getElementById('darkBtn');
let btnSound = document.getElementById('soundBtn');
let myTitle = document.getElementById('mainTitle');
let myHint = document.getElementById('titleHint');
let bunnyEl = document.getElementById('cuteBunny');
let speechEl = document.getElementById('bunnySpeech');

// Load my sound files
let popSound = new Audio('assets/pop.mp3');
let goldenSound = new Audio('assets/coin.mp3');
let missSound = new Audio('assets/miss.mp3');
let cheerSound = new Audio('assets/cheer.mp3');

function playSound(type) {
    if (soundIsOn == false) return; // do nothing if muted

    if (type == 'pop') {
        popSound.currentTime = 0; // reset to start 
        popSound.play();
    } else if (type == 'golden') {
        goldenSound.currentTime = 0;
        goldenSound.play();
    } else if (type == 'miss') {
        missSound.currentTime = 0;
        missSound.play();
    } else if (type == 'cheer') {
        cheerSound.currentTime = 0;
        cheerSound.play();
    }
}

// build the game board
function createBoard() {
    boardArea.innerHTML = ''; // clear it first

    for (let i = 0; i < TOTAL_BUBBLES; i++) {
        let bubble = document.createElement('div');
        bubble.className = 'bubble popped';

        // mouse click
        bubble.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            popBubble(this);
        });

        boardArea.appendChild(bubble);
    }
}

function updateScoreText() {
    scoreDisplay.innerText = myScore;
    bestDisplay.innerText = myBestScore;
}

function resetTheGame() {
    myScore = 0;
    comboStreak = 0;
    saveMyData();
    updateScoreText();

    isPlayingGame = false;
    btnPlay.innerText = 'Play';
    btnPlay.classList.add('btn-primary');
    clearTimeout(spawnBubbleTimer);

    if (theCurrentBubble) {
        clearTimeout(theCurrentBubble.dataset.warningId);
        clearTimeout(theCurrentBubble.dataset.escapeId);
        theCurrentBubble = null;
    }

    let allBubbles = document.querySelectorAll('.bubble');
    for (let i = 0; i < allBubbles.length; i++) {
        allBubbles[i].className = 'bubble popped';
    }
}

function toggleStartStop() {
    if (isPlayingGame == false) {
        isPlayingGame = true;
        btnPlay.innerText = 'Pause';
        btnPlay.classList.remove('btn-primary');
        scheduleNextBubble(200);
    } else {
        isPlayingGame = false;
        btnPlay.innerText = 'Play';
        btnPlay.classList.add('btn-primary');
        clearTimeout(spawnBubbleTimer);

        if (theCurrentBubble) {
            clearTimeout(theCurrentBubble.dataset.warningId);
            clearTimeout(theCurrentBubble.dataset.escapeId);
            theCurrentBubble.className = 'bubble popped';
            theCurrentBubble = null;
        }
    }
}

function scheduleNextBubble(delayTime) {
    if (isPlayingGame == false) return;
    clearTimeout(spawnBubbleTimer);
    spawnBubbleTimer = setTimeout(spawnNewBubble, delayTime);
}

function spawnNewBubble() {
    if (isPlayingGame == false) return;

    let inactiveBubbles = document.querySelectorAll('.bubble.popped');
    if (inactiveBubbles.length === 0) return;

    let randomNum = Math.floor(Math.random() * inactiveBubbles.length);
    let bubble = inactiveBubbles[randomNum];
    theCurrentBubble = bubble;

    bubble.classList.remove('popped');
    bubble.classList.add('warning');

    let speedTracker = myScore / 100;
    if (speedTracker > 0.75) speedTracker = 0.75;

    let warningTime = 250 * (1 - speedTracker);
    if (warningTime < 100) warningTime = 100;

    bubble.dataset.warningId = setTimeout(function () {
        if (isPlayingGame == false || theCurrentBubble !== bubble) return;

        bubble.classList.remove('warning');
        playSound('pop');

        let isGolden = false;
        if (Math.random() < 0.08) {
            isGolden = true;
            bubble.classList.add('golden');
        }

        let activeTime;
        if (isGolden == true) {
            activeTime = 600 * (1 - speedTracker);
            if (activeTime < 250) activeTime = 250;
        } else {
            activeTime = 900 * (1 - speedTracker);
            if (activeTime < 300) activeTime = 300;
        }

        bubble.dataset.escapeId = setTimeout(function () {
            missedBubble(bubble);
        }, activeTime);

    }, warningTime);
}

function missedBubble(bubble) {
    if (isPlayingGame == false || theCurrentBubble !== bubble) return;

    bubble.className = 'bubble popped missed';
    setTimeout(function () {
        bubble.classList.remove('missed');
    }, 400);

    let didIHaveAStreak = false;
    if (comboStreak > 0) {
        didIHaveAStreak = true;
    }

    myScore = 0;
    comboStreak = 0;
    updateScoreText();
    playSound('miss'); // miss sound
    theCurrentBubble = null;

    // make board shake
    boardArea.classList.remove('shake');
    setTimeout(function () {
        boardArea.classList.add('shake');
    }, 10);

    if (didIHaveAStreak == true) {
        if (bunnyTimer) clearTimeout(bunnyTimer);
        showBunny(true);
    }

    scheduleNextBubble(150);
}

function popBubble(bubble) {
    if (isPlayingGame == false) {
        toggleStartStop();
        return;
    }

    if (bubble !== theCurrentBubble) return;
    if (bubble.classList.contains('popped')) return;
    if (bubble.classList.contains('warning')) return;

    clearTimeout(bubble.dataset.escapeId);
    theCurrentBubble = null;

    let isGolden = false;
    if (bubble.classList.contains('golden')) {
        isGolden = true;
    }

    bubble.className = 'bubble popped';

    if (isGolden == true) {
        playSound('golden');
        myScore = myScore + 5;
    } else {
        playSound('pop');
        myScore = myScore + 1;
    }

    comboStreak = comboStreak + 1;
    if (myScore > myBestScore) {
        myBestScore = myScore;
    }

    // restart score pop animation
    scoreDisplay.classList.remove('score-pop');
    setTimeout(function () {
        scoreDisplay.classList.add('score-pop');
    }, 10);

    showFloatingNumber(bubble, isGolden);
    checkMyCombo();
    updateScoreText();
    saveMyData();

    scheduleNextBubble(50);
}

function showFloatingNumber(element, isGolden) {
    let rect = element.getBoundingClientRect();
    let popDiv = document.createElement('div');

    if (isGolden == true) {
        popDiv.className = 'pop-text golden-text';
        popDiv.innerText = '+5';
    } else {
        popDiv.className = 'pop-text';
        popDiv.innerText = '+1';
    }

    popDiv.style.left = (rect.left + rect.width / 2) + 'px';
    popDiv.style.top = rect.top + 'px';
    document.body.appendChild(popDiv);

    setTimeout(function () {
        popDiv.remove();
    }, 800);
}

function checkMyCombo() {
    let text = "";
    let color = "";

    if (comboStreak == 5) {
        text = 'Nice';
        color = '#f77f00';
    } else if (comboStreak == 10) {
        text = 'Amazing';
        color = '#ff477e';
    } else if (comboStreak == 15) {
        text = 'Legendary';
        color = '#9d4edd';
    } else if (comboStreak == 20) {
        text = 'Godlike';
        color = '#4361ee';
    } else if (comboStreak == 30) {
        text = 'Unstoppable';
        color = '#06d6a0';
    }

    if (text != "") {
        let el = document.createElement('div');
        el.className = 'combo-text';
        el.innerText = text;
        el.style.color = color;
        document.body.appendChild(el);
        setTimeout(function () {
            el.remove();
        }, 1000);
    }
}

// setup themes
function changeTheme(themeName) {
    // remove old classes
    document.body.classList.remove('theme-pink');
    document.body.classList.remove('theme-purple');
    document.body.classList.remove('theme-blue');
    document.body.classList.remove('theme-green');
    document.body.classList.remove('theme-orange');

    // add new class
    document.body.classList.add('theme-' + themeName);
    currentThemeColor = themeName;

    // update the little dots
    let dots = document.querySelectorAll('.theme-dot');
    for (let i = 0; i < dots.length; i++) {
        dots[i].classList.remove('active');
        if (dots[i].getAttribute('data-theme') == themeName) {
            dots[i].classList.add('active');
        }
    }
}

function saveMyData() {
    localStorage.setItem('popit-best', myBestScore);
    localStorage.setItem('popit-sound', soundIsOn);
    localStorage.setItem('popit-dark', darkModeIsOn);
    localStorage.setItem('popit-theme', currentThemeColor);
}

// connect buttons
btnPlay.addEventListener('click', toggleStartStop);
btnReset.addEventListener('click', resetTheGame);

btnDark.addEventListener('click', function () {
    if (darkModeIsOn == true) {
        darkModeIsOn = false;
        document.body.classList.remove('dark-mode');
        btnDark.innerText = 'Night';
    } else {
        darkModeIsOn = true;
        document.body.classList.add('dark-mode');
        btnDark.innerText = 'Light';
    }
    saveMyData();
});

btnSound.addEventListener('click', function () {
    if (soundIsOn == true) {
        soundIsOn = false;
        btnSound.innerText = 'Muted';
    } else {
        soundIsOn = true;
        btnSound.innerText = 'Sound';
    }
    saveMyData();
});

// theme dots click
let themeDots = document.querySelectorAll('.theme-dot');
for (let i = 0; i < themeDots.length; i++) {
    themeDots[i].addEventListener('click', function () {
        changeTheme(this.dataset.theme);
        saveMyData();
    });
}

// Easter Egg
let clickCount = 0;

setInterval(function () {
    if (document.body.classList.contains('rainbow-mode') == false) {
        if (Math.random() > 0.5) {
            if (myHint) myHint.classList.add('show');
            setTimeout(function () {
                if (myHint) myHint.classList.remove('show');
            }, 5000);
        }
    }
}, 20000);

myTitle.addEventListener('click', function () {
    clickCount++;
    if (myHint) {
        myHint.classList.remove('show');
    }

    if (clickCount >= 5) {
        if (document.body.classList.contains('rainbow-mode')) {
            document.body.classList.remove('rainbow-mode');
        } else {
            document.body.classList.add('rainbow-mode');
        }
        clickCount = 0;
        playSound('cheer');
        setTimeout(function () { playSound('cheer'); }, 100);
    }
});


// Bunny stuff
let bunnyTimer;

function scheduleBunny() {
    clearTimeout(bunnyTimer);
    let delay = Math.random() * 12000 + 8000;
    bunnyTimer = setTimeout(showBunny, delay);
}

function showBunny(isSad) {
    if (isPlayingGame == false && isSad == true) {
        return;
    }

    bunnyEl.className = '';
    bunnyEl.style.top = 'auto';
    bunnyEl.style.bottom = 'auto';
    bunnyEl.style.left = 'auto';
    bunnyEl.style.right = 'auto';
    bunnyEl.style.transform = '';

    let theFace = document.getElementById('theBunnyFace');
    let randomText = "";

    if (isSad == true) {
        let sadWords = ["Oh no!", "Streak lost...", "Don't give up!", "Oops!", "Aww man!", "Try again!"];
        randomText = sadWords[Math.floor(Math.random() * sadWords.length)];

        theFace.src = "assets/bunny-sad.svg";
    } else {
        if (isPlayingGame == true) {
            let happyWords = ["Good luck!", "You're doing great!", "Ganbare ganbare!", "Machate raho!", "Shabaash!", "Pop 'em all!", "You got this!", "I believe in you!"];
            randomText = happyWords[Math.floor(Math.random() * happyWords.length)];
        } else {
            let idleWords = ["Start fast!", "U lazy as hell", "I'm waiting for u...", "Click Play already!", "Wake up!", "Are we playing or what?", "Boring..."];
            randomText = idleWords[Math.floor(Math.random() * idleWords.length)];
        }

        theFace.src = "assets/bunny-happy.svg";
    }

    speechEl.innerText = randomText;

    let side = Math.floor(Math.random() * 4);
    let randPos = Math.floor(Math.random() * 60) + 20;

    if (side == 0) {
        bunnyEl.classList.add('side-bottom');
        bunnyEl.style.bottom = '-120px';
        bunnyEl.style.left = randPos + '%';
    } else if (side == 1) {
        bunnyEl.classList.add('side-top');
        bunnyEl.style.top = '-120px';
        bunnyEl.style.left = randPos + '%';
    } else if (side == 2) {
        bunnyEl.classList.add('side-left');
        bunnyEl.style.left = '-120px';
        bunnyEl.style.top = randPos + '%';
    } else if (side == 3) {
        bunnyEl.classList.add('side-right');
        bunnyEl.style.right = '-120px';
        bunnyEl.style.top = randPos + '%';
    }

    setTimeout(function () {
        if (side == 0) bunnyEl.style.transform = 'translateY(-110px)';
        if (side == 1) bunnyEl.style.transform = 'translateY(110px)';
        if (side == 2) bunnyEl.style.transform = 'translateX(110px)';
        if (side == 3) bunnyEl.style.transform = 'translateX(-110px)';

        bunnyEl.classList.add('peek');

        if (isSad == true) {
            playSound('miss');
        } else {
            playSound('cheer');
        }
    }, 50);

    bunnyTimer = setTimeout(function () {
        bunnyEl.style.transform = '';
        bunnyEl.classList.remove('peek');
        scheduleBunny();
    }, 3000);
}

function catchTheBunny() {
    if (isPlayingGame == false) return;

    bunnyEl.style.transform = '';
    bunnyEl.classList.remove('peek');
    clearTimeout(bunnyTimer);

    document.getElementById('theBunnyFace').src = 'assets/bunny-happy.svg';

    myScore = myScore + 25;
    if (myScore > myBestScore) {
        myBestScore = myScore;
    }

    scoreDisplay.classList.remove('score-pop');
    setTimeout(function () {
        scoreDisplay.classList.add('score-pop');
    }, 10);

    updateScoreText();
    saveMyData();

    // show text
    let rect = bunnyEl.getBoundingClientRect();
    let popDiv = document.createElement('div');
    popDiv.className = 'pop-text golden-text';
    popDiv.innerText = '+25 BUNNY!';
    popDiv.style.left = (rect.left + rect.width / 2) + 'px';
    popDiv.style.top = rect.top + 'px';
    document.body.appendChild(popDiv);
    setTimeout(function () { popDiv.remove(); }, 800);

    playSound('cheer');
    setTimeout(function () { playSound('cheer'); }, 100);

    scheduleBunny();
}

bunnyEl.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    if (bunnyEl.classList.contains('peek') == false) return;
    catchTheBunny();
});

// run on start
createBoard();
changeTheme(currentThemeColor);

if (darkModeIsOn == true) {
    document.body.classList.add('dark-mode');
    btnDark.innerText = 'Light';
} else {
    btnDark.innerText = 'Night';
}

if (soundIsOn == true) {
    btnSound.innerText = 'Sound';
} else {
    btnSound.innerText = 'Muted';
}

updateScoreText();
scheduleBunny();