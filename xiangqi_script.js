// --- Declare variables for DOM elements globally but uninitialized ---
let boardElement, resetButton, resignButton, undoButton, redScoreElement, blackScoreElement;
let difficultyModal, startGameButton, modalDifficultyRadios, popupMessageElement, currentDifficultyDisplay;
let aiWorker; // Declare aiWorker here
let aiMoveIndicatorTimeout = null;
let clickSound; // 为音效元素声明变量
let userHasInteracted = false; // 跟踪用户是否已与页面交互

// --- 背景音乐相关变量 ---
let bgMusicElements = []; // 存储所有背景音乐元素
let currentMusicIndex = 0; // 当前播放的音乐索引
let isMusicPlaying = false; // 音乐是否正在播放
let musicToggleButton; // 音乐控制按钮
let musicToggleIcon; // 音乐控制按钮图标
let userPausedMusic = false; // 新增：用户是否主动暂停了音乐

// --- Constants (non-DOM) ---
const ROWS = 10;
const COLS = 9;

const initialBoardSetup = [
    ['BR1','BH1','BE1','BA1','BK' ,'BA2','BE2','BH2','BR2'], // Black pieces
    [],
    ['' ,'' ,'BC1','' ,'' ,'' ,'BC2','' ,'' ],
    ['BP1','' ,'BP2','' ,'BP3','' ,'BP4','' ,'BP5'],
    [], [], // River
    ['RP1','' ,'RP2','' ,'RP3','' ,'RP4','' ,'RP5'], // Red pieces
    ['' ,'' ,'RC1','' ,'' ,'' ,'RC2','' ,'' ],
    [],
    ['RR1','RH1','RE1','RA1','RK' ,'RA2','RE2','RH2','RR2']
];

const pieceChineseNames = {
    'RK': '帅', 'RA': '仕', 'RE': '相', 'RH': '马', 'RR': '车', 'RC': '炮', 'RP': '兵',
    'BK': '将', 'BA': '士', 'BE': '象', 'BH': '馬', 'BR': '車', 'BC': '砲', 'BP': '卒'
};

const pieceValues = {
    'K': 10000, // King (帅/将) - Essential
    'R': 90,    // Chariot (车)
    'H': 40,    // Horse (马)
    'C': 45,    // Cannon (炮)
    'E': 20,    // Elephant (相/象)
    'A': 20,    // Advisor (仕/士)
    'P': 10     // Pawn (兵/卒) - Base value
};
const pawnValueOverRiver = 20; // Pawn value after crossing the river

// --- Global game state variables ---
let boardState = [];
let currentPlayer = 'R';
let selectedPiece = null;
let validMoveMarkers = [];
let redScore = 0;
let blackScore = 0;
let gameOver = false;
let moveHistory = []; 
let currentAIDepth = 2; 
let messageTimeout = null;

// --- Functions ---

function showTemporaryMessage(message, duration = 3000, isError = false) {
    if (popupMessageElement) {
        popupMessageElement.textContent = message;
        popupMessageElement.classList.remove('hidden');
        popupMessageElement.classList.toggle('bg-red-500', isError);
        popupMessageElement.classList.toggle('bg-green-500', !isError);
        popupMessageElement.classList.toggle('text-white', true);

        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }
        messageTimeout = setTimeout(() => {
            popupMessageElement.classList.add('hidden');
        }, duration);
    } else {
        console.error("showTemporaryMessage called, but popupMessageElement is null. Message:", message);
    }
}

function initializeBoardAndGame(resetScores = false) {
    if (!boardElement || !currentDifficultyDisplay || !resetButton || !popupMessageElement) {
        console.error("Cannot initialize board, essential DOM elements missing.");
        // Attempt to show error via console if popupMessageElement itself is missing
        const errorMsg = "错误: 初始化游戏板失败 (关键元素丢失)。";
        if (popupMessageElement) showTemporaryMessage(errorMsg, 5000, true);
        else console.error(errorMsg);
        return;
    }
    gameOver = false;
    currentPlayer = 'R';
    selectedPiece = null;
    if (typeof clearValidMoveMarkers === 'function') clearValidMoveMarkers();
    moveHistory = []; 
    
    if (boardElement.querySelectorAll('.square').length === 0) {
    const oldPalaceLines = boardElement.querySelectorAll('.palace-line');
    oldPalaceLines.forEach(line => line.remove());
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.dataset.row = r;
                square.dataset.col = c;
                square.addEventListener('click', () => onSquareClick(r, c));
                const riverOverlay = boardElement.querySelector('.river-overlay');
                if (riverOverlay) {
                    boardElement.insertBefore(square, riverOverlay);
                } else {
                    console.warn("River overlay not found, appending square directly to board.");
                    boardElement.appendChild(square); 
                }
            }
        }
    }

    boardState = JSON.parse(JSON.stringify(initialBoardSetup)).map(row => {
        const fullRow = new Array(COLS).fill(null);
        row.forEach((piece, i) => { if (piece) fullRow[i] = piece; });
        return fullRow;
    });

    if (typeof renderBoardFromState === 'function') renderBoardFromState();
    if (typeof drawPalaceLines === 'function') setTimeout(drawPalaceLines, 50);

    showTemporaryMessage(currentPlayer === 'R' ? "红方先行" : "黑方先行", 2000);
    resetButton.textContent = '重新开始';
    boardElement.style.pointerEvents = 'auto'; 

    if (resetScores) {
        redScore = 0;
        blackScore = 0;
    }
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();

    let difficultyText = '未知';
    if (currentAIDepth === 2) difficultyText = '易';
    else if (currentAIDepth === 3) difficultyText = '中';
    else if (currentAIDepth === 4) difficultyText = '难';
    currentDifficultyDisplay.textContent = `当前难度: ${difficultyText}`;
}

function renderBoardFromState() {
    if (!boardElement) {
        console.error("renderBoardFromState: boardElement is null.");
        return;
    }
    const existingPieces = boardElement.querySelectorAll('.piece');
    existingPieces.forEach(p => p.remove());
    if (typeof clearValidMoveMarkers === 'function') clearValidMoveMarkers();

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const pieceId = boardState[r][c];
            if (pieceId) {
                if (typeof createPieceElement === 'function') createPieceElement(pieceId, r, c);
            }
        }
    }
}

function createPieceElement(pieceId, row, col) {
    if (!boardElement) {
        console.error("createPieceElement: boardElement is null.");
        return;
    }
    const pieceElement = document.createElement('div');
    pieceElement.classList.add('piece');
    const pieceType = pieceId.substring(0,2); 
    const pieceSide = pieceId.charAt(0); 

    pieceElement.classList.add(pieceSide === 'R' ? 'red-piece' : 'black-piece');
    pieceElement.textContent = pieceChineseNames[pieceType] || pieceType[1]; 
    pieceElement.dataset.piece = pieceId;
    
    const squareElement = boardElement.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
    if (squareElement) {
        const existingPiece = squareElement.querySelector('.piece');
        if (existingPiece) existingPiece.remove();
        squareElement.appendChild(pieceElement);
    } else {
        console.warn(`createPieceElement: square not found for row ${row}, col ${col}`);
    }
}

function drawPalaceLines() {
    if (!boardElement) {
        console.error("drawPalaceLines: boardElement is null.");
        return;
    }
    const oldLines = boardElement.querySelectorAll('.palace-line');
    oldLines.forEach(line => line.remove());
    const firstSquare = boardElement.querySelector('.square');
    if (!firstSquare || firstSquare.offsetWidth === 0) {
        setTimeout(drawPalaceLines, 50); 
        return;
    }
    if (typeof drawLine === 'function') {
      drawLine(7, 3, 9, 5); drawLine(7, 5, 9, 3); 
      drawLine(0, 3, 2, 5); drawLine(0, 5, 2, 3); 
    }
}

function drawLine(r1, c1, r2, c2) {
    if (!boardElement) {
        console.error("drawLine: boardElement is null.");
        return;
    }
    const startSquare = boardElement.querySelector(`.square[data-row='${r1}'][data-col='${c1}']`);
    const endSquare = boardElement.querySelector(`.square[data-row='${r2}'][data-col='${c2}']`);
    if (!startSquare || !endSquare) {
        console.warn(`drawLine: start or end square not found for (${r1},${c1}) to (${r2},${c2})`);
        return; 
    }
    const squareSize = startSquare.offsetWidth; 
    if (squareSize === 0) return; 
    const line = document.createElement('div');
    line.classList.add('palace-line');
    const x1 = startSquare.offsetLeft + squareSize / 2;
    const y1 = startSquare.offsetTop + squareSize / 2;
    const x2 = endSquare.offsetLeft + squareSize / 2;
    const y2 = endSquare.offsetTop + squareSize / 2;
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    line.style.width = `${length}px`;
    line.style.height = '2px'; 
    line.style.top = `${y1}px`;
    line.style.left = `${x1}px`;
    line.style.transformOrigin = '0 0';
    line.style.transform = `rotate(${angle}deg)`;
    boardElement.appendChild(line);
}

function updateScoreDisplay() {
    if (redScoreElement) redScoreElement.textContent = redScore;
    else console.warn("updateScoreDisplay: redScoreElement is null.");
    if (blackScoreElement) blackScoreElement.textContent = blackScore;
    else console.warn("updateScoreDisplay: blackScoreElement is null.");
}

function onSquareClick(row, col) {
    if (gameOver) return;
    // 添加检查：如果当前是黑方(AI)回合，不允许用户操作
    if (currentPlayer === 'B') {
        showTemporaryMessage("请等待黑方(AI)思考完成", 1500, true);
        return;
    }
    if (typeof clearValidMoveMarkers === 'function') clearValidMoveMarkers();
    const pieceId = boardState[row][col];

    if (selectedPiece) {
        const targetPieceId = boardState[row][col];
        if (isMoveLegal(selectedPiece.row, selectedPiece.col, row, col, selectedPiece.piece)) {
            if (targetPieceId && targetPieceId.charAt(0) === selectedPiece.piece.charAt(0)) {
                if (typeof selectPiece === 'function') selectPiece(row, col, pieceId);
            } else {
                if (typeof movePiece === 'function') movePiece(selectedPiece.row, selectedPiece.col, row, col);
            }
        } else if (pieceId && pieceId.charAt(0) === currentPlayer) {
            if (typeof selectPiece === 'function') selectPiece(row, col, pieceId);
        }
    } else if (pieceId && pieceId.charAt(0) === currentPlayer) {
        if (typeof selectPiece === 'function') selectPiece(row, col, pieceId);
    }
}

function selectPiece(row, col, pieceId) {
    if (!boardElement) {
        console.error("selectPiece: boardElement is null.");
        return;
    }
    if (selectedPiece) {
        const prevSquare = boardElement.querySelector(`.square[data-row='${selectedPiece.row}'][data-col='${selectedPiece.col}']`);
        if (prevSquare) {
            const prevPieceEl = prevSquare.querySelector('.piece');
            if (prevPieceEl) prevPieceEl.classList.remove('selected');
        }
    }
    selectedPiece = { piece: pieceId, row: row, col: col };
    const currentSquare = boardElement.querySelector(`.square[data-row='${row}'][data-col='${col}']`);
    if (currentSquare) {
        const pieceElement = currentSquare.querySelector('.piece');
        if (pieceElement) pieceElement.classList.add('selected');
    }
    if (typeof showValidMoves === 'function') showValidMoves(row, col, pieceId);
}

function showValidMoves(r, c, pieceId) {
    if (!boardElement) {
        console.error("showValidMoves: boardElement is null.");
        return;
    }
    if (typeof clearValidMoveMarkers === 'function') clearValidMoveMarkers();
    for (let tr = 0; tr < ROWS; tr++) {
        for (let tc = 0; tc < COLS; tc++) {
            if (isMoveLegal(r, c, tr, tc, pieceId)) {
                const targetSquare = boardElement.querySelector(`.square[data-row='${tr}'][data-col='${tc}']`);
                if (targetSquare) {
                    const marker = document.createElement('div');
                    marker.classList.add('valid-move');
                    targetSquare.appendChild(marker);
                    validMoveMarkers.push(marker);
                }
            }
        }
    }
}

function clearValidMoveMarkers() {
    validMoveMarkers.forEach(marker => marker.remove());
    validMoveMarkers = [];
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    if (gameOver || !boardElement) {
        console.warn("movePiece: Game over or boardElement is null.");
        return;
    }
    
    // 标记用户已交互，可以播放音乐
    userHasInteracted = true;
    
    // 只有在用户没有主动暂停音乐的情况下才自动播放
    if (!isMusicPlaying && !gameOver && !userPausedMusic) {
        playBackgroundMusic();
    }
    
    const pieceId = boardState[fromRow][fromCol];
    const capturedPieceId = boardState[toRow][toCol];
    moveHistory.push({
        boardState: JSON.parse(JSON.stringify(boardState)), 
        currentPlayer: currentPlayer, 
        capturedPieceId: capturedPieceId,
    });
    boardState[toRow][toCol] = pieceId;
    boardState[fromRow][fromCol] = null;
    const fromSquare = boardElement.querySelector(`.square[data-row='${fromRow}'][data-col='${fromCol}']`);
    const toSquare = boardElement.querySelector(`.square[data-row='${toRow}'][data-col='${toCol}']`);
    if (capturedPieceId) {
        const capturedPieceElement = toSquare ? toSquare.querySelector('.piece') : null;
        if (capturedPieceElement) capturedPieceElement.remove();
    }
    if (fromSquare) {
        const pieceElement = fromSquare.querySelector('.piece');
        if (pieceElement) {
            pieceElement.classList.remove('selected');
            if (toSquare) toSquare.appendChild(pieceElement);
        }
    } else { 
         if (typeof createPieceElement === 'function') createPieceElement(pieceId, toRow, toCol);
    }
    selectedPiece = null; 
    if (capturedPieceId) {
        const capturedPieceType = capturedPieceId.substring(0, 2);
        if (capturedPieceType === 'BK') { if (typeof endGame === 'function') endGame('R', '黑方【将】被吃'); return; }
        if (capturedPieceType === 'RK') { if (typeof endGame === 'function') endGame('B', '红方【帅】被吃'); return; }
    }
    const opponentSide = currentPlayer === 'R' ? 'B' : 'R';
    if (isCheckmate(opponentSide)) { if (typeof endGame === 'function') endGame(currentPlayer, `${opponentSide === 'R' ? '红方' : '黑方'}被将死`); return; }
    if (isStalemate(opponentSide)) { if (typeof endGame === 'function') endGame(currentPlayer, `${opponentSide === 'R' ? '红方' : '黑方'}无棋可走 (困毙)`); return; }
    if (typeof switchPlayer === 'function') switchPlayer();

    // 播放落子音效
    if (clickSound) {
        clickSound.currentTime = 0; // 从头播放，以防快速操作
        clickSound.play().catch(error => console.warn("Audio play failed:", error)); // 添加catch以处理可能的播放错误
    }
}

function endGame(winner, reason) {
    if (!resetButton || !boardElement || !popupMessageElement) {
        console.error("endGame: Essential DOM elements missing (resetButton, boardElement, or popupMessageElement).");
        return;
    }
    
    // 如果AI工作线程还在运行，终止它
    if (aiWorker) {
        aiWorker.terminate();
        aiWorker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
        setupAIWorker(); // 重新设置AI Worker监听器
    }
    
    gameOver = true;
    let winnerText = ''; 
    let scoreMsg = '';
    
    if (winner === 'R') { 
        redScore++; 
        winnerText = '红方胜利'; 
        scoreMsg = '红方得1分'; 
        
        // 更新分数显示
        if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
        
        // 提示用户重置棋盘中
        showTemporaryMessage(`恭喜${winnerText}！${reason}。(${scoreMsg}) 重置棋盘中...`, 2000);
        
        // 延迟1.5秒后重置棋盘并开始新局
        setTimeout(() => {
            // 重置棋盘但不重置分数
            if (typeof initializeBoardAndGame === 'function') {
                initializeBoardAndGame(false);
            }
            
            // 红方先手
            currentPlayer = 'R';
            gameOver = false;
            
            // 更新回合信息
            if (typeof updateTurnMessage === 'function') {
                updateTurnMessage();
            }
            
            // 解锁棋盘让红方可以操作
            if (boardElement) {
                boardElement.style.pointerEvents = 'auto';
            }
            
            // 设置按钮文本为"重新开始"
            if(resetButton) resetButton.textContent = '重新开始';
        }, 1500);
        
    } else if (winner === 'B') { 
        blackScore++; 
        winnerText = '黑方胜利'; 
        scoreMsg = '黑方得1分'; 
        
        // 更新分数显示
        if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
        
        // 提示用户重置棋盘中
        showTemporaryMessage(`${winnerText}！${reason}。(${scoreMsg}) 重置棋盘中...`, 2000);
        
        // 延迟1.5秒后重置棋盘并开始新局，黑方先行
        setTimeout(() => {
            // 重置棋盘但不重置分数
            if (typeof initializeBoardAndGame === 'function') {
                initializeBoardAndGame(false);
            }
            
            // 黑方先手
            currentPlayer = 'B';
            gameOver = false;
            
            // 更新回合信息
            if (typeof updateTurnMessage === 'function') {
                updateTurnMessage();
            }
            
            // 锁定棋盘，等待黑方(AI)落子
            if (boardElement) {
                boardElement.style.pointerEvents = 'none';
            }
            
            // 设置按钮文本为"重新开始"
            if(resetButton) resetButton.textContent = '重新开始';
            
            // 提示黑方思考中
            showTemporaryMessage("黑方思考中...", 1500);
            
            // 延迟一下再让AI走棋，确保界面更新完成
            setTimeout(() => {
                if (typeof makeAIMove === 'function' && !gameOver && aiWorker) {
                    makeAIMove();
                }
            }, 500);
        }, 1500);
        
    } else { 
        winnerText = '平局';
        // 更清晰地提示用户可以再来一盘
        showTemporaryMessage(`${winnerText}！${reason}。点击"再来一盘"开始新游戏`, 5000);
        resetButton.textContent = '再来一盘';
        
        // 解除棋盘锁定，让用户可以点击"再来一盘"按钮
        boardElement.style.pointerEvents = 'none';
        
        // 高亮"再来一盘"按钮以引导用户点击
        if (resetButton) {
            resetButton.classList.add('highlight-button');
            // 5秒后移除高亮，避免长时间干扰
            setTimeout(() => {
                resetButton.classList.remove('highlight-button');
            }, 5000);
        }
    }
}

function switchPlayer() {
    if (gameOver) return;
    currentPlayer = (currentPlayer === 'R' ? 'B' : 'R');
    
    // 根据当前玩家更新棋盘交互状态
    if (boardElement) {
        if (currentPlayer === 'B') {
            // 黑方(AI)回合，锁定棋盘
            boardElement.style.pointerEvents = 'none';
        } else {
            // 红方回合，解锁棋盘
            boardElement.style.pointerEvents = 'auto';
        }
    }
    
    if (typeof updateTurnMessage === 'function') updateTurnMessage();
    if (currentPlayer === 'B' && !gameOver && aiWorker) { 
        showTemporaryMessage("黑方思考中...", 1500);
        setTimeout(makeAIMove, 500); 
    }
}

function updateTurnMessage() {
    if (!gameOver) { 
        showTemporaryMessage(`轮到 ${currentPlayer === 'R' ? '红方' : '黑方'} 行动`); 
    }
}

function isMoveLegal(fromRow, fromCol, toRow, toCol, pieceId) {
    if (!isValidBaseMove(fromRow, fromCol, toRow, toCol, pieceId)) return false;
    const side = pieceId.charAt(0);
    const originalDestPiece = boardState[toRow][toCol];
    boardState[toRow][toCol] = pieceId; 
    boardState[fromRow][fromCol] = null;
    const selfInCheck = isKingInCheck(side);
    boardState[fromRow][fromCol] = pieceId; 
    boardState[toRow][toCol] = originalDestPiece;
    return !selfInCheck;
}

function isValidBaseMove(fromRow, fromCol, toRow, toCol, pieceId) {
    const pieceType = pieceId.substring(1,2); 
    const side = pieceId.charAt(0); 
    if (fromRow === toRow && fromCol === toCol) return false;
    const targetPieceId = boardState[toRow][toCol];
    if (targetPieceId && targetPieceId.charAt(0) === side) return false;
    if (toRow < 0 || toRow >= ROWS || toCol < 0 || toCol >= COLS) return false;
    switch (pieceType) {
        case 'K': return isValidKingMove(fromRow, fromCol, toRow, toCol, side);
        case 'A': return isValidAdvisorMove(fromRow, fromCol, toRow, toCol, side);
        case 'E': return isValidElephantMove(fromRow, fromCol, toRow, toCol, side);
        case 'H': return isValidHorseMove(fromRow, fromCol, toRow, toCol, side);
        case 'R': return isValidChariotMove(fromRow, fromCol, toRow, toCol, side);
        case 'C': return isValidCannonMove(fromRow, fromCol, toRow, toCol, side);
        case 'P': return isValidPawnMove(fromRow, fromCol, toRow, toCol, side);
        default: return false;
    }
}

function isInPalace(row, col, side) {
    if (col < 3 || col > 5) return false;
    if (side === 'R') return row >= 7 && row <= 9;
    if (side === 'B') return row >= 0 && row <= 2;
    return false;
}

function isValidKingMove(r1, c1, r2, c2, side) {
    if (!isInPalace(r2, c2, side)) return false;
    const dr = Math.abs(r1 - r2); 
    const dc = Math.abs(c1 - c2);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function isValidAdvisorMove(r1, c1, r2, c2, side) {
    if (!isInPalace(r2, c2, side)) return false;
    return Math.abs(r1 - r2) === 1 && Math.abs(c1 - c2) === 1;
}

function isValidElephantMove(r1, c1, r2, c2, side) {
    if (!(Math.abs(r1 - r2) === 2 && Math.abs(c1 - c2) === 2)) return false;
    if ((side === 'R' && r2 < 5) || (side === 'B' && r2 > 4)) return false; 
    if (boardState[r1 + (r2 - r1) / 2][c1 + (c2 - c1) / 2]) return false;
    return true;
}

function isValidHorseMove(r1, c1, r2, c2, side) {
    const dr = Math.abs(r1 - r2); 
    const dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 2) || (dr === 2 && dc === 1))) return false; 
    if (dr === 2) { 
        if (boardState[r1 + (r2 - r1) / 2][c1]) return false;
    } else { 
        if (boardState[r1][c1 + (c2 - c1) / 2]) return false;
    }
    return true;
}

function isValidChariotMove(r1, c1, r2, c2, side) {
    if (r1 !== r2 && c1 !== c2) return false; 
    if (r1 === r2) { 
        for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) if (boardState[r1][c]) return false;
    } else { 
        for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) if (boardState[r][c1]) return false;
    }
    return true;
}

function isValidCannonMove(r1, c1, r2, c2, side) {
    if (r1 !== r2 && c1 !== c2) return false; 
    let piecesInBetween = 0;
    if (r1 === r2) { 
        for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) if (boardState[r1][c]) piecesInBetween++;
    } else { 
        for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) if (boardState[r][c1]) piecesInBetween++;
    }
    if (boardState[r2][c2]) return piecesInBetween === 1; 
    return piecesInBetween === 0; 
}

function isValidPawnMove(r1, c1, r2, c2, side) {
    const dr = r2 - r1; 
    const dc = c2 - c1; 
    if (side === 'R') { 
        if (r1 > 4) { 
            return dr === -1 && dc === 0; 
        } else { 
            return (dr === -1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1); 
        }
    } else { 
        if (r1 < 5) { 
            return dr === 1 && dc === 0; 
        } else { 
            return (dr === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1); 
        }
    }
}

function makeAIMove() {
    if (gameOver || currentPlayer !== 'B' || !aiWorker) {
        console.warn("makeAIMove: Conditions not met or AI worker not available.");
        return;
    }
    aiWorker.postMessage({
        type: 'findBestMove',
        boardState: boardState,
        depth: currentAIDepth 
    });
}

function findKingPosition(side) {
    const kingType = side === 'R' ? 'RK' : 'BK';
    for (let r = 0; r < ROWS; r++) { 
        for (let c = 0; c < COLS; c++) {
            if (boardState[r][c] && boardState[r][c].substring(0,2) === kingType) {
                return {r, c}; 
            }
        }
    }
    return null; 
}

function isKingInCheck(kingSide) {
    const kingPos = findKingPosition(kingSide); 
    if (!kingPos) return true; 
    const opponentSide = kingSide === 'R' ? 'B' : 'R';
    for (let r = 0; r < ROWS; r++) { 
        for (let c = 0; c < COLS; c++) {
            const pieceId = boardState[r][c];
            if (pieceId && pieceId.charAt(0) === opponentSide) {
                if (isValidBaseMove(r, c, kingPos.r, kingPos.c, pieceId)) {
                    if (pieceId.substring(1,2) !== 'K') {
                        return true; 
                    }
                }
            }
        }
    }
    const opponentKingPos = findKingPosition(opponentSide);
    if (opponentKingPos && kingPos.c === opponentKingPos.c) { 
        let piecesBetween = false;
        for (let r_path = Math.min(kingPos.r, opponentKingPos.r) + 1; r_path < Math.max(kingPos.r, opponentKingPos.r); r_path++) {
            if (boardState[r_path][kingPos.c]) { 
                piecesBetween = true; 
                break; 
            }
        }
        if (!piecesBetween) return true; 
    }
    return false;
}

function hasAnyLegalMove(side) {
    for (let r_f = 0; r_f < ROWS; r_f++) { 
        for (let c_f = 0; c_f < COLS; c_f++) {
            const pieceId = boardState[r_f][c_f];
            if (pieceId && pieceId.charAt(0) === side) {
                for (let r_t = 0; r_t < ROWS; r_t++) { 
                    for (let c_t = 0; c_t < COLS; c_t++) {
                        if (isMoveLegal(r_f, c_f, r_t, c_t, pieceId)) return true;
                    } 
                }
            }
        } 
    } 
    return false;
}

function isCheckmate(kingSide) { 
    return isKingInCheck(kingSide) && !hasAnyLegalMove(kingSide); 
}
function isStalemate(side) { 
    return !isKingInCheck(side) && !hasAnyLegalMove(side); 
}

function handleResign() {
    console.log(`[handleResign] Called. Current player at start of resign: ${currentPlayer}`);
    gameOver = true; // 立即将游戏标记为结束，以防止旧AI Worker的移动被处理

    const resigningPlayerSide = 'R'; 
    const winnerSide = 'B';        
    const winnerName = winnerSide === 'R' ? '红方' : '黑方';

    console.log(`[handleResign] User (Red) is resigning. Winner: ${winnerSide}`);

    blackScore++;
    console.log(`[handleResign] Black score incremented to: ${blackScore}`);
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();

    if (aiWorker) {
        console.log("[handleResign] Terminating existing AI worker...");
        aiWorker.onmessage = null; // 关键：在terminate前移除消息处理器
        aiWorker.terminate();
        
        console.log("[handleResign] Creating new AI worker...");
        aiWorker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
        if (typeof setupAIWorker === 'function') {
            setupAIWorker(); 
            console.log("[handleResign] New AI worker setup complete.");
        } else {
            console.error("[handleResign] setupAIWorker function is not defined!");
        }
    } else {
        console.log("[handleResign] No AI worker instance to terminate/recreate.");
    }

    showTemporaryMessage(`重置棋盘中，${winnerName}先行...`, 1500);

    setTimeout(() => {
        console.log("[handleResign setTimeout] Starting delayed operations.");
        if (typeof initializeBoardAndGame === 'function') {
            initializeBoardAndGame(false); 
        }

        currentPlayer = winnerSide; 
        gameOver = false; // 为新的一局重置gameOver状态
        console.log(`[handleResign setTimeout] Next turn player set to: ${currentPlayer}, gameOver reset to false.`);

        showTemporaryMessage(`红方主动认输。黑方得1分。`, 3000);

        if (typeof updateTurnMessage === 'function') {
            updateTurnMessage(); 
        }

        if (boardElement) {
            boardElement.style.pointerEvents = 'none'; 
            if (aiWorker) { 
                console.log("[handleResign setTimeout] AI's turn (B). Preparing to make AI move for the new game.");
                showTemporaryMessage("黑方思考中...", 1500); 
                if (typeof makeAIMove === 'function') setTimeout(makeAIMove, 500); 
            } else {
                 console.error("[handleResign setTimeout] AI's turn, but AI worker is null!");
            }
        }
        
        if(resetButton) resetButton.textContent = '重新开始';
        console.log("[handleResign setTimeout] Delayed operations complete.");
    }, 1500); 
}

// 在 setupAIWorker 的 onmessage 中也加日志和gameOver检查
function setupAIWorker() {
    if (!aiWorker) {
        console.error("[setupAIWorker] aiWorker is null, cannot set onmessage.");
        return;
    }
    console.log("[setupAIWorker] Setting up onmessage for current AI worker instance.");
    aiWorker.onmessage = function(e) {
        const { type, move } = e.data;
        console.log(`[aiWorker.onmessage] Received message: type=${type}`, move);

        if (gameOver && type === 'bestMove') {
            console.warn("[aiWorker.onmessage] Game is over (gameOver=true), but received a 'bestMove'. Ignoring move from worker.");
            return; 
        }

        if (type === 'bestMove' && move) {
            // 确保当前轮到AI (黑方)
            if (currentPlayer !== 'B') {
                console.warn(`[aiWorker.onmessage] Received 'bestMove' but current player is ${currentPlayer}, not 'B'. Ignoring.`);
                return;
            }
            if (typeof movePiece === 'function') {
                console.log("[aiWorker.onmessage] Processing 'bestMove'. Calling movePiece.");
                movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
                if (typeof drawAIMoveIndicator === 'function') {
                    drawAIMoveIndicator(move.fromRow, move.fromCol, move.toRow, move.toCol);
                }
            } else {
                console.error("[aiWorker.onmessage] movePiece function is not defined.");
            }
        }
    };
}

function handleUndoMove() {
    if (gameOver) {
        showTemporaryMessage("游戏已结束，无法悔棋。", 3000, true);
        return;
    }
    // 添加检查：如果当前是黑方(AI)回合，不允许悔棋
    if (currentPlayer === 'B') {
        showTemporaryMessage("AI思考中，请稍等...", 2000, true);
        return;
    }
    if (moveHistory.length < 2) { 
        showTemporaryMessage("无法悔棋，历史记录不足两步。", 3000, true);
        return;
    }
    moveHistory.pop(); 
    const lastPlayerMoveState = moveHistory.pop();
    if (lastPlayerMoveState) {
        boardState = JSON.parse(JSON.stringify(lastPlayerMoveState.boardState));
        currentPlayer = lastPlayerMoveState.currentPlayer;
        if (typeof renderBoardFromState === 'function') renderBoardFromState();
        selectedPiece = null;
        gameOver = false;
        if (boardElement) boardElement.style.pointerEvents = 'auto';
        else console.warn("handleUndoMove: boardElement is null.");
        if (typeof updateTurnMessage === 'function') updateTurnMessage();
        showTemporaryMessage("悔棋成功。轮到 " + (currentPlayer === 'R' ? '红方' : '黑方') + " 行动。");
    } else {
        showTemporaryMessage("悔棋失败，历史记录异常。", 3000, true);
    }
}

// --- AI Move Indicator Function ---
function drawAIMoveIndicator(fromRow, fromCol, toRow, toCol) {
    if (!boardElement) return;

    const existingIndicator = document.getElementById('aiMoveIndicator');
    if (existingIndicator) {
        existingIndicator.remove();
        if (aiMoveIndicatorTimeout) {
            clearTimeout(aiMoveIndicatorTimeout);
        }
    }

    const fromSquare = boardElement.querySelector(`.square[data-row='${fromRow}'][data-col='${fromCol}']`);
    const toSquare = boardElement.querySelector(`.square[data-row='${toRow}'][data-col='${toCol}']`);

    if (!fromSquare || !toSquare) {
        console.warn("drawAIMoveIndicator: fromSquare or toSquare not found.");
        return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const fromRect = fromSquare.getBoundingClientRect();
    const toRect = toSquare.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
    const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
    const x2 = toRect.left + toRect.width / 2 - boardRect.left;
    const y2 = toRect.top + toRect.height / 2 - boardRect.top;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "aiMoveIndicator");
    svg.style.position = "absolute";
    svg.style.left = `${boardRect.left + window.scrollX}px`;
    svg.style.top = `${boardRect.top + window.scrollY}px`;
    svg.style.width = `${boardRect.width}px`;
    svg.style.height = `${boardRect.height}px`;
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "10";

    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "6");      // 缩小: 12 -> 6
    marker.setAttribute("markerHeight", "4.2");   // 缩小: 8.4 -> 4.2
    marker.setAttribute("refX", "6");          // 缩小: 12 -> 6 (与 markerWidth 匹配)
    marker.setAttribute("refY", "2.1");       // 缩小: 4.2 -> 2.1 (与 markerHeight/2 匹配)
    marker.setAttribute("orient", "auto-start-reverse");

    const polygon = document.createElementNS(svgNS, "polygon");
    // 更新 polygon 点以适应新的 markerWidth/Height
    polygon.setAttribute("points", "0 0, 6 2.1, 0 4.2"); // 缩小: 0 0, 12 4.2, 0 8.4 -> 0 0, 6 2.1, 0 4.2
    polygon.style.fill = "rgba(0, 0, 139, 0.9)"; // 深蓝色
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", x1.toString());
    line.setAttribute("y1", y1.toString());
    line.setAttribute("x2", x2.toString());
    line.setAttribute("y2", y2.toString());
    line.style.stroke = "rgba(0, 0, 139, 0.9)"; // 深蓝色
    line.style.strokeWidth = "5"; // 线条粗细保持不变
    line.setAttribute("marker-end", "url(#arrowhead)");
    svg.appendChild(line);

    document.body.appendChild(svg); 

    aiMoveIndicatorTimeout = setTimeout(() => {
        svg.remove();
    }, 2500);
}

// --- 背景音乐控制函数 ---
function initBackgroundMusic() {
    // 初始化背景音乐元素数组
    bgMusicElements = [
        document.getElementById('bgMusic1'),
        document.getElementById('bgMusic2'),
        document.getElementById('bgMusic3'),
        document.getElementById('bgMusic4')
    ];
    
    // 检查是否所有元素都存在
    const allElementsExist = bgMusicElements.every(el => el !== null);
    if (!allElementsExist) {
        console.error("一个或多个背景音乐元素未找到");
        return;
    }
    
    // 为每个音乐元素添加结束事件监听器，以实现随机播放下一首
    bgMusicElements.forEach((music, index) => {
        music.addEventListener('ended', () => {
            if (isMusicPlaying) {
                playRandomTrack();
            }
        });
    });
    
    // 初始化音乐控制按钮
    musicToggleButton = document.getElementById('musicToggleButton');
    musicToggleIcon = document.getElementById('musicToggleIcon');
    
    if (musicToggleButton && musicToggleIcon) {
        musicToggleButton.addEventListener('click', toggleBackgroundMusic);
    } else {
        console.error("音乐控制按钮元素未找到");
    }

    // 初始时随机选择一首歌曲
    currentMusicIndex = getRandomMusicIndex();
    
    // 如果用户已交互且未主动暂停音乐，尝试自动播放
    if (userHasInteracted && !userPausedMusic) {
        console.log("尝试自动播放初始音乐");
        setTimeout(() => playBackgroundMusic(), 1000);
    }
}

function playBackgroundMusic() {
    // 停止所有其他音乐
    bgMusicElements.forEach((music, idx) => {
        if (idx !== currentMusicIndex) {
            music.pause();
            music.currentTime = 0;
        }
    });
    
    // 播放当前音乐
    const currentMusic = bgMusicElements[currentMusicIndex];
    if (currentMusic) {
        // 检查浏览器是否允许自动播放
        const playPromise = currentMusic.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                isMusicPlaying = true;
                if (musicToggleIcon) musicToggleIcon.textContent = '🔊';
            }).catch(error => {
                console.warn("无法自动播放背景音乐:", error);
                isMusicPlaying = false;
                if (musicToggleIcon) musicToggleIcon.textContent = '🔇';
                
                // 如果是因为用户交互问题，等待用户交互后再尝试
                if (!userHasInteracted) {
                    showTemporaryMessage("点击棋盘或按钮以启用背景音乐", 3000);
                }
            });
        }
    }
}

// 获取一个随机的音乐索引（确保不会连续播放相同的歌曲）
function getRandomMusicIndex() {
    if (bgMusicElements.length <= 1) return 0;
    
    // 如果当前没有播放音乐（初始状态），直接返回随机索引
    if (!isMusicPlaying) {
        return Math.floor(Math.random() * bgMusicElements.length);
    }
    
    // 如果正在播放，则选择一个不同于当前播放索引的随机索引
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * bgMusicElements.length);
    } while (newIndex === currentMusicIndex);
    
    return newIndex;
}

// 播放随机歌曲
function playRandomTrack() {
    // 暂停当前音乐
    if (bgMusicElements[currentMusicIndex]) {
        bgMusicElements[currentMusicIndex].pause();
        bgMusicElements[currentMusicIndex].currentTime = 0;
    }
    
    // 随机选择一首新的音乐
    currentMusicIndex = getRandomMusicIndex();
    
    // 播放新的音乐
    playBackgroundMusic();
}

function pauseBackgroundMusic() {
    // 暂停当前播放的音乐
    const currentMusic = bgMusicElements[currentMusicIndex];
    if (currentMusic) {
        currentMusic.pause();
    }
    isMusicPlaying = false;
    userPausedMusic = true; // 标记用户已主动暂停音乐
    if (musicToggleIcon) musicToggleIcon.textContent = '🔇';
}

function toggleBackgroundMusic() {
    if (isMusicPlaying) {
        pauseBackgroundMusic();
        showTemporaryMessage("背景音乐已暂停", 1500);
    } else {
        userPausedMusic = false; // 用户重新开启音乐，清除暂停标记
        playBackgroundMusic();
        showTemporaryMessage("背景音乐已开启", 1500);
    }
}

// --- Event Listeners & Initial Game Setup ---
window.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element variables here
    boardElement = document.getElementById('board');
    resetButton = document.getElementById('resetButton');
    resignButton = document.getElementById('resignButton'); 
    undoButton = document.getElementById('undoButton');   
    redScoreElement = document.getElementById('redScoreDisplay');
    blackScoreElement = document.getElementById('blackScoreDisplay');
    
    difficultyModal = document.getElementById('difficultyModal');
    startGameButton = document.getElementById('startGameButton');
    modalDifficultyRadios = document.querySelectorAll('input[name="modalDifficulty"]');
    popupMessageElement = document.getElementById('popupMessage');
    currentDifficultyDisplay = document.getElementById('currentDifficultyDisplay');
    clickSound = document.getElementById('clickSound');

    // 初始化背景音乐
    initBackgroundMusic();

    // Initialize AI Worker here
    aiWorker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
    setupAIWorker(); // 使用新的setupAIWorker函数来设置AI Worker监听器
    
    // Fallback error message if popup itself is missing during critical init.
    const CRITICAL_INIT_ERROR_MSG = "错误：界面关键元素丢失，无法启动或重置游戏。";

    // Show difficulty modal on page load
    if (difficultyModal) {
        difficultyModal.classList.remove('hidden');
    } else {
        console.error("CRITICAL: Difficulty modal element not found in DOM. Attempting to start with default settings.");
        if (boardElement && popupMessageElement && currentDifficultyDisplay && resetButton) {
             initializeBoardAndGame(true);
        } else {
            console.error("Cannot initialize game due to missing essential DOM elements (fallback path).");
            if(popupMessageElement) showTemporaryMessage(CRITICAL_INIT_ERROR_MSG, 5000, true);
            else console.error(CRITICAL_INIT_ERROR_MSG + " (popupMessageElement also missing)");
        }
    }

    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            modalDifficultyRadios.forEach(radio => {
                if (radio.checked) {
                    currentAIDepth = parseInt(radio.value);
                }
            });
            if (difficultyModal) {
                difficultyModal.classList.add('hidden');
            }
            
            userHasInteracted = true; // 标记用户已交互
            userPausedMusic = false;  // 重置用户暂停状态，确保可以播放音乐
            
            // 用户已交互，尝试播放背景音乐
            if (!isMusicPlaying) {
                playBackgroundMusic();
            }
            
            if (boardElement && popupMessageElement && currentDifficultyDisplay && resetButton) {
                initializeBoardAndGame(true); 
            } else {
                 console.error("Cannot start game after modal due to missing essential DOM elements.");
                 if(popupMessageElement) showTemporaryMessage(CRITICAL_INIT_ERROR_MSG, 5000, true);
                 else console.error(CRITICAL_INIT_ERROR_MSG + " (popupMessageElement also missing)");
            }
        });
    } else {
        console.error("CRITICAL: Start game button ('startGameButton') not found in DOM.");
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => { 
            console.log("[resetButton] Clicked.");
            gameOver = true; // 立即将游戏标记为结束，以防止AI Worker的移动被处理

            // 终止并重新创建AI Worker
            if (aiWorker) {
                console.log("[resetButton] Terminating existing AI worker...");
                aiWorker.onmessage = null; // 在terminate前移除消息处理器
                aiWorker.terminate();
                
                console.log("[resetButton] Creating new AI worker...");
                aiWorker = new Worker(new URL('./ai-worker.js', import.meta.url), { type: 'module' });
                if (typeof setupAIWorker === 'function') {
                    setupAIWorker(); 
                    console.log("[resetButton] New AI worker setup complete.");
                } else {
                    console.error("[resetButton] setupAIWorker function is not defined!");
                }
            } else {
                console.log("[resetButton] No AI worker instance to terminate/recreate.");
            }

            // 提示用户游戏将被彻底重置
            showTemporaryMessage("游戏将被彻底重置，包括积分", 2000);

            // 后续逻辑：显示难度选择模态框或直接开始新游戏
            if (difficultyModal) {
                console.log("[resetButton] Showing difficulty modal.");
                difficultyModal.classList.remove('hidden'); 
                if(boardElement) boardElement.style.pointerEvents = 'none'; 
                else console.warn("[resetButton] boardElement is null while trying to disable pointer events.");
                if(currentDifficultyDisplay) currentDifficultyDisplay.textContent = '当前难度: 未选择';
                else console.warn("[resetButton] currentDifficultyDisplay is null.");
            } else {
                console.error("[resetButton] Difficulty modal not found. Attempting to re-initialize game directly.");
                // 如果模态框不存在，直接初始化游戏 (重置分数)
                if (boardElement && popupMessageElement && currentDifficultyDisplay && resetButton) {
                    if (typeof initializeBoardAndGame === 'function') {
                        initializeBoardAndGame(true); // 这里传入true，确保清零积分
                    } else {
                        console.error("[resetButton] initializeBoardAndGame function is not defined for direct re-init!");
                    }
                } else {
                    console.error("[resetButton] Cannot re-initialize game due to missing essential DOM elements (direct re-init fallback).");
                    if(popupMessageElement) showTemporaryMessage(CRITICAL_INIT_ERROR_MSG, 5000, true);
                    else console.error(CRITICAL_INIT_ERROR_MSG + " (popupMessageElement also missing for direct re-init)");
                }
            }
        });
    } else {
        console.error("CRITICAL: Reset button ('resetButton') not found in DOM.");
    }

    if (resignButton) {
        resignButton.addEventListener('click', handleResign);
    } else {
        console.error("CRITICAL: Resign button ('resignButton') not found in DOM.");
    }
    
    if (undoButton) {
        undoButton.addEventListener('click', handleUndoMove);   
    } else {
        console.error("CRITICAL: Undo button ('undoButton') not found in DOM.");
    }

window.addEventListener('resize', () => { 
        if (typeof drawPalaceLines === 'function') {
    setTimeout(drawPalaceLines, 100); 
        }
    });

    // 整个文档的点击事件，用于处理用户交互激活音频播放
    document.addEventListener('click', () => {
        userHasInteracted = true;
    });
});
