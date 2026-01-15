use crate::game::board::{Board, BOARD_SIZE};
use crate::game::types::{Position, Stone};

const DIRECTIONS: [(i32, i32); 4] = [(0, 1), (1, 0), (1, 1), (1, -1)];

// 棋型分数
const FIVE: i32 = 100000;
const LIVE_FOUR: i32 = 10000;
const RUSH_FOUR: i32 = 1000;
const LIVE_THREE: i32 = 1000;
const SLEEP_THREE: i32 = 100;
const LIVE_TWO: i32 = 100;
const SLEEP_TWO: i32 = 10;
const LIVE_ONE: i32 = 10;

pub fn evaluate_board(board: &Board, ai_stone: Stone) -> i32 {
    let mut ai_score = 0;
    let mut opponent_score = 0;

    // 按线扫描而非按点扫描，避免重复计算
    // 水平线 (15条)
    for row in 0..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, row, 0, 0, 1, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }

    // 垂直线 (15条)
    for col in 0..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, 0, col, 1, 0, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }

    // 主对角线 (从左上到右下，共29条)
    // 上半部分（包括主对角线）
    for start_col in 0..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, 0, start_col, 1, 1, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }
    // 下半部分
    for start_row in 1..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, start_row, 0, 1, 1, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }

    // 副对角线 (从右上到左下，共29条)
    // 上半部分（包括副对角线）
    for start_col in 0..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, 0, start_col, 1, -1, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }
    // 下半部分
    for start_row in 1..BOARD_SIZE {
        let (ai, opp) = evaluate_line(board, start_row, BOARD_SIZE - 1, 1, -1, ai_stone);
        ai_score += ai;
        opponent_score += opp;
    }

    ai_score - opponent_score - opponent_score / 10
}

/// 评估一条线上的所有棋型
/// 返回 (ai_score, opponent_score)
fn evaluate_line(
    board: &Board,
    start_row: usize,
    start_col: usize,
    dr: i32,
    dc: i32,
    ai_stone: Stone,
) -> (i32, i32) {
    let mut ai_score = 0;
    let mut opponent_score = 0;

    let mut r = start_row as i32;
    let mut c = start_col as i32;

    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        let pos = Position::new(r as usize, c as usize);

        if let Some(stone) = board.get(pos) {
            // 找到一个棋子，分析从这个位置开始的连续棋型
            let (count, open_start) = count_backward(board, pos, stone, dr, dc);

            // 只有当这是连续棋子的起点时才计算（避免重复）
            if count == 0 {
                let (forward_count, open_end) = count_forward(board, pos, stone, dr, dc);
                let total_count = 1 + forward_count;
                let open_ends = (if open_start { 1 } else { 0 }) + (if open_end { 1 } else { 0 });

                let pattern = LinePattern {
                    count: total_count,
                    open_ends,
                };
                let score = pattern_score(&pattern);

                if stone == ai_stone {
                    ai_score += score;
                } else {
                    opponent_score += score;
                }
            }
        }

        r += dr;
        c += dc;
    }

    (ai_score, opponent_score)
}

/// 向后计数（检查是否是连续棋子的起点）
fn count_backward(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> (usize, bool) {
    let r = pos.row as i32 - dr;
    let c = pos.col as i32 - dc;

    if r < 0 || r >= BOARD_SIZE as i32 || c < 0 || c >= BOARD_SIZE as i32 {
        return (0, false); // 边界
    }

    let check_pos = Position::new(r as usize, c as usize);
    match board.get(check_pos) {
        Some(s) if s == stone => (1, false), // 不是起点
        Some(_) => (0, false),               // 被对方堵住
        None => (0, true),                   // 开放端
    }
}

/// 向前计数连续棋子
fn count_forward(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> (usize, bool) {
    let mut count = 0;
    let mut r = pos.row as i32 + dr;
    let mut c = pos.col as i32 + dc;

    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        let check_pos = Position::new(r as usize, c as usize);
        match board.get(check_pos) {
            Some(s) if s == stone => {
                count += 1;
                r += dr;
                c += dc;
            }
            Some(_) => return (count, false), // 被对方堵住
            None => return (count, true),     // 开放端
        }
    }

    (count, false) // 到达边界
}

#[derive(Debug)]
struct LinePattern {
    count: usize,
    open_ends: usize,
}

fn pattern_score(pattern: &LinePattern) -> i32 {
    match (pattern.count, pattern.open_ends) {
        (5.., _) => FIVE,
        (4, 2) => LIVE_FOUR,
        (4, 1) => RUSH_FOUR,
        (4, 0) => 0,
        (3, 2) => LIVE_THREE,
        (3, 1) => SLEEP_THREE,
        (3, 0) => 0,
        (2, 2) => LIVE_TWO,
        (2, 1) => SLEEP_TWO,
        (2, 0) => 0,
        (1, 2) => LIVE_ONE,
        _ => 0,
    }
}

/// 快速评估单个位置的价值（用于候选位置排序）
/// 评估如果在该位置落子，能形成的棋型价值
pub fn quick_evaluate_position(board: &Board, pos: Position, stone: Stone) -> i32 {
    let mut score = 0;
    let opponent = stone.opponent();

    // 评估己方在此落子的价值
    for &(dr, dc) in &DIRECTIONS {
        let pattern = analyze_line_for_empty(board, pos, stone, dr, dc);
        score += pattern_score(&pattern) * 2; // 进攻权重
    }

    // 评估阻止对方在此落子的价值
    for &(dr, dc) in &DIRECTIONS {
        let pattern = analyze_line_for_empty(board, pos, opponent, dr, dc);
        score += pattern_score(&pattern); // 防守权重
    }

    // 中心位置加分
    const CENTER: i32 = (BOARD_SIZE / 2) as i32;
    let dist_to_center = (pos.row as i32 - CENTER).abs() + (pos.col as i32 - CENTER).abs();
    score += (10 - dist_to_center).max(0);

    score
}

/// 分析空位置如果落子后能形成的棋型
fn analyze_line_for_empty(
    board: &Board,
    pos: Position,
    stone: Stone,
    dr: i32,
    dc: i32,
) -> LinePattern {
    let mut count = 1; // 假设该位置已落子
    let mut open_ends = 0;

    // 正向扫描（复用 count_forward）
    let (c1, open1) = count_forward(board, pos, stone, dr, dc);
    count += c1;
    if open1 {
        open_ends += 1;
    }

    // 反向扫描
    let (c2, open2) = count_forward(board, pos, stone, -dr, -dc);
    count += c2;
    if open2 {
        open_ends += 1;
    }

    LinePattern { count, open_ends }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_board(positions: &[(usize, usize, Stone)]) -> Board {
        let mut board = Board::new();
        for &(row, col, stone) in positions {
            board.place_stone(Position::new(row, col), stone).unwrap();
        }
        board
    }

    #[test]
    fn test_evaluate_empty_board() {
        let board = Board::new();
        let score = evaluate_board(&board, Stone::Black);
        assert_eq!(score, 0);
    }

    #[test]
    fn test_evaluate_five_in_row() {
        let board = setup_board(&[
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        let score = evaluate_board(&board, Stone::Black);
        // 五连应该得到很高的分数
        assert!(score >= FIVE);
    }

    #[test]
    fn test_evaluate_live_four() {
        // 活四：四子连续，两端开放
        let board = setup_board(&[
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        let score = evaluate_board(&board, Stone::Black);
        // 活四应该得到较高分数
        assert!(score >= LIVE_FOUR);
    }

    #[test]
    fn test_evaluate_opponent_threat() {
        // 对手有活四，己方分数应该为负
        let board = setup_board(&[
            (7, 4, Stone::White),
            (7, 5, Stone::White),
            (7, 6, Stone::White),
            (7, 7, Stone::White),
        ]);
        let score = evaluate_board(&board, Stone::Black);
        // 对手有活四，己方评估应该为负
        assert!(score < 0);
    }

    #[test]
    fn test_evaluate_live_three() {
        // 活三：三子连续，两端开放
        let board = setup_board(&[
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        let score = evaluate_board(&board, Stone::Black);
        assert!(score >= LIVE_THREE);
    }

    #[test]
    fn test_quick_evaluate_position_center() {
        let board = Board::new();
        let center_score = quick_evaluate_position(&board, Position::new(7, 7), Stone::Black);
        let corner_score = quick_evaluate_position(&board, Position::new(0, 0), Stone::Black);
        // 中心位置应该比角落位置分数高
        assert!(center_score > corner_score);
    }

    #[test]
    fn test_quick_evaluate_position_threat() {
        // 有三子连续，在末端落子形成四
        let board = setup_board(&[
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
        ]);
        // 在 (7, 7) 落子可以形成四
        let score = quick_evaluate_position(&board, Position::new(7, 7), Stone::Black);
        // 应该得到较高分数
        assert!(score > 100);
    }

    #[test]
    fn test_quick_evaluate_position_defense() {
        // 对手有三子连续，需要防守
        let board = setup_board(&[
            (7, 4, Stone::White),
            (7, 5, Stone::White),
            (7, 6, Stone::White),
        ]);
        // 在 (7, 7) 落子可以阻挡对手
        let score = quick_evaluate_position(&board, Position::new(7, 7), Stone::Black);
        // 防守位置也应该有分数
        assert!(score > 0);
    }

    #[test]
    fn test_pattern_score_five() {
        let pattern = LinePattern {
            count: 5,
            open_ends: 0,
        };
        assert_eq!(pattern_score(&pattern), FIVE);
    }

    #[test]
    fn test_pattern_score_live_four() {
        let pattern = LinePattern {
            count: 4,
            open_ends: 2,
        };
        assert_eq!(pattern_score(&pattern), LIVE_FOUR);
    }

    #[test]
    fn test_pattern_score_rush_four() {
        let pattern = LinePattern {
            count: 4,
            open_ends: 1,
        };
        assert_eq!(pattern_score(&pattern), RUSH_FOUR);
    }

    #[test]
    fn test_pattern_score_dead_four() {
        let pattern = LinePattern {
            count: 4,
            open_ends: 0,
        };
        assert_eq!(pattern_score(&pattern), 0);
    }

    #[test]
    fn test_pattern_score_live_three() {
        let pattern = LinePattern {
            count: 3,
            open_ends: 2,
        };
        assert_eq!(pattern_score(&pattern), LIVE_THREE);
    }

    #[test]
    fn test_pattern_score_sleep_three() {
        let pattern = LinePattern {
            count: 3,
            open_ends: 1,
        };
        assert_eq!(pattern_score(&pattern), SLEEP_THREE);
    }

    #[test]
    fn test_evaluate_symmetric() {
        // 对称局面，黑白互换后分数应该相反
        let board = setup_board(&[
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        let black_score = evaluate_board(&board, Stone::Black);
        let white_score = evaluate_board(&board, Stone::White);
        // 黑棋视角分数为正，白棋视角分数为负
        assert!(black_score > 0);
        assert!(white_score < 0);
    }
}
