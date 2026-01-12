use serde::{Deserialize, Serialize};

/// 残局题目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Puzzle {
    pub id: u32,
    pub name: String,
    pub difficulty: PuzzleDifficulty,
    pub description: String,
    /// 初始棋盘状态，格式：[(row, col, "Black"/"White"), ...]
    pub initial_stones: Vec<(usize, usize, String)>,
    /// 玩家执子颜色
    pub player_stone: String,
    /// 正确答案序列（可能有多个正确走法）
    pub solutions: Vec<Vec<(usize, usize)>>,
    /// 提示
    pub hint: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PuzzleDifficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PuzzleListItem {
    pub id: u32,
    pub name: String,
    pub difficulty: PuzzleDifficulty,
    pub description: String,
}

/// 获取所有残局列表
#[tauri::command]
pub fn get_puzzle_list() -> Vec<PuzzleListItem> {
    get_all_puzzles()
        .into_iter()
        .map(|p| PuzzleListItem {
            id: p.id,
            name: p.name,
            difficulty: p.difficulty,
            description: p.description,
        })
        .collect()
}

/// 获取指定残局详情
#[tauri::command]
pub fn get_puzzle(id: u32) -> Option<Puzzle> {
    get_all_puzzles().into_iter().find(|p| p.id == id)
}

/// 检查走法是否正确
#[tauri::command]
pub fn check_puzzle_move(id: u32, moves: Vec<(usize, usize)>) -> PuzzleCheckResult {
    let puzzle = match get_all_puzzles().into_iter().find(|p| p.id == id) {
        Some(p) => p,
        None => {
            return PuzzleCheckResult {
                correct: false,
                complete: false,
                message: "题目不存在".to_string(),
            }
        }
    };

    // 检查是否匹配任一解法
    for solution in &puzzle.solutions {
        if moves.len() <= solution.len() {
            let matches = moves
                .iter()
                .zip(solution.iter())
                .all(|(m, s)| m.0 == s.0 && m.1 == s.1);
            if matches {
                if moves.len() == solution.len() {
                    return PuzzleCheckResult {
                        correct: true,
                        complete: true,
                        message: "恭喜！完成残局！".to_string(),
                    };
                } else {
                    return PuzzleCheckResult {
                        correct: true,
                        complete: false,
                        message: "正确，继续！".to_string(),
                    };
                }
            }
        }
    }

    PuzzleCheckResult {
        correct: false,
        complete: false,
        message: "走法不正确，请重试".to_string(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PuzzleCheckResult {
    pub correct: bool,
    pub complete: bool,
    pub message: String,
}

/// 内置残局题库
fn get_all_puzzles() -> Vec<Puzzle> {
    vec![
        // 简单难度 - 直接连五
        Puzzle {
            id: 1,
            name: "直接连五".to_string(),
            difficulty: PuzzleDifficulty::Easy,
            description: "黑棋一步连五获胜".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (7, 9, "Black".to_string()),
                (7, 10, "Black".to_string()),
                (6, 7, "White".to_string()),
                (6, 8, "White".to_string()),
                (8, 9, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 11)], vec![(7, 6)]],
            hint: "找到能直接连成五子的位置".to_string(),
        },
        Puzzle {
            id: 2,
            name: "斜线连五".to_string(),
            difficulty: PuzzleDifficulty::Easy,
            description: "黑棋斜线连五".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (8, 8, "Black".to_string()),
                (9, 9, "Black".to_string()),
                (10, 10, "Black".to_string()),
                (6, 7, "White".to_string()),
                (7, 8, "White".to_string()),
                (8, 7, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(6, 6)], vec![(11, 11)]],
            hint: "观察斜线方向".to_string(),
        },
        Puzzle {
            id: 3,
            name: "防守反击".to_string(),
            difficulty: PuzzleDifficulty::Easy,
            description: "白棋一步连五".to_string(),
            initial_stones: vec![
                (7, 5, "White".to_string()),
                (7, 6, "White".to_string()),
                (7, 7, "White".to_string()),
                (7, 8, "White".to_string()),
                (6, 5, "Black".to_string()),
                (6, 6, "Black".to_string()),
                (6, 7, "Black".to_string()),
                (8, 8, "Black".to_string()),
            ],
            player_stone: "White".to_string(),
            solutions: vec![vec![(7, 9)], vec![(7, 4)]],
            hint: "白棋已有四子连线".to_string(),
        },
        // 中等难度 - 活四/冲四
        Puzzle {
            id: 4,
            name: "活四必胜".to_string(),
            difficulty: PuzzleDifficulty::Medium,
            description: "黑棋形成活四获胜".to_string(),
            initial_stones: vec![
                (7, 6, "Black".to_string()),
                (7, 7, "Black".to_string()),
                (7, 9, "Black".to_string()),
                (6, 6, "White".to_string()),
                (6, 7, "White".to_string()),
                (6, 9, "White".to_string()),
                (8, 7, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 8)]],
            hint: "在中间位置落子形成活四".to_string(),
        },
        Puzzle {
            id: 5,
            name: "双冲四".to_string(),
            difficulty: PuzzleDifficulty::Medium,
            description: "黑棋形成双冲四必胜".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (8, 8, "Black".to_string()),
                (9, 9, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (7, 9, "Black".to_string()),
                (6, 6, "White".to_string()),
                (10, 10, "White".to_string()),
                (6, 8, "White".to_string()),
                (6, 10, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 10)]],
            hint: "找到同时形成两个冲四的位置".to_string(),
        },
        Puzzle {
            id: 6,
            name: "冲四活三".to_string(),
            difficulty: PuzzleDifficulty::Medium,
            description: "黑棋冲四活三必胜".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (7, 9, "Black".to_string()),
                (8, 8, "Black".to_string()),
                (9, 8, "Black".to_string()),
                (6, 7, "White".to_string()),
                (6, 10, "White".to_string()),
                (10, 8, "White".to_string()),
                (7, 11, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 10)]],
            hint: "同时形成冲四和活三".to_string(),
        },
        Puzzle {
            id: 7,
            name: "活三进攻".to_string(),
            difficulty: PuzzleDifficulty::Medium,
            description: "黑棋形成活三迫使白棋防守".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (8, 9, "Black".to_string()),
                (6, 6, "White".to_string()),
                (6, 9, "White".to_string()),
                (9, 9, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 9)]],
            hint: "形成活三的同时连接棋子".to_string(),
        },
        // 困难难度 - 多步杀棋
        Puzzle {
            id: 8,
            name: "三步杀".to_string(),
            difficulty: PuzzleDifficulty::Hard,
            description: "黑棋三步内获胜".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (8, 7, "Black".to_string()),
                (8, 9, "Black".to_string()),
                (6, 6, "White".to_string()),
                (6, 8, "White".to_string()),
                (9, 7, "White".to_string()),
                (9, 9, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 9), (8, 8)]],
            hint: "先形成活三，再连续进攻".to_string(),
        },
        Puzzle {
            id: 9,
            name: "VCF进攻".to_string(),
            difficulty: PuzzleDifficulty::Hard,
            description: "黑棋连续冲四获胜".to_string(),
            initial_stones: vec![
                (7, 5, "Black".to_string()),
                (7, 6, "Black".to_string()),
                (7, 7, "Black".to_string()),
                (8, 8, "Black".to_string()),
                (9, 9, "Black".to_string()),
                (6, 5, "White".to_string()),
                (6, 6, "White".to_string()),
                (6, 7, "White".to_string()),
                (7, 9, "White".to_string()),
                (10, 10, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 8), (7, 4)]],
            hint: "利用冲四迫使对手防守，再找下一个冲四点".to_string(),
        },
        Puzzle {
            id: 10,
            name: "复杂局面".to_string(),
            difficulty: PuzzleDifficulty::Hard,
            description: "黑棋找到必胜走法".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (7, 8, "Black".to_string()),
                (8, 6, "Black".to_string()),
                (8, 7, "Black".to_string()),
                (9, 5, "Black".to_string()),
                (6, 7, "White".to_string()),
                (6, 8, "White".to_string()),
                (7, 6, "White".to_string()),
                (8, 8, "White".to_string()),
                (9, 8, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(7, 9), (6, 6)]],
            hint: "观察多个方向的进攻可能".to_string(),
        },
        Puzzle {
            id: 11,
            name: "绝杀局".to_string(),
            difficulty: PuzzleDifficulty::Hard,
            description: "白棋必胜局面".to_string(),
            initial_stones: vec![
                (7, 6, "White".to_string()),
                (7, 7, "White".to_string()),
                (7, 8, "White".to_string()),
                (8, 7, "White".to_string()),
                (9, 7, "White".to_string()),
                (6, 6, "Black".to_string()),
                (6, 7, "Black".to_string()),
                (6, 8, "Black".to_string()),
                (8, 6, "Black".to_string()),
                (9, 6, "Black".to_string()),
                (7, 10, "Black".to_string()),
            ],
            player_stone: "White".to_string(),
            solutions: vec![vec![(7, 9), (10, 7)]],
            hint: "白棋有两个方向的进攻".to_string(),
        },
        Puzzle {
            id: 12,
            name: "防守中的进攻".to_string(),
            difficulty: PuzzleDifficulty::Hard,
            description: "在防守的同时寻找进攻机会".to_string(),
            initial_stones: vec![
                (7, 7, "Black".to_string()),
                (8, 7, "Black".to_string()),
                (9, 7, "Black".to_string()),
                (7, 9, "Black".to_string()),
                (8, 9, "Black".to_string()),
                (6, 7, "White".to_string()),
                (7, 8, "White".to_string()),
                (8, 8, "White".to_string()),
                (9, 8, "White".to_string()),
                (10, 7, "White".to_string()),
            ],
            player_stone: "Black".to_string(),
            solutions: vec![vec![(9, 9), (6, 9)]],
            hint: "利用对手的弱点反击".to_string(),
        },
    ]
}
