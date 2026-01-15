use crate::game::board::Board;
use crate::game::is_win;
use crate::game::types::{Position, Stone};

use super::evaluator::{evaluate_board, quick_evaluate_position};
use super::transposition::{TTEntry, TTFlag, TranspositionTable, ZobristHash};

const MAX_SCORE: i32 = 1_000_000;
const MIN_SCORE: i32 = -1_000_000;
const MAX_DEPTH: usize = 16; // Killer Move 表的最大深度

/// 搜索上下文，封装搜索过程中需要的可变状态
struct SearchContext<'a> {
    board: &'a mut Board,
    zobrist: &'a mut ZobristHash,
    tt: &'a mut TranspositionTable,
    killer_moves: &'a mut KillerMoves,
    ai_stone: Stone,
}

/// Killer Move 表：记录每个深度导致剪枝的走法
struct KillerMoves {
    moves: [[Option<Position>; 2]; MAX_DEPTH], // 每个深度存储 2 个 killer move
}

impl KillerMoves {
    fn new() -> Self {
        Self {
            moves: [[None; 2]; MAX_DEPTH],
        }
    }

    /// 添加一个 killer move
    fn add(&mut self, depth: usize, pos: Position) {
        if depth >= MAX_DEPTH {
            return;
        }
        // 如果已经存在，不重复添加
        if self.moves[depth][0] == Some(pos) {
            return;
        }
        // 移动到第一个位置，原来的第一个移到第二个
        self.moves[depth][1] = self.moves[depth][0];
        self.moves[depth][0] = Some(pos);
    }

    /// 获取指定深度的 killer moves
    fn get(&self, depth: usize) -> [Option<Position>; 2] {
        if depth >= MAX_DEPTH {
            [None, None]
        } else {
            self.moves[depth]
        }
    }
}

/// 对候选位置按评估分数降序排序
/// 优先级：置换表最佳走法 > Killer Move > 快速评估分数
fn sort_candidates(
    board: &Board,
    candidates: Vec<Position>,
    stone: Stone,
    tt_best_move: Option<Position>,
    killer_moves: [Option<Position>; 2],
) -> Vec<Position> {
    let mut scored: Vec<(Position, i32)> = candidates
        .into_iter()
        .map(|pos| {
            let score = if Some(pos) == tt_best_move {
                i32::MAX // 置换表最佳走法最高优先级
            } else if Some(pos) == killer_moves[0] {
                i32::MAX - 1 // 第一个 killer move
            } else if Some(pos) == killer_moves[1] {
                i32::MAX - 2 // 第二个 killer move
            } else {
                quick_evaluate_position(board, pos, stone)
            };
            (pos, score)
        })
        .collect();

    scored.sort_by(|a, b| b.1.cmp(&a.1)); // 降序排列
    scored.into_iter().map(|(pos, _)| pos).collect()
}

/// 使用迭代加深搜索找到最佳走法
pub fn find_best_move(board: &Board, ai_stone: Stone, max_depth: u32) -> Option<Position> {
    let candidates = board.get_candidate_positions();
    if candidates.is_empty() {
        return None;
    }

    // 只有一个候选位置时直接返回
    if candidates.len() == 1 {
        return Some(candidates[0]);
    }

    // 初始化置换表和 Zobrist 哈希
    let mut tt = TranspositionTable::default();
    let mut zobrist = ZobristHash::new();
    let mut killer_moves = KillerMoves::new();

    // 根据当前棋盘状态初始化哈希值（只遍历已落子位置）
    for &pos in board.stone_positions() {
        if let Some(stone) = board.get(pos) {
            zobrist.update(pos, stone);
        }
    }

    let mut best_move = candidates[0];

    // 迭代加深：从深度 1 开始逐步增加
    for depth in 1..=max_depth {
        let mut board_clone = board.clone();

        // 使用上一轮的最佳走法作为第一个搜索的位置
        let sorted_candidates = {
            let mut cands = candidates.clone();
            // 把上一轮的最佳走法移到最前面
            if let Some(idx) = cands.iter().position(|&p| p == best_move) {
                cands.swap(0, idx);
            }
            sort_candidates(&board_clone, cands, ai_stone, Some(best_move), [None, None])
        };

        let mut current_best = sorted_candidates[0];
        let mut best_score = MIN_SCORE;
        let mut alpha = MIN_SCORE;

        for pos in sorted_candidates {
            if board_clone.place_stone(pos, ai_stone).is_ok() {
                zobrist.update(pos, ai_stone);

                // 检查是否直接获胜
                if is_win(&board_clone, pos) {
                    return Some(pos);
                }

                let mut ctx = SearchContext {
                    board: &mut board_clone,
                    zobrist: &mut zobrist,
                    tt: &mut tt,
                    killer_moves: &mut killer_moves,
                    ai_stone,
                };

                let score = minimax_with_tt(
                    &mut ctx,
                    depth.saturating_sub(1),
                    alpha,
                    MAX_SCORE,
                    false,
                );

                ctx.zobrist.update(pos, ai_stone); // XOR 撤销
                ctx.board.undo_move(pos);

                if score > best_score {
                    best_score = score;
                    current_best = pos;
                    alpha = score;
                }

                // 找到必胜走法，提前返回
                if score >= MAX_SCORE - 100 {
                    return Some(current_best);
                }
            }
        }

        best_move = current_best;
    }

    Some(best_move)
}

fn minimax_with_tt(
    ctx: &mut SearchContext,
    depth: u32,
    mut alpha: i32,
    mut beta: i32,
    is_maximizing: bool,
) -> i32 {
    let original_alpha = alpha;
    let hash = ctx.zobrist.hash();

    // 查询置换表
    let mut tt_best_move = None;
    if let Some(entry) = ctx.tt.get(hash) {
        if entry.depth >= depth {
            match entry.flag {
                TTFlag::Exact => return entry.score,
                TTFlag::LowerBound => alpha = alpha.max(entry.score),
                TTFlag::UpperBound => beta = beta.min(entry.score),
            }
            if alpha >= beta {
                return entry.score;
            }
        }
        tt_best_move = entry.best_move;
    }

    if depth == 0 || ctx.board.is_full() {
        return evaluate_board(ctx.board, ctx.ai_stone);
    }

    let candidates = ctx.board.get_candidate_positions();
    if candidates.is_empty() {
        return evaluate_board(ctx.board, ctx.ai_stone);
    }

    let current_stone = if is_maximizing {
        ctx.ai_stone
    } else {
        ctx.ai_stone.opponent()
    };

    // 获取当前深度的 killer moves
    let killers = ctx.killer_moves.get(depth as usize);

    // 对候选位置排序
    let sorted_candidates = sort_candidates(ctx.board, candidates, current_stone, tt_best_move, killers);

    let mut best_move = sorted_candidates[0];
    let mut best_score = if is_maximizing { MIN_SCORE } else { MAX_SCORE };

    for pos in sorted_candidates {
        if ctx.board.place_stone(pos, current_stone).is_ok() {
            ctx.zobrist.update(pos, current_stone);

            if is_win(ctx.board, pos) {
                ctx.zobrist.update(pos, current_stone);
                ctx.board.undo_move(pos);
                let win_score = if is_maximizing {
                    MAX_SCORE - (10 - depth as i32)
                } else {
                    MIN_SCORE + (10 - depth as i32)
                };
                return win_score;
            }

            let eval = minimax_with_tt(
                ctx,
                depth - 1,
                alpha,
                beta,
                !is_maximizing,
            );

            ctx.zobrist.update(pos, current_stone);
            ctx.board.undo_move(pos);

            if is_maximizing {
                if eval > best_score {
                    best_score = eval;
                    best_move = pos;
                }
                alpha = alpha.max(eval);
            } else {
                if eval < best_score {
                    best_score = eval;
                    best_move = pos;
                }
                beta = beta.min(eval);
            }

            if beta <= alpha {
                // 记录导致剪枝的走法为 killer move
                ctx.killer_moves.add(depth as usize, pos);
                break;
            }
        }
    }

    // 存储到置换表
    let flag = if best_score <= original_alpha {
        TTFlag::UpperBound
    } else if best_score >= beta {
        TTFlag::LowerBound
    } else {
        TTFlag::Exact
    };

    ctx.tt.store(TTEntry {
        hash,
        depth,
        score: best_score,
        flag,
        best_move: Some(best_move),
    });

    best_score
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::board::BOARD_SIZE;

    fn setup_board(positions: &[(usize, usize, Stone)]) -> Board {
        let mut board = Board::new();
        for &(row, col, stone) in positions {
            board.place_stone(Position::new(row, col), stone).unwrap();
        }
        board
    }

    #[test]
    fn test_find_best_move_empty_board() {
        let board = Board::new();
        let best = find_best_move(&board, Stone::Black, 2);
        assert!(best.is_some());
        // 空棋盘应该选择中心附近
        let pos = best.unwrap();
        let center = BOARD_SIZE / 2;
        assert!(pos.row >= center - 2 && pos.row <= center + 2);
        assert!(pos.col >= center - 2 && pos.col <= center + 2);
    }

    #[test]
    fn test_find_best_move_takes_win() {
        // 黑棋有四连，应该完成五连获胜
        let board = setup_board(&[
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (6, 3, Stone::White),
            (6, 4, Stone::White),
            (6, 5, Stone::White),
        ]);
        let best = find_best_move(&board, Stone::Black, 4);
        assert!(best.is_some());
        let pos = best.unwrap();
        // 应该在 (7, 2) 或 (7, 7) 完成五连
        assert!(pos == Position::new(7, 2) || pos == Position::new(7, 7));
    }

    #[test]
    fn test_find_best_move_blocks_win() {
        // 白棋有四连，黑棋应该阻挡
        let board = setup_board(&[
            (7, 3, Stone::White),
            (7, 4, Stone::White),
            (7, 5, Stone::White),
            (7, 6, Stone::White),
            (6, 3, Stone::Black),
            (6, 4, Stone::Black),
            (6, 5, Stone::Black),
        ]);
        let best = find_best_move(&board, Stone::Black, 4);
        assert!(best.is_some());
        let pos = best.unwrap();
        // 应该阻挡在 (7, 2) 或 (7, 7)
        assert!(pos == Position::new(7, 2) || pos == Position::new(7, 7));
    }

    #[test]
    fn test_find_best_move_single_candidate() {
        // 只有一个空位
        let mut board = Board::new();
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                if row != 7 || col != 7 {
                    let stone = if (row + col) % 2 == 0 {
                        Stone::Black
                    } else {
                        Stone::White
                    };
                    board.place_stone(Position::new(row, col), stone).unwrap();
                }
            }
        }
        let best = find_best_move(&board, Stone::Black, 2);
        assert_eq!(best, Some(Position::new(7, 7)));
    }

    #[test]
    fn test_find_best_move_returns_some() {
        let board = setup_board(&[
            (7, 7, Stone::Black),
            (7, 8, Stone::White),
        ]);
        let best = find_best_move(&board, Stone::Black, 2);
        assert!(best.is_some());
    }

    #[test]
    fn test_killer_moves_new() {
        let km = KillerMoves::new();
        let moves = km.get(0);
        assert_eq!(moves[0], None);
        assert_eq!(moves[1], None);
    }

    #[test]
    fn test_killer_moves_add() {
        let mut km = KillerMoves::new();
        km.add(3, Position::new(7, 7));
        let moves = km.get(3);
        assert_eq!(moves[0], Some(Position::new(7, 7)));
        assert_eq!(moves[1], None);
    }

    #[test]
    fn test_killer_moves_replacement() {
        let mut km = KillerMoves::new();
        km.add(3, Position::new(7, 7));
        km.add(3, Position::new(7, 8));
        let moves = km.get(3);
        // 新的在前，旧的在后
        assert_eq!(moves[0], Some(Position::new(7, 8)));
        assert_eq!(moves[1], Some(Position::new(7, 7)));
    }

    #[test]
    fn test_killer_moves_no_duplicate() {
        let mut km = KillerMoves::new();
        km.add(3, Position::new(7, 7));
        km.add(3, Position::new(7, 7)); // 重复添加
        let moves = km.get(3);
        assert_eq!(moves[0], Some(Position::new(7, 7)));
        assert_eq!(moves[1], None); // 不应该有重复
    }

    #[test]
    fn test_killer_moves_out_of_bounds() {
        let mut km = KillerMoves::new();
        km.add(MAX_DEPTH + 1, Position::new(7, 7)); // 超出范围
        let moves = km.get(MAX_DEPTH + 1);
        assert_eq!(moves[0], None);
        assert_eq!(moves[1], None);
    }

    #[test]
    fn test_sort_candidates_tt_best_first() {
        let board = Board::new();
        let candidates = vec![
            Position::new(7, 7),
            Position::new(7, 8),
            Position::new(7, 9),
        ];
        let sorted = sort_candidates(
            &board,
            candidates,
            Stone::Black,
            Some(Position::new(7, 9)), // TT 最佳走法
            [None, None],
        );
        // TT 最佳走法应该排在第一位
        assert_eq!(sorted[0], Position::new(7, 9));
    }

    #[test]
    fn test_sort_candidates_killer_priority() {
        let board = Board::new();
        let candidates = vec![
            Position::new(0, 0),
            Position::new(7, 8),
            Position::new(7, 9),
        ];
        let sorted = sort_candidates(
            &board,
            candidates,
            Stone::Black,
            None,
            [Some(Position::new(7, 8)), Some(Position::new(7, 9))],
        );
        // Killer moves 应该排在前面
        assert_eq!(sorted[0], Position::new(7, 8));
        assert_eq!(sorted[1], Position::new(7, 9));
    }
}
