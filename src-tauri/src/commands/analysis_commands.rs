use serde::{Deserialize, Serialize};
use tauri::State;

use crate::ai::evaluator::{evaluate_board, quick_evaluate_position};
use crate::game::board::BOARD_SIZE;
use crate::game::{GameState, GameStatus, Position};

/// 候选走法分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateMove {
    pub position: Position,
    pub score: i32,
    pub coord: String, // 如 "H8"
}

/// 威胁/机会点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatPoint {
    pub position: Position,
    pub threat_type: String, // "threat" 或 "opportunity"
    pub level: i32,          // 威胁等级 1-3
}

/// AI 分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub board_score: i32,
    pub evaluation: String, // "优势"/"劣势"/"均势"
    pub top_moves: Vec<CandidateMove>,
    pub threat_points: Vec<ThreatPoint>,
}

/// 将位置转换为坐标字符串
fn pos_to_coord(pos: Position) -> String {
    let col_char = (b'A' + pos.col as u8) as char;
    let row_num = BOARD_SIZE - pos.row;
    format!("{}{}", col_char, row_num)
}

/// 分析当前局面
#[tauri::command]
pub async fn analyze_position(state: State<'_, GameState>) -> Result<AnalysisResult, String> {
    let (board, current_player, status) = {
        let game = state.inner.lock().unwrap();
        (game.board.clone(), game.current_player, game.status)
    };

    if status != GameStatus::Playing {
        return Err("游戏已结束".to_string());
    }

    // 在独立线程中执行分析
    let result = tokio::task::spawn_blocking(move || {
        // 评估当前局面分数
        let board_score = evaluate_board(&board, current_player);

        // 评估描述
        let evaluation = if board_score > 5000 {
            "大优".to_string()
        } else if board_score > 1000 {
            "优势".to_string()
        } else if board_score > 200 {
            "小优".to_string()
        } else if board_score < -5000 {
            "大劣".to_string()
        } else if board_score < -1000 {
            "劣势".to_string()
        } else if board_score < -200 {
            "小劣".to_string()
        } else {
            "均势".to_string()
        };

        // 获取候选走法并评分
        let mut candidates: Vec<CandidateMove> = Vec::new();
        let opponent = current_player.opponent();

        // 收集所有空位并评估
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                let pos = Position::new(row, col);
                if board.get(pos).is_none() && is_near_stone(&board, pos) {
                    let score = quick_evaluate_position(&board, pos, current_player);
                    candidates.push(CandidateMove {
                        position: pos,
                        score,
                        coord: pos_to_coord(pos),
                    });
                }
            }
        }

        // 按分数排序，取前5个
        candidates.sort_by(|a, b| b.score.cmp(&a.score));
        let top_moves: Vec<CandidateMove> = candidates.into_iter().take(5).collect();

        // 分析威胁点和机会点
        let mut threat_points: Vec<ThreatPoint> = Vec::new();

        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                let pos = Position::new(row, col);
                if board.get(pos).is_none() && is_near_stone(&board, pos) {
                    // 检查对手在此落子的威胁
                    let opponent_score = quick_evaluate_position(&board, pos, opponent);
                    if opponent_score >= 10000 {
                        // 活四或更高
                        threat_points.push(ThreatPoint {
                            position: pos,
                            threat_type: "threat".to_string(),
                            level: 3,
                        });
                    } else if opponent_score >= 1000 {
                        // 冲四或活三
                        threat_points.push(ThreatPoint {
                            position: pos,
                            threat_type: "threat".to_string(),
                            level: 2,
                        });
                    }

                    // 检查己方在此落子的机会
                    let my_score = quick_evaluate_position(&board, pos, current_player);
                    if my_score >= 10000 {
                        threat_points.push(ThreatPoint {
                            position: pos,
                            threat_type: "opportunity".to_string(),
                            level: 3,
                        });
                    } else if my_score >= 1000 {
                        threat_points.push(ThreatPoint {
                            position: pos,
                            threat_type: "opportunity".to_string(),
                            level: 2,
                        });
                    }
                }
            }
        }

        AnalysisResult {
            board_score,
            evaluation,
            top_moves,
            threat_points,
        }
    })
    .await
    .map_err(|e| format!("分析失败: {}", e))?;

    Ok(result)
}

/// 检查位置是否靠近已有棋子
fn is_near_stone(board: &crate::game::board::Board, pos: Position) -> bool {
    let range = 2i32;
    for dr in -range..=range {
        for dc in -range..=range {
            if dr == 0 && dc == 0 {
                continue;
            }
            let r = pos.row as i32 + dr;
            let c = pos.col as i32 + dc;
            if r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
                let check_pos = Position::new(r as usize, c as usize);
                if board.get(check_pos).is_some() {
                    return true;
                }
            }
        }
    }
    // 如果棋盘为空，中心位置返回 true
    if board.stone_positions().is_empty() {
        let center = BOARD_SIZE / 2;
        return pos.row == center && pos.col == center;
    }
    false
}
