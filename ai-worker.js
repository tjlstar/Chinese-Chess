// AI Worker 实现
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
const ROWS = 10; // Assuming ROWS and COLS are needed for some logic, though not directly in all functions
const COLS = 9;

// --- AI Tuning Constants ---
const QUIESCENCE_MAX_DEPTH = 2; // Maximum depth for quiescence search
const MOBILITY_WEIGHT = 0.5;   // Weight for mobility score in evaluation

// --- Piece-Square Tables (PSTs) ---
// For Red player (Black's tables are mirrored)
// Values are somewhat arbitrary and need tuning.
// Indexing: [row][col] from Red's perspective (row 9 is Red's home rank)

// Red Pawn (RP) - 'P'
const PST_P_R = [
    [ 9,  9,  9, 11, 13, 11,  9,  9,  9], // row 0 (Black's back rank)
    [19, 24, 32, 37, 37, 37, 32, 24, 19], // row 1
    [19, 24, 32, 37, 37, 37, 32, 24, 19], // row 2
    [19, 23, 27, 29, 30, 29, 27, 23, 19], // row 3
    [14, 18, 20, 27, 29, 27, 20, 18, 14], // row 4 (just crossed river)
    [ 7,  7,  7,  7,  7,  7,  7,  7,  7], // row 5 (before river)
    [ 5,  5,  5,  5,  5,  5,  5,  5,  5], // row 6
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0], // row 7
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0], // row 8
    [ 0,  0,  0,  0,  0,  0,  0,  0,  0]  // row 9 (Red's home rank)
];

// Red Horse (RH) - 'H'
const PST_H_R = [
    [ 0, -2,  0,  2,  0,  2,  0, -2,  0],
    [-2,  0,  4,  2,  6,  2,  4,  0, -2],
    [ 0,  4,  2,  6,  4,  6,  2,  4,  0],
    [ 2,  2,  6,  8,  6,  8,  6,  2,  2],
    [ 0,  6,  8, 10,  8, 10,  8,  6,  0],
    [ 2,  4,  6,  8,  6,  8,  6,  4,  2],
    [ 0,  2,  4,  6,  4,  6,  4,  2,  0],
    [-2,  0,  2,  4,  2,  4,  2,  0, -2],
    [ 0, -2,  0,  2,  0,  2,  0, -2,  0],
    [-2,  0,  0,  0,  0,  0,  0,  0, -2]
];

// Red Chariot (RR) - 'R'
const PST_R_R = [
    [14, 14, 14, 15, 16, 15, 14, 14, 14],
    [14, 16, 16, 17, 18, 17, 16, 16, 14],
    [14, 16, 16, 17, 18, 17, 16, 16, 14],
    [14, 17, 17, 18, 19, 18, 17, 17, 14],
    [14, 17, 18, 19, 20, 19, 18, 17, 14],
    [14, 16, 17, 18, 19, 18, 17, 16, 14],
    [10, 14, 14, 16, 16, 16, 14, 14, 10],
    [ 8, 12, 12, 14, 14, 14, 12, 12,  8],
    [ 4,  8,  8, 10, 10, 10,  8,  8,  4],
    [ 0,  0,  4,  6,  6,  6,  4,  0,  0]
];

// Red Cannon (RC) - 'C'
const PST_C_R = [
    [ 6,  7,  6,  6,  5,  6,  6,  7,  6],
    [ 6,  8,  7,  7,  6,  7,  7,  8,  6],
    [ 7,  8,  6,  8,  7,  8,  6,  8,  7],
    [ 7,  9,  9,  9,  7,  9,  9,  9,  7],
    [ 8,  8,  7,  9,  7,  9,  7,  8,  8],
    [ 8,  9,  8, 10, 8, 10,  8,  9,  8],
    [ 7,  8,  7,  9,  9,  9,  7,  8,  7],
    [ 6,  7,  6,  8,  8,  8,  6,  7,  6],
    [ 5,  6,  5,  7,  7,  7,  5,  6,  5],
    [ 4,  4,  0,  5,  4,  5,  0,  4,  4]
];

// Red Advisor (RA) - 'A' (Limited to palace)
const PST_A_R = [ // Only need to define for palace, others can be 0 or very low
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 1, 0, 0, 0], // row 7
    [0, 0, 0, 0, 3, 0, 0, 0, 0], // row 8
    [0, 0, 0, 1, 0, 1, 0, 0, 0]  // row 9
];

// Red Elephant (RE) - 'E' (Limited to own half and specific points)
const PST_E_R = [
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0], // row 5
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 6
    [1, 0, 0, 0, 3, 0, 0, 0, 1], // row 7
    [0, 0, 0, 0, 0, 0, 0, 0, 0], // row 8
    [0, 0, 1, 0, 3, 0, 1, 0, 0]  // row 9
];

// Red King (RK) - 'K' (Limited to palace)
const PST_K_R = [ // King safety might be better handled by other eval terms
    [0,0,0, 1, 1, 1,0,0,0],[0,0,0, 1, 2, 1,0,0,0],[0,0,0, 1, 2, 1,0,0,0], // Black palace
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,-2, -3, -2,0,0,0], // row 7
    [0,0,0,-3, -4, -3,0,0,0], // row 8 (Slightly penalize moving king out initially)
    [0,0,0,-2, -3, -2,0,0,0]  // row 9
];

// --- Helper function to apply a move to a board state ---
function applyMove(boardState, fromR, fromC, toR, toC, pieceId) {
    const newBoard = JSON.parse(JSON.stringify(boardState));
    newBoard[toR][toC] = pieceId;
    newBoard[fromR][fromC] = null;
    return newBoard;
}

// --- Copied and Adapted Helper Functions from xiangqi_script.js ---
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
    return Math.abs(r1 - r2) === 1 && Math.abs(c1 - c2) === 1; // Diagonal one step
}

function isValidElephantMove(r1, c1, r2, c2, side, boardState) {
    if (!(Math.abs(r1 - r2) === 2 && Math.abs(c1 - c2) === 2)) return false; // Must move 2x2 "田"
    if ((side === 'R' && r2 < 5) || (side === 'B' && r2 > 4)) return false; // Cannot cross river
    if (boardState[r1 + (r2 - r1) / 2][c1 + (c2 - c1) / 2]) return false; // Check for blocking piece (象眼)
    return true;
}

function isValidHorseMove(r1, c1, r2, c2, side, boardState) {
    const dr = Math.abs(r1 - r2); 
    const dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 2) || (dr === 2 && dc === 1))) return false; // L-shape move "日"
    if (dr === 2) { // Moving 2 vertically, 1 horizontally
        if (boardState[r1 + (r2 - r1) / 2][c1]) return false;
    } else { // Moving 1 vertically, 2 horizontally
        if (boardState[r1][c1 + (c2 - c1) / 2]) return false;
    }
    return true;
}

function isValidChariotMove(r1, c1, r2, c2, side, boardState) {
    if (r1 !== r2 && c1 !== c2) return false; // Must be straight line
    if (r1 === r2) { // Horizontal move
        for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) if (boardState[r1][c]) return false;
    } else { // Vertical move
        for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) if (boardState[r][c1]) return false;
    }
    return true;
}

function isValidCannonMove(r1, c1, r2, c2, side, boardState) {
    if (r1 !== r2 && c1 !== c2) return false; // Must be straight line
    let piecesInBetween = 0;
    if (r1 === r2) { // Horizontal
        for (let c = Math.min(c1, c2) + 1; c < Math.max(c1, c2); c++) if (boardState[r1][c]) piecesInBetween++;
    } else { // Vertical
        for (let r = Math.min(r1, r2) + 1; r < Math.max(r1, r2); r++) if (boardState[r][c1]) piecesInBetween++;
    }
    if (boardState[r2][c2]) return piecesInBetween === 1; // Capture: must have one piece in between
    return piecesInBetween === 0; // Move: no pieces in between
}

function isValidPawnMove(r1, c1, r2, c2, side) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    if (side === 'R') {
        if (r1 > 4) return dr === -1 && dc === 0;
        else return (dr === -1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
    } else {
        if (r1 < 5) return dr === 1 && dc === 0;
        else return (dr === 1 && dc === 0) || (dr === 0 && Math.abs(dc) === 1);
    }
}

function findKingPosition_AI(side, boardState) {
    const kingType = side === 'R' ? 'RK' : 'BK';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (boardState[r][c] && boardState[r][c].substring(0, 2) === kingType) {
                return { r, c };
            }
        }
    }
    return null;
}
// --- End of Copied Helper Functions ---

// --- New Helper function to count legal moves for a side ---
function countLegalMoves(boardState, side) {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const pieceId = boardState[r][c];
            if (pieceId && pieceId.charAt(0) === side) {
                for (let tr = 0; tr < ROWS; tr++) {
                    for (let tc = 0; tc < COLS; tc++) {
                        // Check if the move is legal (includes not putting own king in check)
                        if (isMoveLegal_AI(r, c, tr, tc, pieceId, boardState)) {
                            count++;
                        }
                    }
                }
            }
        }
    }
    return count;
}

// 评估棋盘状态
function evaluateBoard(boardState) {
    // Score = Black's material - Red's material. AI (Black) wants to maximize this.
    let blackMaterial = 0;
    let redMaterial = 0;
    let blackPositional = 0;
    let redPositional = 0;

     for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = boardState[r][c];
            if (!piece) continue;
            
            const side = piece.charAt(0);
            const type = piece.charAt(1); // K, R, H, C, E, A, P
            let materialValue = pieceValues[type] || 0;
            let positionalValue = 0;

            // Adjust pawn value if over river (already handled by pieceValues, but PST can refine this)
            // The pawnValueOverRiver constant is used in main script's evaluateBoard.
            // Here, PSTs for pawns should implicitly handle the "over river" bonus.

            // USER ACTION: The Piece-Square Tables (PSTs) below are crucial for positional evaluation.
            // Consider fine-tuning these values based on Xiangqi strategy and game testing
            // to improve the AI's understanding of piece placement.
            if (side === 'R') {
                redMaterial += materialValue;
                // Get positional value from Red's perspective
                // Row 'r' in boardState is Red's (9-r)-th row for PST
                // Col 'c' in boardState is Red's (8-c)-th col for PST if mirroring Black's view.
                // But PSTs are defined from Red's view directly. So (r,c) from board is (r,c) for Red PSTs.
                // No, board (0,0) is top-left. Red's home rank is row 9.
                // So, for a red piece at boardState[r][c], its PST row is 'r'.
                switch (type) {
                    case 'P': positionalValue = PST_P_R[r][c]; break;
                    case 'H': positionalValue = PST_H_R[r][c]; break;
                    case 'R': positionalValue = PST_R_R[r][c]; break;
                    case 'C': positionalValue = PST_C_R[r][c]; break;
                    case 'A': positionalValue = PST_A_R[r][c]; break;
                    case 'E': positionalValue = PST_E_R[r][c]; break;
                    case 'K': positionalValue = PST_K_R[r][c]; break;
                }
                redPositional += positionalValue;
            } else { // side === 'B'
                blackMaterial += materialValue;
                // Get positional value for Black piece by mirroring Red's PST
                // Black piece at boardState[r][c] corresponds to Red's PST at (9-r, 8-c)
                const mirroredRow = 9 - r;
                const mirroredCol = 8 - c;
                switch (type) {
                    case 'P': positionalValue = PST_P_R[mirroredRow][mirroredCol]; break;
                    case 'H': positionalValue = PST_H_R[mirroredRow][mirroredCol]; break;
                    case 'R': positionalValue = PST_R_R[mirroredRow][mirroredCol]; break;
                    case 'C': positionalValue = PST_C_R[mirroredRow][mirroredCol]; break;
                    case 'A': positionalValue = PST_A_R[mirroredRow][mirroredCol]; break;
                    case 'E': positionalValue = PST_E_R[mirroredRow][mirroredCol]; break;
                    case 'K': positionalValue = PST_K_R[mirroredRow][mirroredCol]; break;
                }
                blackPositional += positionalValue;
            }
        }
    }
    // AI (Black) wants to maximize (BlackScore - RedScore)
    const totalBlackScore = blackMaterial + blackPositional;
    const totalRedScore = redMaterial + redPositional;
    
    // Add mobility score
    const blackMobility = countLegalMoves(boardState, 'B');
    const redMobility = countLegalMoves(boardState, 'R');
    const mobilityScore = (blackMobility - redMobility) * MOBILITY_WEIGHT;

    return totalBlackScore - totalRedScore + mobilityScore;
}

// Renamed from isMoveLegal: Checks only the piece's specific movement rules
function isValidBaseMove_AI(fromRow, fromCol, toRow, toCol, pieceId, boardState) {
    if (fromRow < 0 || fromRow >= ROWS || fromCol < 0 || fromCol >= COLS ||
        toRow < 0 || toRow >= ROWS || toCol < 0 || toCol >= COLS) {
        return false;
    }

    const pieceType = pieceId.charAt(1); // K, A, E, H, R, C, P
    const side = pieceId.charAt(0);
    const targetPiece = boardState[toRow][toCol];

    if (targetPiece && targetPiece.charAt(0) === side) { // Cannot capture own piece
        return false;
    }
    if (fromRow === toRow && fromCol === toCol) return false; // Cannot move to the same square

    switch (pieceType) {
        case 'K': return isValidKingMove(fromRow, fromCol, toRow, toCol, side);
        case 'A': return isValidAdvisorMove(fromRow, fromCol, toRow, toCol, side);
        case 'E': return isValidElephantMove(fromRow, fromCol, toRow, toCol, side, boardState);
        case 'H': return isValidHorseMove(fromRow, fromCol, toRow, toCol, side, boardState);
        case 'R': return isValidChariotMove(fromRow, fromCol, toRow, toCol, side, boardState);
        case 'C': return isValidCannonMove(fromRow, fromCol, toRow, toCol, side, boardState);
        case 'P': return isValidPawnMove(fromRow, fromCol, toRow, toCol, side);
        default: return false;
    }
}

function isKingInCheck_AI(kingSide, boardState) {
    const kingPos = findKingPosition_AI(kingSide, boardState);
    if (!kingPos) return true; // Should not happen, but if king not found, assume check.

    const opponentSide = kingSide === 'R' ? 'B' : 'R';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const pieceId = boardState[r][c];
            if (pieceId && pieceId.charAt(0) === opponentSide) {
                // Check if this opponent piece can attack the king's square using base move rules
                if (isValidBaseMove_AI(r, c, kingPos.r, kingPos.c, pieceId, boardState)) {
                     // If the attacking piece is a King, this is handled by the "Flying General" rule below.
                    if (pieceId.substring(1,2) !== 'K') {
                        return true;
                    }
                }
            }
        }
    }
    // Explicitly check for "Flying General"
    const opponentKingPos = findKingPosition_AI(opponentSide, boardState);
    if (opponentKingPos && kingPos.c === opponentKingPos.c) { // Kings in the same column
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

// New comprehensive isMoveLegal for AI
function isMoveLegal_AI(fromRow, fromCol, toRow, toCol, pieceId, boardState) {
    if (!isValidBaseMove_AI(fromRow, fromCol, toRow, toCol, pieceId, boardState)) {
        return false;
    }

    // Simulate move and check if own king is put in check
    const side = pieceId.charAt(0);
    // const originalDestPiece = boardState[toRow][toCol]; // Not needed for tempBoardState
    
    // Create a deep copy of the board state for simulation
    const tempBoardState = applyMove(boardState, fromRow, fromCol, toRow, toCol, pieceId);
    // tempBoardState[toRow][toCol] = pieceId;
    // tempBoardState[fromRow][fromCol] = null;
    
    const selfInCheck = isKingInCheck_AI(side, tempBoardState);
    
    // No need to revert, tempBoardState is a copy.
    return !selfInCheck;
}

// --- Helper function to generate only capture moves for Quiescence Search ---
function generateCaptureMoves(boardState, side) {
    const moves = [];
    const opponentSide = side === 'R' ? 'B' : 'R';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = boardState[r][c];
            if (piece && piece.charAt(0) === side) {
                for (let tr = 0; tr < ROWS; tr++) {
                    for (let tc = 0; tc < COLS; tc++) {
                        const targetPiece = boardState[tr][tc];
                        // Move is a capture if target square is occupied by an opponent piece
                        if (targetPiece && targetPiece.charAt(0) === opponentSide) {
                            if (isMoveLegal_AI(r, c, tr, tc, piece, boardState)) {
                                moves.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, pieceId: piece });
                            }
                        }
                    }
                }
            }
        }
    }
    return moves;
}

// --- Quiescence Search implementation ---
function quiescenceSearch(boardState, alpha, beta, isMaximizingPlayer, depth) {
    const standPatScore = evaluateBoard(boardState);

    if (depth === 0) {
        return standPatScore;
    }

    const playerSide = isMaximizingPlayer ? 'B' : 'R';

    if (isMaximizingPlayer) {
        if (standPatScore >= beta) {
            return standPatScore; // or beta
        }
        alpha = Math.max(alpha, standPatScore);
        let bestScore = standPatScore;
        const captures = generateCaptureMoves(boardState, playerSide);

        if (captures.length === 0) { // No more captures to explore at this level
            return standPatScore;
        }

        for (const move of captures) {
            const newBoard = applyMove(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol, move.pieceId);
            const score = quiescenceSearch(newBoard, alpha, beta, false, depth - 1);
            bestScore = Math.max(bestScore, score);
            alpha = Math.max(alpha, bestScore);
            if (beta <= alpha) {
                break; 
            }
        }
        return bestScore;
    } else { // Minimizing player
        if (standPatScore <= alpha) {
            return standPatScore; // or alpha
        }
        beta = Math.min(beta, standPatScore);
        let bestScore = standPatScore;
        const captures = generateCaptureMoves(boardState, playerSide);

        if (captures.length === 0) {
            return standPatScore;
        }
        
        for (const move of captures) {
            const newBoard = applyMove(boardState, move.fromRow, move.fromCol, move.toRow, move.toCol, move.pieceId);
            const score = quiescenceSearch(newBoard, alpha, beta, true, depth - 1);
            bestScore = Math.min(bestScore, score);
            beta = Math.min(beta, bestScore);
            if (beta <= alpha) {
                break;
            }
        }
        return bestScore;
    }
}

// 极小极大算法实现
function minimax(boardState, depth, alpha, beta, isMaximizingPlayer) { // Renamed isMaximizing to isMaximizingPlayer
    if (depth === 0) {
        // Call quiescence search instead of direct evaluation
        return quiescenceSearch(boardState, alpha, beta, isMaximizingPlayer, QUIESCENCE_MAX_DEPTH);
    }

    const playerSide = isMaximizingPlayer ? 'B' : 'R'; // AI (Black) is maximizing, Red is minimizing for Black.

    if (isMaximizingPlayer) { // AI 'B' is maximizing
        let maxEval = -Infinity;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = boardState[r][c];
                if (piece && piece.charAt(0) === playerSide) { // AI 'B' moves
                    for (let tr = 0; tr < ROWS; tr++) {
                        for (let tc = 0; tc < COLS; tc++) {
                            if (isMoveLegal_AI(r, c, tr, tc, piece, boardState)) {
                                const newBoard = applyMove(boardState, r, c, tr, tc, piece);
                                // newBoard[tr][tc] = piece;
                                // newBoard[r][c] = null;
                                const evalScore = minimax(newBoard, depth - 1, alpha, beta, false); // Next player is minimizing for AI
                                maxEval = Math.max(maxEval, evalScore);
                                alpha = Math.max(alpha, evalScore);
                                if (beta <= alpha) break; // Alpha-beta pruning
                            }
                        }
                        if (beta <= alpha) break;
                    }
                }
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return maxEval;
    } else { // Opponent 'R' is playing (minimizing for AI 'B')
        let minEval = Infinity;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const piece = boardState[r][c];
                if (piece && piece.charAt(0) === playerSide) { // Opponent 'R' moves
                    for (let tr = 0; tr < ROWS; tr++) {
                        for (let tc = 0; tc < COLS; tc++) {
                            if (isMoveLegal_AI(r, c, tr, tc, piece, boardState)) {
                                const newBoard = applyMove(boardState, r, c, tr, tc, piece);
                                // newBoard[tr][tc] = piece;
                                // newBoard[r][c] = null;
                                const evalScore = minimax(newBoard, depth - 1, alpha, beta, true); // Next player is maximizing for AI
                                minEval = Math.min(minEval, evalScore);
                                beta = Math.min(beta, evalScore);
                                if (beta <= alpha) break; // Alpha-beta pruning
                            }
                        }
                        if (beta <= alpha) break;
                    }
                }
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// 查找最佳移动
function findBestMove(boardState, depth = 3) { // AI is always Black ('B')
    let bestMove = null;
    let bestValue = -Infinity; // AI (Black) wants to maximize its score
    let alpha = -Infinity;
    let beta = Infinity;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const piece = boardState[r][c];
            if (piece && piece.charAt(0) === 'B') { // AI's turn (Black pieces)
                for (let tr = 0; tr < ROWS; tr++) {
                    for (let tc = 0; tc < COLS; tc++) {
                        if (isMoveLegal_AI(r, c, tr, tc, piece, boardState)) {
                            const newBoard = applyMove(boardState, r, c, tr, tc, piece);
                            // newBoard[tr][tc] = piece;
                            // newBoard[r][c] = null;
                            // The AI 'B' made a move, now it's 'R's turn (minimizing for 'B')
                            const value = minimax(newBoard, depth - 1, alpha, beta, false);
                            if (value > bestValue) {
                                bestValue = value;
                                bestMove = { fromRow: r, fromCol: c, toRow: tr, toCol: tc, pieceId: piece };
                            }
                            alpha = Math.max(alpha, bestValue); // Update alpha for this root node
                            // Note: Pruning at the root level (findBestMove) is implicitly handled by passing updated alpha/beta to minimax.
                        }
                    }
                }
            }
        }
    }
    return bestMove;
}

// 监听主线程消息
self.onmessage = function(e) {
    const { type, boardState, depth } = e.data;
    
    if (type === 'findBestMove') {
        const bestMove = findBestMove(boardState, depth);
        self.postMessage({ type: 'bestMove', move: bestMove });
    }
}; 