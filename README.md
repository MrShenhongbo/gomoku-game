# 五子棋 (Gomoku)

一个使用 Tauri 2 + React + Rust 构建的现代化五子棋桌面游戏。

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Rust](https://img.shields.io/badge/Rust-1.70+-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

### 游戏模式
- **双人对战 (PvP)** - 两人轮流落子，支持本地对战
- **人机对战 (PvAI)** - 与 AI 对战，三种难度可选（简单/中等/困难）
- **AI 对战 (AIvAI)** - 观看两个 AI 对弈，可调节对弈速度
- **残局练习** - 12 道内置残局题目，三个难度等级

### 游戏功能
- 悔棋 - PvAI 模式自动撤销两步
- 认输 - 主动认输结束对局
- AI 建议 - 获取当前最佳落子位置
- 计时器 - 支持每步限时和总时间两种模式
- 禁手规则 - 可选连珠规则（黑棋禁止三三、四四、长连）
- 棋盘坐标 - 显示 A-O 列和 1-15 行坐标
- 对局复盘 - 游戏结束后可复盘，支持步进浏览和自动播放
- 对局记录 - 自动保存对局历史，支持查看和复盘历史对局
- 对局评分 - 游戏结束时自动评估对局质量（0-100分）
- 棋谱导出 - 导出 JSON 格式棋谱
- AI 分析 - 实时局面评估和推荐走法（侧边栏显示，落子后自动刷新）

### 系统功能
- 音效系统 - 落子、获胜、失败音效
- 主题切换 - 经典、深色、护眼绿三种主题
- 游戏统计 - 记录胜负场次和胜率
- 键盘快捷键 - Ctrl+Z 悔棋, Ctrl+N 新游戏, H 提示

## 技术栈

- **前端**: React 19 + TypeScript + Vite
- **后端**: Rust + Tauri 2
- **AI**: Minimax + Alpha-Beta 剪枝 + 置换表

## 安装与运行

### 环境要求
- Node.js 18+
- Rust 1.70+
- 系统依赖（参考 [Tauri 官方文档](https://tauri.app/v1/guides/getting-started/prerequisites)）

### 开发模式
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

### 构建生产版本
```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/` 目录。

## 项目结构

```
gomoku-game/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── api/                # Tauri API 封装
│   ├── contexts/           # React Context
│   └── types/              # TypeScript 类型
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── commands/       # Tauri 命令
│       ├── game/           # 游戏逻辑
│       └── ai/             # AI 实现
└── package.json
```

## AI 实现

AI 使用经典的 Minimax 算法配合多种优化技术：

- **Alpha-Beta 剪枝** - 减少搜索节点数
- **迭代加深** - 逐步增加搜索深度，利用浅层结果优化排序
- **置换表** - Zobrist 哈希缓存已搜索局面
- **Killer Move** - 记录导致剪枝的走法，优先搜索
- **走法排序** - 按评估分数排序候选走法

搜索深度：
- 简单: 2 层
- 中等: 4 层
- 困难: 6 层

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Z / Cmd+Z | 悔棋 |
| Ctrl+N / Cmd+N | 新游戏 |
| H | AI 建议 |
| Esc | 关闭对话框 |

## 截图

（待添加）

## 许可证

MIT License

## 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [React](https://react.dev/) - 用户界面库
- [Vite](https://vitejs.dev/) - 前端构建工具
