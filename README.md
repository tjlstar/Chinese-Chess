# 中国象棋游戏

本项目是一个基于 JavaScript 实现的中国象棋游戏，包含与AI对战的功能。

## 项目结构

- `index.html`: 游戏的主页面。
- `style.css`: 游戏界面的样式。
- `main.js`: 项目的入口JavaScript文件，负责导入其他脚本和样式。
- `xiangqi_script.js`: 游戏的核心逻辑，包括棋盘管理、棋子移动规则、胜负判断、用户交互等。
- `ai-worker.js`: AI的逻辑实现，运行在 Web Worker 中，使用极小极大算法 (Minimax) 结合 Alpha-Beta 剪枝来决定AI的移动。
- `package.json`, `package-lock.json`: Node.js 项目依赖管理文件。
- `tailwind.config.js`, `postcss.config.js`: Tailwind CSS 配置文件。

## 模块与功能

### 1. `main.js`

- **功能**: 项目的主入口。
- **主要职责**:
    - 导入 `style.css` 应用样式。
    - 导入 `xiangqi_script.js` 以启动游戏逻辑。

### 2. `xiangqi_script.js` (游戏核心逻辑)

该文件包含了中国象棋游戏的主要逻辑。

#### 2.1 主要常量和状态变量

- `ROWS`, `COLS`: 定义棋盘的行数 (10) 和列数 (9)。
- `boardElement`: HTML中棋盘的DOM元素。
- `messageArea`: 显示游戏消息 (如轮到谁、胜负信息) 的DOM元素。
- `resetButton`: "重新开始"按钮的DOM元素。
- `initialBoardSetup`: 定义棋盘的初始布局。
- `pieceChineseNames`: 棋子ID到中文名称的映射。
- `pieceValues`: 定义不同类型棋子的基础价值，用于AI评估。
- `boardState`: 二维数组，表示当前棋盘上各个位置的棋子状态。
- `currentPlayer`: 字符串 ('R' 或 'B')，表示当前轮到哪一方行动（红方或黑方）。
- `selectedPiece`: 对象，存储当前选中的棋子信息（棋子ID、行、列）。
- `gameOver`: 布尔值，标记游戏是否结束。

#### 2.2 主要函数

- **`initializeBoardAndGame(resetScores = false)`**
    - **功能**: 初始化或重置游戏棋盘和状态。
    - **参数**:
        - `resetScores` (布尔型, 可选, 默认 `false`): 是否重置双方得分。
    - **用法**: 在游戏开始或点击"重新开始"时调用。

- **`createPieceElement(pieceId, row, col)`**
    - **功能**: 在棋盘上创建并显示一个棋子的DOM元素。
    - **参数**:
        - `pieceId` (字符串): 棋子的唯一标识符 (如 'RK', 'BH1')。
        - `row` (数字): 棋子所在的行。
        - `col` (数字): 棋子所在的列。

- **`drawPalaceLines()`**
    - **功能**: 在棋盘上绘制红黑双方九宫格的斜线。

- **`onSquareClick(row, col)`**
    - **功能**: 处理用户点击棋盘格子的事件。根据当前游戏状态决定是选中棋子、移动棋子还是取消选择。
    - **参数**:
        - `row` (数字):被点击格子的行号。
        - `col` (数字): 被点击格子的列号。

- **`selectPiece(row, col, pieceId)`**
    - **功能**: 选中位于 `(row, col)` 的棋子 `pieceId`，并高亮显示，同时计算并显示其所有合法走法。
    - **参数**:
        - `row` (数字): 棋子所在的行。
        - `col` (数字): 棋子所在的列。
        - `pieceId` (字符串): 要选中的棋子ID。

- **`showValidMoves(r, c, pieceId)`**
    - **功能**: 计算并显示棋子 `pieceId` 在 `(r, c)` 位置的所有合法移动位置。
    - **参数**:
        - `r` (数字): 棋子所在的行。
        - `c` (数字): 棋子所在的列。
        - `pieceId` (字符串): 棋子ID。

- **`clearValidMoveMarkers()`**
    - **功能**: 清除棋盘上所有显示的合法移动标记。

- **`movePiece(fromRow, fromCol, toRow, toCol)`**
    - **功能**: 将棋子从 `(fromRow, fromCol)` 移动到 `(toRow, toCol)`。
    - **职责**:
        - 更新 `boardState`。
        - 更新UI界面上的棋子位置。
        -处理吃子逻辑。
        - 检查是否吃掉对方将/帅，若吃掉则结束游戏。
        - 检查移动后是否造成将死或困毙。
        - 切换玩家 (`switchPlayer()`)。
    - **参数**:
        - `fromRow` (数字): 棋子起始行。
        - `fromCol` (数字): 棋子起始列。
        - `toRow` (数字): 棋子目标行。
        - `toCol` (数字): 棋子目标列。

- **`endGame(winner, reason)`**
    - **功能**: 结束当前游戏。
    - **参数**:
        - `winner` (字符串): 胜方 ('R' 或 'B')。
        - `reason` (字符串): 游戏结束的原因 (如 "黑方【将】被吃", "红方被将死")。
    - **职责**: 更新游戏结束状态、显示胜负信息、更新分数。

- **`switchPlayer()`**
    - **功能**: 切换当前行棋方。如果轮到AI (黑方)，则触发AI进行思考并移动 (`makeAIMove()`)。

- **`isMoveLegal(fromRow, fromCol, toRow, toCol, pieceId)`**
    - **功能**: 判断棋子 `pieceId` 从 `(fromRow, fromCol)` 移动到 `(toRow, toCol)` 是否完全合法。
    - **考虑因素**: 棋子自身的基本移动规则 (`isValidBaseMove`) 以及移动后是否会导致己方将/帅被将军。
    - **参数**: (同 `movePiece`，外加 `pieceId`)。
    - **返回**: 布尔值。

- **`isValidBaseMove(fromRow, fromCol, toRow, toCol, pieceId)`**
    - **功能**: 仅判断棋子 `pieceId` 从 `(fromRow, fromCol)` 移动到 `(toRow, toCol)` 是否符合其基本移动规则（不考虑是否会导致被将军）。
    - **包含**: 对帅(将)、仕(士)、相(象)、马(馬)、车(車)、炮(砲)、兵(卒) 的具体走法判断。
    - **参数**: (同 `isMoveLegal`)。
    - **返回**: 布尔值。
    - **相关子函数**: `isValidKingMove`, `isValidAdvisorMove`, `isValidElephantMove`, `isValidHorseMove`, `isValidChariotMove`, `isValidCannonMove`, `isValidPawnMove`。

- **`findKingPosition(side)`**
    - **功能**: 查找指定方 (`side`) 的将/帅在棋盘上的位置。
    - **参数**: `side` (字符串: 'R' 或 'B')。
    - **返回**: 对象 `{r, c}` 或 `null`。

- **`isKingInCheck(kingSide)`**
    - **功能**: 判断指定方 (`kingSide`) 的将/帅是否正处于被将军的状态。
    - **参数**: `kingSide` (字符串: 'R' 或 'B')。
    - **返回**: 布尔值。

- **`hasAnyLegalMove(side)`**
    - **功能**: 判断指定方 (`side`) 当前是否有任何合法的棋步可走。
    - **参数**: `side` (字符串: 'R' 或 'B')。
    - **返回**: 布尔值。

- **`isCheckmate(kingSide)`**
    - **功能**: 判断指定方 (`kingSide`) 是否已被将死。
    - **条件**: 被将军 (`isKingInCheck`) 且无任何合法走法 (`!hasAnyLegalMove`)。
    - **参数**: `kingSide` (字符串: 'R' 或 'B')。
    - **返回**: 布尔值。

- **`isStalemate(side)`**
    - **功能**: 判断指定方 (`side`) 是否为困毙（无子可动但未被将军）。
    - **条件**: 未被将军 (`!isKingInCheck`) 且无任何合法走法 (`!hasAnyLegalMove`)。
    - **参数**: `side` (字符串: 'R' 或 'B')。
    - **返回**: 布尔值。

- **`evaluateBoard()`**
    - **功能**: (主线程中的版本，AI在Worker中有自己的版本) 评估当前棋盘局势的分数。主要基于双方剩余棋子的物质价值。
    - **返回**: 数字，表示分数（黑方分数 - 红方分数）。

- **`makeAIMove()`**
    - **功能**: 当轮到AI（黑方）行动时调用此函数。
    - **职责**: 向 `ai-worker.js` 发送消息，请求AI计算最佳移动。消息包含当前 `boardState` 和搜索深度。

### 3. `ai-worker.js` (AI 逻辑 - Web Worker)

该文件运行在独立的Web Worker线程中，负责计算AI的走法，以避免阻塞浏览器主线程。

#### 3.1 主要功能

- 接收主线程发送的当前棋盘状态 (`boardState`) 和搜索深度 (`depth`)。
- 使用极小极大算法 (`minimax`) 配合Alpha-Beta剪枝来搜索最佳走法。
- 将计算得到的最佳走法发送回主线程。

#### 3.2 主要函数 (Worker内部)

- **`self.onmessage = function(e) { ... }`**
    - **功能**: Worker的事件监听器，用于接收来自主线程的消息。
    - **参数**: `e.data` (对象): 包含 `type` ('findBestMove'), `boardState`, `depth`。
    - **职责**: 当收到 `findBestMove` 类型的消息时，调用 `findBestMove` 函数，并将结果通过 `self.postMessage` 发回主线程。

- **`findBestMove(boardState, depth = 3)`**
    - **功能**: AI决策的核心函数。遍历AI方 (黑方 'B') 所有可能的合法移动，并对每一步棋之后形成的局面使用 `minimax` 算法进行评估。
    - **参数**:
        - `boardState` (二维数组): 当前棋盘状态。
        - `depth` (数字, 可选, 默认 3): `minimax` 算法的搜索深度。
    - **返回**: 一个对象，表示最佳移动，格式为 `{ fromRow, fromCol, toRow, toCol, pieceId }`。

- **`minimax(boardState, depth, alpha, beta, isMaximizingPlayer)`**
    - **功能**: 实现了带Alpha-Beta剪枝的极小极大搜索算法。
    - **参数**:
        - `boardState` (二维数组): 当前评估的棋盘状态。
        - `depth` (数字): 剩余搜索深度。
        - `alpha` (数字): Alpha剪枝值。
        - `beta` (数字): Beta剪枝值。
        - `isMaximizingPlayer` (布尔型): 指示当前节点是最大化节点 (AI的回合) 还是最小化节点 (对手的回合)。
    - **返回**: 当前局面的评估分数。

- **`evaluateBoard(boardState)`**
    - **功能**: (Worker内部版本) 评估给定棋盘状态的分数。AI (黑方) 尝试最大化此分数 (黑方物质价值 - 红方物质价值)。
    - **参数**: `boardState` (二维数组)。
    - **返回**: 数字，表示评估分数。

- **`isMoveLegal_AI(fromRow, fromCol, toRow, toCol, pieceId, boardState)`**
    - **功能**: (Worker内部版本) 判断移动是否合法，类似于主线程的 `isMoveLegal`，但操作的是传入的 `boardState` 副本。
    - **参数**: `fromRow`, `fromCol`, `toRow`, `toCol`, `pieceId`, `boardState`。
    - **返回**: 布尔值。

- **辅助函数**: Worker内部还包含了一系列从 `xiangqi_script.js` 复制和适配过来的棋子移动规则判断函数 (`isValidBaseMove_AI`, `isValidKingMove`, `findKingPosition_AI` 等)，这些函数在 `minimax` 搜索过程中被调用，并且通常会接收 `boardState`作为参数。

## 如何运行

1.  确保你的浏览器支持 JavaScript 和 Web Workers。
2.  直接用浏览器打开 `index.html` 文件即可开始游戏。

红方由玩家手动操作，黑方为AI。 