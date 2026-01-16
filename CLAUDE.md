# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个使用 Tauri 2 + React + Rust 构建的五子棋（Gomoku）桌面游戏应用。支持多种游戏模式：人人对战（PvP）、人机对战（PvAI）、AI 对战（AIvAI）和残局练习。

## 常用命令

### 开发
```bash
# 启动开发服务器（前端 + Tauri）
npm run tauri dev

# 仅启动前端开发服务器
npm run dev
```

### 构建
```bash
# 构建生产版本
npm run tauri build

# 仅构建前端
npm run build
```

### Rust 相关
```bash
# 在 src-tauri 目录下运行
cd src-tauri

# 检查 Rust 代码
cargo check

# 运行 Rust 测试
cargo test

# 格式化 Rust 代码
cargo fmt

# Lint 检查
cargo clippy
```

### 测试
```bash
# 运行 Rust 测试（151 个测试）
cd src-tauri && cargo test

# 运行前端测试（201 个测试）
npm run test:run

# 前端测试（监听模式）
npm run test

# 前端测试覆盖率
npm run test:coverage
```

## 架构概览

### 前后端通信
- 前端通过 `@tauri-apps/api/core` 的 `invoke` 函数调用 Rust 后端命令
- Tauri 命令分布在 `src-tauri/src/commands/` 目录下
- 前端 API 封装在 `src/api/gameApi.ts`

### 后端结构 (src-tauri/src/)

```
├── lib.rs              # Tauri 应用入口，注册命令和状态
├── commands/           # Tauri 命令处理
│   ├── game_commands.rs    # 游戏命令：new_game, make_move, ai_move, undo_move, get_game_state, get_hint, surrender, get_move_history, export_game
│   ├── puzzle_commands.rs  # 残局命令：get_puzzle_list, get_puzzle, check_puzzle_move
│   └── analysis_commands.rs # 分析命令：analyze_position
├── game/               # 游戏核心逻辑
│   ├── types.rs        # 类型定义：Stone, GameMode, AIDifficulty, GameStatus, Position, Move, RuleSet
│   ├── board.rs        # 棋盘逻辑，15x15 棋盘，维护 stone_positions 加速候选位置计算
│   ├── state.rs        # 游戏状态管理，使用 Mutex 保护
│   └── rules.rs        # 胜负判定规则 + 禁手检测（含单元测试）
└── ai/                 # AI 实现
    ├── minimax.rs      # Minimax + Alpha-Beta 剪枝 + 置换表
    ├── evaluator.rs    # 棋局评估（按线扫描）+ 快速位置评估（用于走法排序）
    └── transposition.rs # Zobrist 哈希 + 置换表实现
```

### 前端结构 (src/)

```
├── App.tsx             # 主组件，管理游戏界面切换
├── App.css             # 全局样式 + CSS 主题变量
├── test/               # 测试配置
│   └── setup.ts        # Vitest 测试环境设置
├── contexts/
│   └── ThemeContext.tsx # 主题上下文（亮色/深色）
├── hooks/
│   ├── useGame.ts      # 游戏状态管理 Hook
│   ├── useSound.ts     # 音效 Hook（Web Audio API）
│   └── useKeyboardShortcuts.ts # 键盘快捷键 Hook
├── api/
│   └── gameApi.ts      # Tauri 命令调用封装
├── types/
│   └── game.ts         # TypeScript 类型定义
├── utils/
│   └── gameHistory.ts  # 对局记录存储工具（localStorage）
└── components/         # UI 组件
    ├── Board/          # 棋盘组件（含坐标显示）
    ├── GameInfo/       # 游戏信息显示
    ├── ControlPanel/   # 控制面板（新游戏、悔棋、AI建议、认输、复盘）
    ├── GameModeSelector/ # 游戏模式选择（含计时器、规则设置）
    ├── ConfirmDialog/  # 确认对话框
    ├── Settings/       # 设置面板（音效、主题、对局记录入口、棋谱导入导出）
    ├── Timer/          # 计时器组件
    ├── ReplayPanel/    # 复盘面板
    ├── GameHistory/    # 对局记录列表
    ├── StatsPanel/     # 统计面板
    ├── PuzzleMode/     # 残局练习模式
    └── AnalysisPanel/  # AI 分析面板
```

### 关键设计

**游戏状态同步**：`GameState` 使用 `Mutex<GameStateInner>` 保护，确保线程安全。前端通过 `GameSnapshot` 获取状态快照。

**AI 计算**：AI 使用 `tokio::task::spawn_blocking` 在独立线程执行，避免阻塞 UI。搜索深度由难度决定：Easy=2, Medium=4, Hard=6。

**AI 优化**：
- 迭代加深搜索（Iterative Deepening）：从深度 1 逐步搜索到目标深度，利用浅层结果优化深层搜索的走法排序，找到必胜走法时提前返回
- 置换表（Transposition Table）：使用 Zobrist 哈希缓存已搜索局面，采用固定大小数组（约 100 万条目）+ 位运算取模，避免 HashMap 开销；智能替换策略（相同局面总是更新，不同局面深度更大才替换）
- Zobrist 表静态化：使用 `lazy_static` 将 Zobrist 表设为全局静态常量，避免每次创建 `ZobristHash` 时重复计算
- SearchContext 结构体：封装搜索上下文参数（board、zobrist、tt、killer_moves、ai_stone），提高代码可读性
- Killer Move 启发：记录每个深度导致 Beta 剪枝的走法（每层 2 个），优先搜索这些走法以提升剪枝效率
- 走法排序优先级：置换表最佳走法 > Killer Move > `quick_evaluate_position` 快速评估分数
- 按线评估：`evaluate_board` 扫描 88 条线而非 225 个点，避免重复计算
- 候选位置优化：`Board` 维护 `stone_positions` 列表，只遍历已落子位置的邻域；使用 `[bool; 225]` 位图代替 HashSet 避免哈希开销；`undo_move` 使用 `swap_remove` 实现 O(1) 复杂度
- 热点函数内联：`Board::get`、`is_empty`、`is_valid_position` 等高频调用函数添加 `#[inline]` 标注
- 残局题库缓存：使用 `lazy_static` 将 50 道残局题目缓存为静态常量，避免每次查询都重新创建

**禁手规则**：支持连珠规则（Renju），黑棋禁止三三、四四、长连。禁手检测在 `rules.rs` 中实现。

**悔棋逻辑**：PvAI 模式下悔棋会撤销两步（玩家和 AI 各一步）。

**AI 建议功能**：`get_hint` 命令复用 `find_best_move` 函数为当前玩家计算最佳落子位置，使用当前游戏的 AI 难度设置（PvP 模式默认 Medium）。建议位置在棋盘上显示为闪烁蓝色圆点，落子或悔棋后自动清除。

**音效系统**：使用 Web Audio API 动态生成音效，无需外部音频文件。支持落子、获胜、失败三种音效。

**主题系统**：使用 CSS 变量实现主题切换，支持亮色和深色两种主题。亮色主题采用中国风设计（宣纸背景 + 檀木棋盘），深色主题采用水墨画风格（深墨背景 + 墨石棋盘）。通过 `ThemeContext` 管理状态，设置保存到 localStorage。CSS 变量包括：`--bg-gradient`、`--board-bg`、`--board-line`、`--text-primary`、`--text-secondary`、`--card-bg`、`--border-color`、`--input-bg`、`--input-bg-active`、`--overlay-bg`、`--shadow-color` 等。

**计时器**：支持两种模式 - 每步限时（perMove）和总时间（total），超时自动判负。

**残局练习**：内置 50 道残局题目，分五个难度等级（简单/中等/困难/专家/大师），支持提示和进度保存。题目列表按难度由易到难排序，同难度按 ID 升序排列。

**AI 分析**：实时分析当前局面，显示评估分数、推荐走法和关键点位（威胁/机会）。分析结果以侧边栏形式显示，落子后自动刷新。所有游戏模式（包括AI对战）均可使用。

**对局记录**：游戏结束时自动保存对局记录到 localStorage（最多 50 条）。记录包含走法历史、游戏模式、结果、时长和质量评分。可从首页右上角进入对局记录页面查看和复盘历史对局。

**对局评分**：游戏结束时自动计算对局质量评分（0-100分）。评分基于步数（20-60步最佳）、结果（胜利+20分）和难度（Hard+10分）综合计算。

**复盘功能**：游戏结束后可点击复盘按钮进入复盘模式，支持步进浏览、自动播放和点击走法列表跳转。也可从对局记录中选择历史对局进行复盘。

**棋谱导入导出**：通过 Settings 面板的 📤 和 📥 按钮进行操作。导出生成包含版本号、时间戳、走法历史、游戏模式、规则和结果的 JSON 文件。导入后自动进入复盘模式。按钮显示逻辑：导出按钮在游戏界面显示（有棋子时可用），导入按钮在首页或游戏结束时显示。使用 Tauri 的 dialog 和 fs 插件实现，默认允许访问文档/下载/桌面目录，用户选择其他目录时自动临时授权。

**类型映射**：Rust 枚举（如 `Stone::Black`）序列化为字符串（`"Black"`），前端使用联合类型对应。

**前端渲染优化**：
- `Cell` 组件使用 `React.memo` 避免不必要重渲染
- `winningPositions` 转为 Set 实现 O(1) 查找
- 回调函数使用 `useCallback` 缓存，确保 memo 生效
- `useGame` hook 使用 `useRef` 存储状态，避免回调函数依赖 `gameState` 对象导致频繁重建
- `Timer` 组件使用 `useRef` 存储 `onTimeout` 回调，避免 interval 不必要重置
- `ReplayPanel` 组件正确清理 interval，防止内存泄漏
- `PuzzleMode` 组件使用 `useState` 缓存 localStorage 数据，避免每次渲染都读取

**前端代码质量**：
- AudioContext 清理：`useSound` hook 添加 `useEffect` cleanup 逻辑，组件卸载时关闭 AudioContext 防止内存泄漏
- API 错误处理：`gameApi.ts` 添加统一的 `invokeWithErrorHandling` 包装函数，所有 Tauri 命令调用都有错误日志
- 无障碍访问：`Cell` 组件添加 `role="button"`、`aria-label`、`tabIndex` 和键盘导航支持；`Settings` 组件为 emoji 按钮添加 `aria-label`

**安全性**：启用 CSP（Content Security Policy）安全策略，限制资源加载来源为 `'self'`，防止 XSS 攻击。

**UI 布局约束**：所有页面元素必须在单个窗口内完整显示，不允许出现滚动条。添加新 UI 元素时需确保窗口尺寸足够容纳，或优化现有布局。

## 功能列表

### 游戏模式
- **双人对战 (PvP)**：两人轮流落子
- **人机对战 (PvAI)**：与 AI 对战，可选难度和执子颜色
- **AI 对战 (AIvAI)**：观看两个 AI 对弈，可调节速度
- **残局练习**：50 道内置残局题目，五个难度等级（简单/中等/困难/专家/大师）

### 游戏功能
- 悔棋、认输、新游戏
- AI 落子建议
- 计时器（每步限时/总时间）
- 禁手规则（连珠）
- 棋盘坐标显示
- 对局复盘（游戏结束后可用）
- 对局记录（自动保存，支持历史复盘）
- 对局评分（0-100分质量评估）
- 棋谱导入导出（JSON 格式，支持复盘）
- AI 局面分析

### 系统功能
- 音效（落子/获胜/失败）
- 主题切换（亮色/深色）
- 游戏统计（胜负记录）
- 键盘快捷键（Ctrl+Z 悔棋, Ctrl+N 新游戏, H 提示）

## 测试

### 测试框架
- **Rust 后端**: 使用 Rust 内置测试框架 (`#[cfg(test)]`)
- **前端**: 使用 Vitest + Testing Library

### 测试覆盖
| 模块 | 测试数量 | 说明 |
|------|---------|------|
| `game/board.rs` | 12 | 棋盘操作测试 |
| `game/state.rs` | 18 | 游戏状态管理测试 |
| `game/rules.rs` | 14 | 胜负判定 + 禁手规则测试 |
| `game/types.rs` | 10 | 类型方法测试 |
| `ai/transposition.rs` | 14 | Zobrist 哈希 + 置换表测试 |
| `ai/evaluator.rs` | 15 | 评估函数测试 |
| `ai/minimax.rs` | 11 | AI 搜索算法测试 |
| `commands/game_commands.rs` | 28 | 游戏命令测试 |
| `commands/puzzle_commands.rs` | 17 | 残局命令测试 |
| `commands/analysis_commands.rs` | 12 | 分析命令测试 |
| `hooks/useGame.ts` | 23 | 游戏状态 Hook 测试 |
| `hooks/useSound.ts` | 15 | 音效 Hook 测试 |
| `hooks/useKeyboardShortcuts.ts` | 15 | 快捷键 Hook 测试 |
| `api/gameApi.ts` | 20 | API 封装测试 |
| `components/Board/` | 34 | 棋盘组件测试 (Cell 17 + Board 17) |
| `components/Timer/` | 18 | 计时器组件测试 |
| `components/ControlPanel/` | 23 | 控制面板测试 |
| `components/ReplayPanel/` | 23 | 复盘面板测试 |
| `utils/gameHistory.ts` | 24 | 对局记录工具测试 |
| `contexts/ThemeContext.tsx` | 6 | 主题 Context 测试 |

### CI/CD
- GitHub Actions 自动运行测试（push/PR 到 main 分支）
- Rust 测试 + Clippy 代码检查
- 前端测试 + TypeScript 类型检查
- 配置文件: `.github/workflows/test.yml`
