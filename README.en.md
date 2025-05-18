# Chinese Chess Game

English | [中文](README.md)

This project is a JavaScript implementation of Chinese Chess (Xiangqi), featuring AI opponents. It supports sound effects, background music, difficulty adjustment, and move undo functionality.

## Project Structure

- `index.html`: The main game page, containing the chessboard, control buttons, and modal dialogs.
- `style.css`: Game interface styles for the board, pieces, and UI components.
- `main.js`: The entry JavaScript file responsible for importing other scripts and styles.
- `xiangqi_script.js`: Core game logic, including board management, piece movement rules, win/loss determination, user interaction, and background music control.
- `ai-worker.js`: AI logic implementation running in a Web Worker, using the Minimax algorithm with Alpha-Beta pruning to determine AI moves.
- `audio/`: Directory containing game sound effects and background music.
  - `click.wav`: Click sound effect for piece movement.
  - `1.mp3`, `2.mp3`, `3.mp3`, `4.mp3`: Background music files, randomly played during the game.
- `public/`: Public resources directory.
  - `favicon.ico`: Website icon.
- `package.json`, `package-lock.json`: Node.js project dependency management files.
- `tailwind-input.css`: Tailwind CSS input file.
- `tailwind.config.js`, `postcss.config.js`: Tailwind CSS and PostCSS configuration files.
- `vite.config.js`: Vite development tool configuration file.
- `copy-audio.js`: Script for copying audio files during the build process.
- `.cursor/rules/`: Cursor IDE rule files, helping AI understand the project structure.

## Game Features

- **Difficulty Selection**: Offers easy, medium, and hard difficulty levels, corresponding to AI search depths of 2, 3, and 4.
- **Undo Move**: Supports undoing the most recent move, facilitating strategy adjustment.
- **Background Music**: Includes 4 background music tracks with random playback and play/pause control.
- **Sound Feedback**: Provides audio feedback when pieces move, enhancing the game experience.
- **Resign Option**: Allows resignation when in a disadvantageous position.
- **Move History**: Records each move, supporting undo operations.
- **Advanced AI Algorithm**: Uses the Minimax algorithm with Alpha-Beta pruning, combined with position evaluation functions for intelligent gameplay.
- **Automatic New Game**: After one side wins, the system automatically starts a new game with the winner moving first, while preserving cumulative scores.
- **Scoring System**: Tracks scores for both red and black sides, which can be reset via the "Restart" button.

## Game Flow

1. **Start Game**:
   - At game startup, a difficulty selection dialog is displayed.
   - Select an appropriate difficulty (Easy, Medium, Hard) and click "Start Game".
   - Background music automatically starts playing randomly.

2. **During the Match**:
   - The red side is controlled by the player, the black side by AI.
   - Clicking on a piece shows valid move positions (green markers).
   - When one side wins, a new game automatically starts with the winner moving first.

3. **Game Controls**:
   - **Restart**: Completely resets the game, displays the difficulty selection dialog, and zeroes the scores.
   - **Resign**: Concedes the current game, awards 1 point to the black side, and automatically starts a new game.
   - **Undo**: Reverts the most recent move (one for each player), returning to the previous game state.
   - **Music Control**: Pauses/plays background music.

## Modules and Features

### 1. `main.js`

- **Function**: The main entry point for the project.
- **Primary Responsibilities**:
    - Imports `style.css` to apply styles.
    - Imports `xiangqi_script.js` to start game logic.

### 2. `xiangqi_script.js` (Core Game Logic)

This file contains the main logic for the Chinese Chess game.

#### 2.1 Main Constants and State Variables

- `ROWS`, `COLS`: Define the number of rows (10) and columns (9) on the board.
- `boardElement`, `resetButton`, `resignButton`, `undoButton`, `redScoreElement`, `blackScoreElement`: Key DOM elements in HTML.
- `difficultyModal`, `startGameButton`, `modalDifficultyRadios`: Difficulty selection related elements.
- `popupMessageElement`: Message display element.
- `initialBoardSetup`: Defines the initial board layout.
- `pieceChineseNames`: Maps piece IDs to Chinese character names.
- `pieceValues`: Defines the base value of different piece types for AI evaluation.
- `boardState`: A two-dimensional array representing the current state of pieces on the board.
- `currentPlayer`: String ('R' or 'B'), indicating which side's turn it is (Red or Black).
- `selectedPiece`: Object storing information about the currently selected piece (piece ID, row, column).
- `gameOver`: Boolean flag indicating whether the game has ended.
- `moveHistory`: Array recording each move, supporting the undo feature.
- `currentAIDepth`: Value defining the AI search depth, default is 2 (Easy difficulty).
- `bgMusicElements`, `currentMusicIndex`, `isMusicPlaying`, `userPausedMusic`: Background music related variables.

#### 2.2 Main Functions

- **`initializeBoardAndGame(resetScores = false)`**
    - **Function**: Initializes or resets the game board and state.
    - **Parameters**:
        - `resetScores` (Boolean, Optional, Default `false`): Whether to reset both sides' scores.
    - **Usage**: Called at game start or when "Restart" is clicked.

- **`showTemporaryMessage(message, duration = 3000, isError = false)`**
    - **Function**: Displays a temporary message in the center of the board (river area).
    - **Parameters**:
        - `message` (String): The message to display.
        - `duration` (Number, Optional, Default 3000): Duration the message is displayed (milliseconds).
        - `isError` (Boolean, Optional, Default `false`): Whether it's an error message.

- **`createPieceElement(pieceId, row, col)`**
    - **Function**: Creates and displays a piece's DOM element on the board.
    - **Parameters**:
        - `pieceId` (String): The unique identifier for the piece (e.g., 'RK', 'BH1').
        - `row` (Number): The row where the piece is located.
        - `col` (Number): The column where the piece is located.

- **`drawPalaceLines()`**
    - **Function**: Draws diagonal lines for the palace areas of both red and black sides.

- **`onSquareClick(row, col)`**
    - **Function**: Handles user clicks on board squares. Decides whether to select a piece, move a piece, or cancel selection based on current game state.
    - **Parameters**:
        - `row` (Number): The row of the clicked square.
        - `col` (Number): The column of the clicked square.

- **`selectPiece(row, col, pieceId)`**
    - **Function**: Selects the piece at `(row, col)` with ID `pieceId`, highlights it, and calculates and displays all legal moves.
    - **Parameters**:
        - `row` (Number): The row of the piece.
        - `col` (Number): The column of the piece.
        - `pieceId` (String): The ID of the piece to select.

- **`movePiece(fromRow, fromCol, toRow, toCol)`**
    - **Function**: Moves a piece from `(fromRow, fromCol)` to `(toRow, toCol)`.
    - **Responsibilities**:
        - Updates `boardState`.
        - Updates the piece's position in the UI.
        - Handles capturing logic.
        - Checks if the opponent's king/general was captured; if so, ends the game.
        - Checks if the move results in checkmate or stalemate.
        - Switches players (`switchPlayer()`).
        - Plays movement sound effect.
        - Starts playing background music if it's not playing and not paused by the user.

- **`endGame(winner, reason)`**
    - **Function**: Ends the current game.
    - **Parameters**:
        - `winner` (String): The winning side ('R' or 'B').
        - `reason` (String): The reason for game ending (e.g., "Black [General] captured", "Red checkmated").
    - **Responsibilities**: 
        - Updates game over state.
        - Increments the winner's score.
        - Displays win/loss information.
        - Automatically resets the board and starts a new game with the winner moving first.

- **`switchPlayer()`**
    - **Function**: Switches the current player. If it's the AI's (Black's) turn, triggers AI to think and move (`makeAIMove()`).

- **Background Music Functions**:
    - `initBackgroundMusic()`: Initializes the background music system.
    - `playBackgroundMusic()`: Plays the currently selected background music.
    - `pauseBackgroundMusic()`: Pauses the currently playing background music.
    - `playRandomTrack()`: Randomly plays a background music track.
    - `getRandomMusicIndex()`: Gets a random music index.
    - `toggleBackgroundMusic()`: Toggles the play/pause state of background music.

- **Other Core Functions**:
    - `isMoveLegal`, `isValidBaseMove`: Determine the legality of piece movements.
    - `isKingInCheck`, `isCheckmate`, `isStalemate`: Determine check, checkmate, and stalemate situations.
    - `handleResign`, `handleUndoMove`: Handle resign and undo move operations.
    - `drawAIMoveIndicator`: Displays an arrow indicator for AI moves.

### 3. `ai-worker.js` (AI Logic - Web Worker)

This file runs in a separate Web Worker thread, responsible for calculating AI moves to avoid blocking the browser's main thread.

#### 3.1 Main Features

- Receives current board state (`boardState`) and search depth (`depth`) from the main thread.
- Uses the Minimax algorithm (`minimax`) with Alpha-Beta pruning to search for the best move.
- Uses static evaluation functions to evaluate board positions.
- Includes Piece-Square Tables (PST) to improve AI evaluation quality.
- Sends the calculated best move back to the main thread.

#### 3.2 Main Functions (Inside Worker)

- **`findBestMove(boardState, depth = 3)`**
    - **Function**: The core AI decision function. Iterates through all possible legal moves for the AI side (Black 'B') and evaluates the resulting position after each move using the `minimax` algorithm.
    - **Parameters**:
        - `boardState` (2D Array): Current board state.
        - `depth` (Number, Optional, Default 3): Search depth for the `minimax` algorithm.
    - **Returns**: An object representing the best move, formatted as `{ fromRow, fromCol, toRow, toCol, pieceId }`.

- **`minimax(boardState, depth, alpha, beta, isMaximizingPlayer)`**
    - **Function**: Implements the Minimax search algorithm with Alpha-Beta pruning.
    - **Parameters**:
        - `boardState` (2D Array): Current board state being evaluated.
        - `depth` (Number): Remaining search depth.
        - `alpha` (Number): Alpha pruning value.
        - `beta` (Number): Beta pruning value.
        - `isMaximizingPlayer` (Boolean): Indicates whether the current node is a maximizing node (AI's turn) or a minimizing node (opponent's turn).
    - **Returns**: Evaluation score for the current position.

- **`quiescenceSearch(boardState, alpha, beta, isMaximizingPlayer, depth)`**
    - **Function**: Static search algorithm used to reduce the horizon effect.
    - **Parameters**: Similar to `minimax`.
    - **Returns**: A more stable evaluation score.

- **`evaluateBoard(boardState)`**
    - **Function**: Evaluates the score for a given board state. The AI (Black) tries to maximize this score (Black material value - Red material value).
    - **Parameters**: `boardState` (2D Array).
    - **Returns**: Number, representing the evaluation score.

### 4. New Feature Descriptions

#### Background Music System
- Automatically starts playing randomly selected background music when the game loads.
- Music loops and randomly changes to the next track when one finishes.
- Users can pause/resume playback via the music control button.
- The system remembers the user's pause selection and won't automatically resume music paused by the user when AI moves.

#### Game Flow Optimization
- After either side wins, the system automatically starts a new game with the winner moving first.
- Scores accumulate, reflecting each player's number of wins.
- Only clicking the "Restart" button resets scores and allows selecting a new difficulty level.
- The "Resign" button immediately ends the current game, awards 1 point to the black side, and automatically starts a new game (with black moving first).

#### User Interface Improvements
- Message notifications display in the center of the board (river area), making them more prominent.
- Arrow indicators display during AI moves, helping players understand AI's strategy.
- Current difficulty level is displayed at the bottom of the interface for easy reference.

## How to Run

### Method 1: Direct Execution
1. Ensure your browser supports JavaScript and Web Workers.
2. Open the `index.html` file directly in your browser to start the game.

### Method 2: Run via Vite Development Server
1. Ensure Node.js environment is installed.
2. Run the following command to install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Access the displayed local URL in your browser (usually `http://localhost:5173/`).

## How to Play

1. Select difficulty and start the game.
2. Red side (bottom) is controlled by the player, Black side (top) by AI.
3. Click on your pieces to select them, then click on valid positions (green markers) to move.
4. Capture the opponent's king/general, or checkmate/stalemate them to win.
5. If the situation is unfavorable, click the "Resign" button.
6. To undo your last move, click the "Undo" button.
7. Background music can be toggled using the music button.

## Technical Highlights

1. **Web Worker Technology**: AI calculations run in a separate thread, avoiding UI interaction blockage.
2. **Advanced AI Algorithms**: Combines Minimax search, Alpha-Beta pruning, quiescence search, and position evaluation.
3. **Piece-Square Tables (PST)**: Enables AI to better understand the strategic value of different pieces in different positions.
4. **Responsive Design**: Adapts layout to different screen sizes.
5. **Audio Management System**: Randomly plays background music, remembers user playback preferences.
6. **Smooth Game Flow**: Automatically starts new games with winner moving first, enhancing game experience.

## License

This project is open-sourced under the Apache License 2.0. See the [LICENSE](LICENSE) file for more information. 