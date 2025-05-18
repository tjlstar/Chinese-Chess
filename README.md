# 中国象棋游戏

本项目是一个基于 JavaScript 实现的中国象棋游戏，包含与AI对战的功能。支持音效、背景音乐、难度调整和悔棋操作。

## 项目结构

- `index.html`: 游戏的主页面，包含棋盘、控制按钮和模态框。
- `style.css`: 游戏界面的样式，包含棋盘、棋子和UI组件的样式。
- `main.js`: 项目的入口JavaScript文件，负责导入其他脚本和样式。
- `xiangqi_script.js`: 游戏的核心逻辑，包括棋盘管理、棋子移动规则、胜负判断、用户交互和背景音乐控制等。
- `ai-worker.js`: AI的逻辑实现，运行在 Web Worker 中，使用极小极大算法 (Minimax) 结合 Alpha-Beta 剪枝来决定AI的移动。
- `audio/`: 包含游戏音效和背景音乐的目录。
  - `click.wav`: 棋子移动时的点击音效。
  - `1.mp3`, `2.mp3`, `3.mp3`, `4.mp3`: 背景音乐文件，游戏中会随机播放。
- `public/`: 公共资源目录。
  - `favicon.ico`: 网站图标。
- `package.json`, `package-lock.json`: Node.js 项目依赖管理文件。
- `tailwind-input.css`: Tailwind CSS 的输入文件。
- `tailwind.config.js`, `postcss.config.js`: Tailwind CSS 和 PostCSS 配置文件。
- `vite.config.js`: Vite 开发工具配置文件。
- `copy-audio.js`: 在构建过程中复制音频文件的脚本。
- `.cursor/rules/`: Cursor IDE的规则文件，帮助AI理解项目结构。

## 游戏特性

- **支持难度选择**: 提供简单、中等和困难三个难度级别，对应AI搜索深度为2、3和4。
- **悔棋功能**: 支持撤销最近的一步棋，方便调整策略。
- **背景音乐**: 内置4首背景音乐，支持随机播放，可随时切换播放/暂停。
- **音效反馈**: 棋子移动时有音效反馈，增强游戏体验。
- **认输选项**: 当局面不利时可以选择认输。
- **历史记录**: 记录每一步移动，支持悔棋操作。
- **高级AI算法**: 使用极小极大算法与Alpha-Beta剪枝，并结合局面评估函数实现智能对弈。
- **自动新局**: 一方获胜后，系统会自动开始新的一局，胜方先行，同时保留累计得分。
- **积分系统**: 记录红黑双方的得分，可以通过"重新开始"按钮清零。

## 游戏流程

1. **开始游戏**:
   - 游戏启动时，会显示难度选择对话框。
   - 选择适合的难度（易、中、难）后点击"开始游戏"。
   - 背景音乐会自动开始随机播放。

2. **进行对局**:
   - 红方由玩家控制，黑方由AI控制。
   - 点击棋子可以看到有效移动位置（绿色标记）。
   - 当一方获胜后，会自动开始新的一局，胜方先行。

3. **游戏控制**:
   - **重新开始**: 完全重置游戏，显示难度选择对话框，清零积分。
   - **认输**: 当前局认输，黑方得1分，自动开始新局。
   - **悔棋**: 撤销最近一步（人机各一步），返回之前的局面。
   - **音乐控制**: 暂停/播放背景音乐。

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
- `boardElement`, `resetButton`, `resignButton`, `undoButton`, `redScoreElement`, `blackScoreElement`: HTML中的关键DOM元素。
- `difficultyModal`, `startGameButton`, `modalDifficultyRadios`: 难度选择相关元素。
- `popupMessageElement`: 消息显示元素。
- `initialBoardSetup`: 定义棋盘的初始布局。
- `pieceChineseNames`: 棋子ID到中文名称的映射。
- `pieceValues`: 定义不同类型棋子的基础价值，用于AI评估。
- `boardState`: 二维数组，表示当前棋盘上各个位置的棋子状态。
- `currentPlayer`: 字符串 ('R' 或 'B')，表示当前轮到哪一方行动（红方或黑方）。
- `selectedPiece`: 对象，存储当前选中的棋子信息（棋子ID、行、列）。
- `gameOver`: 布尔值，标记游戏是否结束。
- `moveHistory`: 数组，记录每一步棋，支持悔棋功能。
- `currentAIDepth`: 数值，定义AI搜索深度，默认为2（简单难度）。
- `bgMusicElements`, `currentMusicIndex`, `isMusicPlaying`, `userPausedMusic`: 背景音乐相关变量。

#### 2.2 主要函数

- **`initializeBoardAndGame(resetScores = false)`**
    - **功能**: 初始化或重置游戏棋盘和状态。
    - **参数**:
        - `resetScores` (布尔型, 可选, 默认 `false`): 是否重置双方得分。
    - **用法**: 在游戏开始或点击"重新开始"时调用。

- **`showTemporaryMessage(message, duration = 3000, isError = false)`**
    - **功能**: 在楚河汉界中显示临时消息。
    - **参数**:
        - `message` (字符串): 要显示的消息。
        - `duration` (数字, 可选, 默认 3000): 消息显示的持续时间（毫秒）。
        - `isError` (布尔型, 可选, 默认 `false`): 是否为错误消息。

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

- **`movePiece(fromRow, fromCol, toRow, toCol)`**
    - **功能**: 将棋子从 `(fromRow, fromCol)` 移动到 `(toRow, toCol)`。
    - **职责**:
        - 更新 `boardState`。
        - 更新UI界面上的棋子位置。
        - 处理吃子逻辑。
        - 检查是否吃掉对方将/帅，若吃掉则结束游戏。
        - 检查移动后是否造成将死或困毙。
        - 切换玩家 (`switchPlayer()`)。
        - 播放落子音效。
        - 如果背景音乐未播放且未被用户暂停，则开始播放音乐。

- **`endGame(winner, reason)`**
    - **功能**: 结束当前游戏。
    - **参数**:
        - `winner` (字符串): 胜方 ('R' 或 'B')。
        - `reason` (字符串): 游戏结束的原因 (如 "黑方【将】被吃", "红方被将死")。
    - **职责**: 
        - 更新游戏结束状态。
        - 累加胜方分数。
        - 显示胜负信息。
        - 根据胜方自动重置棋盘并开始新局，胜方先行。

- **`switchPlayer()`**
    - **功能**: 切换当前行棋方。如果轮到AI (黑方)，则触发AI进行思考并移动 (`makeAIMove()`)。

- **背景音乐函数**:
    - `initBackgroundMusic()`: 初始化背景音乐系统。
    - `playBackgroundMusic()`: 播放当前选择的背景音乐。
    - `pauseBackgroundMusic()`: 暂停当前播放的背景音乐。
    - `playRandomTrack()`: 随机播放一首背景音乐。
    - `getRandomMusicIndex()`: 获取一个随机的音乐索引。
    - `toggleBackgroundMusic()`: 切换背景音乐的播放/暂停状态。

- **其他核心功能**:
    - `isMoveLegal`, `isValidBaseMove`: 判断棋子移动的合法性。
    - `isKingInCheck`, `isCheckmate`, `isStalemate`: 判断将军、将死和困毙情况。
    - `handleResign`, `handleUndoMove`: 处理认输和悔棋操作。
    - `drawAIMoveIndicator`: 显示AI移动的箭头指示器。

### 3. `ai-worker.js` (AI 逻辑 - Web Worker)

该文件运行在独立的Web Worker线程中，负责计算AI的走法，以避免阻塞浏览器主线程。

#### 3.1 主要功能

- 接收主线程发送的当前棋盘状态 (`boardState`) 和搜索深度 (`depth`)。
- 使用极小极大算法 (`minimax`) 配合Alpha-Beta剪枝来搜索最佳走法。
- 使用静态评估函数对局面进行评估。
- 还包含棋子位置价值表(PST)以提高AI评估的质量。
- 将计算得到的最佳走法发送回主线程。

#### 3.2 主要函数 (Worker内部)

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

- **`quiescenceSearch(boardState, alpha, beta, isMaximizingPlayer, depth)`**
    - **功能**: 静态搜索算法，用于减少水平效应。
    - **参数**: 与`minimax`类似。
    - **返回**: 一个更稳定的评估分数。

- **`evaluateBoard(boardState)`**
    - **功能**: 评估给定棋盘状态的分数。AI (黑方) 尝试最大化此分数 (黑方物质价值 - 红方物质价值)。
    - **参数**: `boardState` (二维数组)。
    - **返回**: 数字，表示评估分数。

### 4. 新增功能说明

#### 背景音乐系统
- 游戏加载后自动开始播放随机选择的背景音乐。
- 音乐会循环播放并在一首结束后随机切换到下一首。
- 用户可以通过音乐控制按钮暂停/恢复播放。
- 系统会记住用户的暂停选择，不会在AI走棋时自动恢复被用户暂停的音乐。

#### 游戏流程优化
- 任意一方获胜后，系统会自动开始新的一局，胜方先行。
- 积分会累计，反映每位玩家的胜场数。
- 只有点击"重新开始"按钮才会重置积分并重新选择难度。
- "认输"按钮会立即结束当前局，黑方得1分，并自动开始新局（黑方先行）。

#### 用户界面改进
- 消息提示在棋盘楚河汉界中央显示，更加醒目。
- AI移动时会显示箭头指示器，帮助玩家理解AI的走法。
- 当前难度显示在界面下方，方便用户查看。

## 如何运行

### 方法一：直接运行
1. 确保你的浏览器支持 JavaScript 和 Web Workers。
2. 直接用浏览器打开 `index.html` 文件即可开始游戏。

### 方法二：通过Vite开发服务器运行
1. 确保已安装Node.js环境。
2. 运行以下命令安装依赖：
   ```
   npm install
   ```
3. 启动开发服务器：
   ```
   npm run dev
   ```
4. 在浏览器中访问显示的本地URL（通常是`http://localhost:5173/`）。

## 游戏玩法

1. 选择难度并开始游戏。
2. 红方（下方）由玩家控制，黑方（上方）由AI控制。
3. 点击己方棋子进行选中，然后点击有效位置（绿色标记）移动。
4. 吃掉对方的将/帅，或将对方将死/困毙即可获胜。
5. 如果局面不利，可以点击"认输"按钮。
6. 如果想撤销上一步，可以点击"悔棋"按钮。
7. 背景音乐可以通过音乐按钮控制开关。

## 技术亮点

1. **Web Worker技术**: AI计算在独立线程中进行，不会阻塞UI交互。
2. **先进的AI算法**: 结合极小极大搜索、Alpha-Beta剪枝、静态搜索和局面评估。
3. **棋子位置价值表(PST)**: 使AI能更好地理解不同棋子在不同位置的战略价值。
4. **响应式设计**: 适应不同屏幕大小的布局。
5. **音频管理系统**: 随机播放背景音乐，记住用户的播放偏好。
6. **流畅的游戏流程**: 自动开始新局，胜方先行，提高游戏体验。 