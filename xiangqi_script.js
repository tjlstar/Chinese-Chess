// --- Declare variables for DOM elements globally but uninitialized ---
let boardElement, resetButton, resignButton, undoButton, redScoreElement, blackScoreElement;
let difficultyModal, startGameButton, modalDifficultyRadios, popupMessageElement, currentDifficultyDisplay;
let aiWorker; // Declare aiWorker here
let aiMoveIndicatorTimeout = null;
let clickSound; // 为音效元素声明变量
let backgroundMusicPlayer;
let toggleMusicButton; // 新增：音乐播放/暂停按钮的引用
const backgroundPlaylist = [
    'audio/1.mp3', // 请替换为您的第一个MP3文件名
    'audio/2.mp3',  // 请替换为您的第二个MP3文件名
    'audio/3.mp3',
    'audio/4.mp3',
    'audio/5.mp3'
];
let currentTrackIndex = 0;
let userHasInteracted = false; // 跟踪用户是否已与页面交互

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
let currentAIDepth = 3; 
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
    gameOver = true;
    let winnerText = ''; 
    let scoreMsg = '';
    if (winner === 'R') { 
        redScore++; 
        winnerText = '红方胜利'; 
        scoreMsg = '红方得1分'; 
    } else if (winner === 'B') { 
        blackScore++; 
        winnerText = '黑方胜利'; 
        scoreMsg = '黑方得1分'; 
    } else { 
        winnerText = '平局';
    }
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    showTemporaryMessage(`${winnerText}！${reason}。(${scoreMsg}) 再来一盘？`, 5000);
    resetButton.textContent = '再来一盘';
    boardElement.style.pointerEvents = 'none';
}

function switchPlayer() {
    if (gameOver) return;
    currentPlayer = (currentPlayer === 'R' ? 'B' : 'R');
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
    if (gameOver) return;
    const winner = currentPlayer === 'R' ? 'B' : 'R';
    const loserName = currentPlayer === 'R' ? '红方' : '黑方';
    if (typeof endGame === 'function') endGame(winner, `${loserName}主动认输`);
}

function handleUndoMove() {
    if (gameOver) {
        showTemporaryMessage("游戏已结束，无法悔棋。", 3000, true);
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
    backgroundMusicPlayer = document.getElementById('backgroundMusicPlayer');
    toggleMusicButton = document.getElementById('toggleMusicButton'); // 获取新按钮的引用

    // Initialize AI Worker here
    aiWorker = new Worker('ai-worker.js'); // Assign to the globally declared 'let'
    
    // Setup AI Worker message listener
    aiWorker.onmessage = function(e) {
        const { type, move } = e.data;
        if (type === 'bestMove' && move) {
            if (typeof movePiece === 'function') {
                movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol); // Move piece first
                // Then draw indicator
                if (typeof drawAIMoveIndicator === 'function') {
                    drawAIMoveIndicator(move.fromRow, move.fromCol, move.toRow, move.toCol);
                }
            } else {
                console.error("movePiece function is not defined in aiWorker.onmessage context.");
            }
        }
    };

    // Background music logic
    if (backgroundMusicPlayer) {
        backgroundMusicPlayer.addEventListener('ended', () => {
            // Current track finished playing, play next track
            currentTrackIndex = (currentTrackIndex + 1) % backgroundPlaylist.length;
            playCurrentTrack();
        });
        // 初始加载时，音乐是暂停的，所以按钮应该显示"播放音乐"
        // updateToggleMusicButtonText(); // 在这里调用，或在startGameButton逻辑后确保状态正确
    }

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
            
            userHasInteracted = true; // Mark user as interacted
            if (backgroundMusicPlayer && backgroundPlaylist.length > 0) {
                // 确保从第一首或当前指定的曲目开始（如果之前被暂停过）
                // playCurrentTrack 会处理加载和播放
                if (backgroundMusicPlayer.paused) { // 只在暂停时才通过开始游戏按钮播放
                    playCurrentTrack(); 
                }
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
            if (difficultyModal) {
                difficultyModal.classList.remove('hidden'); 
                if(boardElement) boardElement.style.pointerEvents = 'none'; 
                else console.warn("resetButton: boardElement is null.");
                if(currentDifficultyDisplay) currentDifficultyDisplay.textContent = '当前难度: 未选择';
                else console.warn("resetButton: currentDifficultyDisplay is null.");
            } else {
                console.error("Reset button clicked, but difficulty modal not found. Re-initializing with current/default settings.");
                if (boardElement && popupMessageElement && currentDifficultyDisplay && resetButton) {
                    initializeBoardAndGame(true); 
                } else {
                    console.error("Cannot re-initialize game due to missing essential DOM elements (reset fallback).");
                    if(popupMessageElement) showTemporaryMessage(CRITICAL_INIT_ERROR_MSG, 5000, true);
                    else console.error(CRITICAL_INIT_ERROR_MSG + " (popupMessageElement also missing)");
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

    // 背景音乐逻辑
    if (toggleMusicButton && backgroundMusicPlayer) {
        toggleMusicButton.addEventListener('click', () => {
            userHasInteracted = true; // 标记用户交互
            if (backgroundPlaylist.length === 0) return;

            if (backgroundMusicPlayer.paused) {
                // 如果从未加载过歌曲 (src为空) 或者要确保从当前列表索引播放
                if (!backgroundMusicPlayer.src || backgroundMusicPlayer.currentSrc === "") {
                    backgroundMusicPlayer.src = backgroundPlaylist[currentTrackIndex];
                    backgroundMusicPlayer.load();
                }
                backgroundMusicPlayer.play()
                    .then(() => updateToggleMusicButtonText())
                    .catch(err => {
                        console.warn("音乐播放失败:", err);
                        updateToggleMusicButtonText();
                    });
            } else {
                backgroundMusicPlayer.pause();
                updateToggleMusicButtonText();
            }
        });
    }

    // 设置按钮的初始状态
    updateToggleMusicButtonText(); 
});

function updateToggleMusicButtonText() {
    if (toggleMusicButton && backgroundMusicPlayer) {
        if (backgroundMusicPlayer.paused) {
            toggleMusicButton.textContent = "播放音乐";
        } else {
            toggleMusicButton.textContent = "暂停音乐";
        }
    }
}

function playCurrentTrack() {
    if (!backgroundMusicPlayer || backgroundPlaylist.length === 0) {
        updateToggleMusicButtonText(); // 确保按钮状态正确，即使不播放
        return;
    }
    // 只有在用户交互后才真正尝试播放，但无论如何都更新按钮状态
    if (!userHasInteracted) {
        updateToggleMusicButtonText();
        return;
    }

    backgroundMusicPlayer.src = backgroundPlaylist[currentTrackIndex];
    backgroundMusicPlayer.load();
    const playPromise = backgroundMusicPlayer.play();

    if (playPromise !== undefined) {
        playPromise.then(_ => {
            // 播放开始
            updateToggleMusicButtonText();
        }).catch(error => {
            console.warn("背景音乐播放失败或被阻止:", error);
            updateToggleMusicButtonText();
        });
    } else {
        // 对于不支持Promise的旧版audio元素 (不太可能遇到)
        updateToggleMusicButtonText();
    }
}
