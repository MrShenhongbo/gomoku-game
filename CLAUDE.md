# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个使用 Tauri 2 + React + Rust 构建的五子棋（Gomoku）桌面游戏应用。支持人人对战（PvP）和人机对战（PvAI）两种模式。

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

## 架构概览

### 前后端通信
- 前端通过 `@tauri-apps/api/core` 的 `invoke` 函数调用 Rust 后端命令
- 所有 Tauri 命令定义在 `src-tauri/src/commands/game_commands.rs`
- 前端 API 封装在 `src/api/gameApi.ts`

### 后端结构 (src-tauri/src/)

```
├── lib.rs          # Tauri 应用入口，注册命令和状态
├── commands/       # Tauri 命令处理
│   └── game_commands.rs  # 游戏命令：new_game, make_move, ai_move, undo_move, get_game_state, get_hint
├── game/           # 游戏核心逻辑
│   ├── types.rs    # 类型定义：Stone, GameMode, AIDifficulty, GameStatus, Position, Move
│   ├── board.rs    # 棋盘逻辑，15x15 棋盘，维护 stone_positions 加速候选位置计算
│   ├── state.rs    # 游戏状态管理，使用 Mutex 保护
│   └── rules.rs    # 胜负判定规则（含单元测试）
└── ai/             # AI 实现
    ├── minimax.rs      # Minimax + Alpha-Beta 剪枝 + 置换表
    ├── evaluator.rs    # 棋局评估（按线扫描）+ 快速位置评估（用于走法排序）
    └── transposition.rs # Zobrist 哈希 + 置换表实现
```

### 前端结构 (src/)

```
├── App.tsx         # 主组件，管理游戏界面切换
├── hooks/
│   └── useGame.ts  # 游戏状态管理 Hook，处理 AI 回合触发、AI 建议
├── api/
│   └── gameApi.ts  # Tauri 命令调用封装
├── types/
│   └── game.ts     # TypeScript 类型定义，与 Rust 类型对应
└── components/     # UI 组件（使用 React.memo 优化渲染）
    ├── Board/      # 棋盘组件（Cell 使用 memo + useCallback，支持显示 AI 建议标记）
    ├── GameInfo/   # 游戏信息显示
    ├── ControlPanel/    # 控制面板（新游戏、悔棋、AI建议）
    └── GameModeSelector/ # 游戏模式选择
```

### 关键设计

**游戏状态同步**：`GameState` 使用 `Mutex<GameStateInner>` 保护，确保线程安全。前端通过 `GameSnapshot` 获取状态快照。

**AI 计算**：AI 使用 `tokio::task::spawn_blocking` 在独立线程执行，避免阻塞 UI。搜索深度由难度决定：Easy=2, Medium=4, Hard=6。

**AI 优化**：
- 迭代加深搜索（Iterative Deepening）：从深度 1 逐步搜索到目标深度，利用浅层结果优化深层搜索的走法排序，找到必胜走法时提前返回
- 置换表（Transposition Table）：使用 Zobrist 哈希缓存已搜索局面，采用固定大小数组（约 100 万条目）+ 位运算取模，避免 HashMap 开销；智能替换策略（相同局面总是更新，不同局面深度更大才替换）
- Killer Move 启发：记录每个深度导致 Beta 剪枝的走法（每层 2 个），优先搜索这些走法以提升剪枝效率
- 走法排序优先级：置换表最佳走法 > Killer Move > `quick_evaluate_position` 快速评估分数
- 按线评估：`evaluate_board` 扫描 88 条线而非 225 个点，避免重复计算
- 候选位置优化：`Board` 维护 `stone_positions` 列表，只遍历已落子位置的邻域；`undo_move` 使用 `swap_remove` 实现 O(1) 复杂度

**悔棋逻辑**：PvAI 模式下悔棋会撤销两步（玩家和 AI 各一步）。

**AI 建议功能**：`get_hint` 命令复用 `find_best_move` 函数为当前玩家计算最佳落子位置，使用当前游戏的 AI 难度设置（PvP 模式默认 Medium）。建议位置在棋盘上显示为闪烁蓝色圆点，落子或悔棋后自动清除。

**类型映射**：Rust 枚举（如 `Stone::Black`）序列化为字符串（`"Black"`），前端使用联合类型对应。

**前端渲染优化**：
- `Cell` 组件使用 `React.memo` 避免不必要重渲染
- `winningPositions` 转为 Set 实现 O(1) 查找
- 回调函数使用 `useCallback` 缓存，确保 memo 生效
