// --- 1. 캔버스 및 기본 설정 ---
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-block');
const nextCtx = nextCanvas.getContext('2d');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

// 20행 10열 게임 보드 생성 (0으로 초기화)
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// --- 2. 블록 데이터 및 색상 ---
const COLORS = [
    null,
    '#00FFFF',  // 1: I 블록
    '#0000FF',  // 2: J 블록
    '#FFA500',  // 3: L 블록
    '#FFFF00',  // 4: O 블록
    '#00FF00',  // 5: S 블록
    '#800080',  // 6: T 블록
    '#FF0000'   // 7: Z 블록
];

const SHAPES = {
    I: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    J: [[2,0,0], [2,2,2], [0,0,0]],
    L: [[0,0,3], [3,3,3], [0,0,0]],
    O: [[4,4], [4,4]],
    S: [[0,5,5], [5,5,0], [0,0,0]],
    T: [[0,6,0], [6,6,6], [0,0,0]],
    Z: [[7,7,0], [0,7,7], [0,0,0]]
};

// --- 3. 게임 상태 변수 ---
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

let score = 0;
let stage = 1;
const scoreElement = document.getElementById('score');
const stageElement = document.getElementById('stage');

const player = { pos: { x: 0, y: 0 }, matrix: null };
let nextMatrix = null;

// --- 4. 핵심 기능 (렌더링, 생성, 충돌, 병합, 줄 제거) ---
function getRandomPiece() {
    const pieces = 'IJLOSTZ';
    const type = pieces[Math.floor(Math.random() * pieces.length)];
    return SHAPES[type];
}

function playerReset() {
    if (nextMatrix === null) nextMatrix = getRandomPiece();
    player.matrix = nextMatrix;
    nextMatrix = getRandomPiece();
    
    player.pos.y = 0;
    player.pos.x = Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2);
    drawNext();
}

function drawMatrix(matrix, offset, targetCtx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                targetCtx.fillStyle = COLORS[value];
                targetCtx.fillRect(x + offset.x, y + offset.y, 1, 1);
                targetCtx.lineWidth = 0.05;
                targetCtx.strokeStyle = 'black';
                targetCtx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function drawNext() {
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, 4, 4);
    const offset = {
        x: (4 - nextMatrix[0].length) / 2,
        y: (4 - nextMatrix.length) / 2
    };
    drawMatrix(nextMatrix, offset, nextCtx);
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, COLS, ROWS);
    drawMatrix(board, { x: 0, y: 0 }, ctx);
    drawMatrix(player.matrix, player.pos, ctx);
}

function collide(board, player) {
    const matrix = player.matrix;
    const offset = player.pos;
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < matrix[y].length; ++x) {
            if (matrix[y][x] !== 0 &&
                (!board[y + offset.y] || board[y + offset.y][x + offset.x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function updateScoreDisplay() {
    scoreElement.innerText = score;
    stageElement.innerText = stage;
}

function boardSweep() {
    let linesClearedThisTurn = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) continue outer;
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        linesClearedThisTurn++;
        y++;
    }

    if (linesClearedThisTurn > 0) {
        if (linesClearedThisTurn === 1) score += 100;
        else if (linesClearedThisTurn === 2) score += 300;
        else if (linesClearedThisTurn === 3) score += 500;
        else if (linesClearedThisTurn === 4) score += 800;

        let nextStage = Math.floor(score / 2000) + 1;
        if (nextStage > stage) {
            stage = nextStage;
            dropInterval = Math.max(100, 1000 - (stage - 1) * 100);
        }
        updateScoreDisplay();
    }
}

// --- 5. 플레이어 조작 로직 ---
function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        boardSweep();
        playerReset();
        
        if (collide(board, player)) { // 게임 오버
            board.forEach(row => row.fill(0));
            score = 0; stage = 1; dropInterval = 1000;
            updateScoreDisplay();
        }
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    boardSweep();
    playerReset();
    
    if (collide(board, player)) { // 게임 오버
        board.forEach(row => row.fill(0));
        score = 0; stage = 1; dropInterval = 1000;
        updateScoreDisplay();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) player.pos.x -= dir;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    
    while (collide(board, player)) { // Wall Kick
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

// --- 6. 키보드 이벤트 ---
document.addEventListener('keydown', event => {
    if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault(); // 화면 스크롤 방지
    }
    switch (event.keyCode) {
        case 37: playerMove(-1); break; // 좌측 이동
        case 39: playerMove(1); break;  // 우측 이동
        case 40: playerDrop(); break;   // 소프트 드롭 (아래키)
        case 38: playerRotate(1); break;// 회전 (위키)
        case 32: playerHardDrop(); break;// 하드 드롭 (스페이스바)
    }
});

// --- 7. 게임 루프 및 시작 ---
function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) playerDrop();
    draw();
    requestAnimationFrame(update);
}

// 초기화 및 게임 실행
updateScoreDisplay();
playerReset();
update();