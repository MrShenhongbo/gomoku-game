use super::board::{Board, BOARD_SIZE};
use super::types::{GameStatus, Position, RuleSet, Stone};
use serde::{Deserialize, Serialize};

const DIRECTIONS: [(i32, i32); 4] = [
    (0, 1),   // 水平
    (1, 0),   // 垂直
    (1, 1),   // 主对角线
    (1, -1),  // 副对角线
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameResult {
    pub status: GameStatus,
    pub winning_positions: Option<Vec<Position>>,
}

/// 禁手类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FoulType {
    Overline,    // 长连禁手（超过5子）
    DoubleFour,  // 四四禁手
    DoubleThree, // 三三禁手
}

pub fn check_win(board: &Board, last_move: Position) -> Option<GameResult> {
    let stone = board.get(last_move)?;

    for &(dr, dc) in &DIRECTIONS {
        if let Some(positions) = check_direction(board, last_move, stone, dr, dc) {
            let status = match stone {
                Stone::Black => GameStatus::BlackWin,
                Stone::White => GameStatus::WhiteWin,
            };
            return Some(GameResult {
                status,
                winning_positions: Some(positions),
            });
        }
    }

    if board.is_full() {
        return Some(GameResult {
            status: GameStatus::Draw,
            winning_positions: None,
        });
    }

    None
}

fn check_direction(
    board: &Board,
    pos: Position,
    stone: Stone,
    dr: i32,
    dc: i32,
) -> Option<Vec<Position>> {
    let mut positions = vec![pos];

    // 正向检查
    let mut r = pos.row as i32 + dr;
    let mut c = pos.col as i32 + dc;
    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        let check_pos = Position::new(r as usize, c as usize);
        if board.get(check_pos) == Some(stone) {
            positions.push(check_pos);
            r += dr;
            c += dc;
        } else {
            break;
        }
    }

    // 反向检查
    r = pos.row as i32 - dr;
    c = pos.col as i32 - dc;
    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        let check_pos = Position::new(r as usize, c as usize);
        if board.get(check_pos) == Some(stone) {
            positions.push(check_pos);
            r -= dr;
            c -= dc;
        } else {
            break;
        }
    }

    if positions.len() >= 5 {
        Some(positions)
    } else {
        None
    }
}

pub fn is_win(board: &Board, last_move: Position) -> bool {
    let Some(stone) = board.get(last_move) else {
        return false;
    };

    for &(dr, dc) in &DIRECTIONS {
        if count_consecutive(board, last_move, stone, dr, dc) >= 5 {
            return true;
        }
    }
    false
}

fn count_consecutive(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> usize {
    let mut count = 1;

    // 正向
    let mut r = pos.row as i32 + dr;
    let mut c = pos.col as i32 + dc;
    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        if board.get(Position::new(r as usize, c as usize)) == Some(stone) {
            count += 1;
            r += dr;
            c += dc;
        } else {
            break;
        }
    }

    // 反向
    r = pos.row as i32 - dr;
    c = pos.col as i32 - dc;
    while r >= 0 && r < BOARD_SIZE as i32 && c >= 0 && c < BOARD_SIZE as i32 {
        if board.get(Position::new(r as usize, c as usize)) == Some(stone) {
            count += 1;
            r -= dr;
            c -= dc;
        } else {
            break;
        }
    }

    count
}

/// 检查是否为禁手（仅对黑棋生效）
/// 返回 Some(FoulType) 表示禁手，None 表示合法
pub fn check_foul(board: &Board, pos: Position, rule_set: RuleSet) -> Option<FoulType> {
    // 标准规则无禁手
    if rule_set == RuleSet::Standard {
        return None;
    }

    // 只有黑棋有禁手
    if board.get(pos) != Some(Stone::Black) {
        return None;
    }

    // 检查长连禁手（超过5子）
    if check_overline(board, pos) {
        return Some(FoulType::Overline);
    }

    // 检查四四禁手
    if check_double_four(board, pos) {
        return Some(FoulType::DoubleFour);
    }

    // 检查三三禁手
    if check_double_three(board, pos) {
        return Some(FoulType::DoubleThree);
    }

    None
}

/// 检查长连禁手（任意方向超过5子连续）
fn check_overline(board: &Board, pos: Position) -> bool {
    let stone = Stone::Black;
    for &(dr, dc) in &DIRECTIONS {
        if count_consecutive(board, pos, stone, dr, dc) > 5 {
            return true;
        }
    }
    false
}

/// 检查四四禁手（两个或以上的四）
fn check_double_four(board: &Board, pos: Position) -> bool {
    let mut four_count = 0;
    let stone = Stone::Black;

    for &(dr, dc) in &DIRECTIONS {
        if is_four(board, pos, stone, dr, dc) {
            four_count += 1;
        }
    }

    four_count >= 2
}

/// 检查是否形成四（4子连续，有一端可以成五）
fn is_four(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> bool {
    let count = count_consecutive(board, pos, stone, dr, dc);
    if count != 4 {
        return false;
    }

    // 检查两端是否有空位可以成五
    let (end1_empty, end2_empty) = check_line_ends(board, pos, stone, dr, dc);
    end1_empty || end2_empty
}

/// 检查三三禁手（两个或以上的活三）
fn check_double_three(board: &Board, pos: Position) -> bool {
    let mut live_three_count = 0;
    let stone = Stone::Black;

    for &(dr, dc) in &DIRECTIONS {
        if is_live_three(board, pos, stone, dr, dc) {
            live_three_count += 1;
        }
    }

    live_three_count >= 2
}

/// 检查是否形成活三（3子连续，两端都有空位）
fn is_live_three(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> bool {
    let count = count_consecutive(board, pos, stone, dr, dc);
    if count != 3 {
        return false;
    }

    // 检查两端是否都有空位
    let (end1_empty, end2_empty) = check_line_ends(board, pos, stone, dr, dc);
    end1_empty && end2_empty
}

/// 检查连续棋子的两端是否为空
fn check_line_ends(board: &Board, pos: Position, stone: Stone, dr: i32, dc: i32) -> (bool, bool) {
    // 找到连续棋子的两端
    let mut r = pos.row as i32;
    let mut c = pos.col as i32;

    // 正向找到末端
    while r + dr >= 0
        && r + dr < BOARD_SIZE as i32
        && c + dc >= 0
        && c + dc < BOARD_SIZE as i32
        && board.get(Position::new((r + dr) as usize, (c + dc) as usize)) == Some(stone)
    {
        r += dr;
        c += dc;
    }
    let end1_r = r + dr;
    let end1_c = c + dc;
    let end1_empty = end1_r >= 0
        && end1_r < BOARD_SIZE as i32
        && end1_c >= 0
        && end1_c < BOARD_SIZE as i32
        && board.get(Position::new(end1_r as usize, end1_c as usize)).is_none();

    // 反向找到末端
    r = pos.row as i32;
    c = pos.col as i32;
    while r - dr >= 0
        && r - dr < BOARD_SIZE as i32
        && c - dc >= 0
        && c - dc < BOARD_SIZE as i32
        && board.get(Position::new((r - dr) as usize, (c - dc) as usize)) == Some(stone)
    {
        r -= dr;
        c -= dc;
    }
    let end2_r = r - dr;
    let end2_c = c - dc;
    let end2_empty = end2_r >= 0
        && end2_r < BOARD_SIZE as i32
        && end2_c >= 0
        && end2_c < BOARD_SIZE as i32
        && board.get(Position::new(end2_r as usize, end2_c as usize)).is_none();

    (end1_empty, end2_empty)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_board_with_stones(positions: &[(usize, usize, Stone)]) -> Board {
        let mut board = Board::new();
        for &(row, col, stone) in positions {
            board.place_stone(Position::new(row, col), stone).unwrap();
        }
        board
    }

    #[test]
    fn test_horizontal_win() {
        let board = setup_board_with_stones(&[
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);

        assert!(is_win(&board, Position::new(7, 5)));
        let result = check_win(&board, Position::new(7, 5));
        assert!(result.is_some());
        assert_eq!(result.unwrap().status, GameStatus::BlackWin);
    }

    #[test]
    fn test_vertical_win() {
        let board = setup_board_with_stones(&[
            (3, 7, Stone::White),
            (4, 7, Stone::White),
            (5, 7, Stone::White),
            (6, 7, Stone::White),
            (7, 7, Stone::White),
        ]);

        assert!(is_win(&board, Position::new(5, 7)));
        let result = check_win(&board, Position::new(5, 7));
        assert!(result.is_some());
        assert_eq!(result.unwrap().status, GameStatus::WhiteWin);
    }

    #[test]
    fn test_diagonal_win() {
        let board = setup_board_with_stones(&[
            (3, 3, Stone::Black),
            (4, 4, Stone::Black),
            (5, 5, Stone::Black),
            (6, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);

        assert!(is_win(&board, Position::new(5, 5)));
        let result = check_win(&board, Position::new(5, 5));
        assert!(result.is_some());
        assert_eq!(result.unwrap().status, GameStatus::BlackWin);
    }

    #[test]
    fn test_anti_diagonal_win() {
        let board = setup_board_with_stones(&[
            (3, 7, Stone::White),
            (4, 6, Stone::White),
            (5, 5, Stone::White),
            (6, 4, Stone::White),
            (7, 3, Stone::White),
        ]);

        assert!(is_win(&board, Position::new(5, 5)));
        let result = check_win(&board, Position::new(5, 5));
        assert!(result.is_some());
        assert_eq!(result.unwrap().status, GameStatus::WhiteWin);
    }

    #[test]
    fn test_no_win_four_in_row() {
        let board = setup_board_with_stones(&[
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
        ]);

        assert!(!is_win(&board, Position::new(7, 5)));
        assert!(check_win(&board, Position::new(7, 5)).is_none());
    }

    #[test]
    fn test_more_than_five() {
        let board = setup_board_with_stones(&[
            (7, 2, Stone::Black),
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);

        assert!(is_win(&board, Position::new(7, 5)));
    }

    // ===== 禁手规则测试 =====

    #[test]
    fn test_overline_foul() {
        // 黑棋六连 - 长连禁手
        let board = setup_board_with_stones(&[
            (7, 2, Stone::Black),
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        assert_eq!(
            check_foul(&board, Position::new(7, 5), RuleSet::Renju),
            Some(FoulType::Overline)
        );
    }

    #[test]
    fn test_no_foul_standard_rules() {
        // 标准规则下无禁手
        let board = setup_board_with_stones(&[
            (7, 2, Stone::Black),
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        assert_eq!(check_foul(&board, Position::new(7, 5), RuleSet::Standard), None);
    }

    #[test]
    fn test_no_foul_white_stone() {
        // 白棋无禁手
        let board = setup_board_with_stones(&[
            (7, 2, Stone::White),
            (7, 3, Stone::White),
            (7, 4, Stone::White),
            (7, 5, Stone::White),
            (7, 6, Stone::White),
            (7, 7, Stone::White),
        ]);
        assert_eq!(check_foul(&board, Position::new(7, 5), RuleSet::Renju), None);
    }

    #[test]
    fn test_double_four_foul() {
        // 四四禁手：在 (7,7) 落子形成两个四
        // 水平方向: (7,4), (7,5), (7,6), (7,7) - 四
        // 垂直方向: (4,7), (5,7), (6,7), (7,7) - 四
        let board = setup_board_with_stones(&[
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (4, 7, Stone::Black),
            (5, 7, Stone::Black),
            (6, 7, Stone::Black),
            (7, 7, Stone::Black), // 形成四四
        ]);
        assert_eq!(
            check_foul(&board, Position::new(7, 7), RuleSet::Renju),
            Some(FoulType::DoubleFour)
        );
    }

    #[test]
    fn test_double_three_foul() {
        // 三三禁手：在 (7,7) 落子形成两个活三
        // 水平方向: (7,5), (7,6), (7,7) - 活三（两端开放）
        // 垂直方向: (5,7), (6,7), (7,7) - 活三（两端开放）
        let board = setup_board_with_stones(&[
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (5, 7, Stone::Black),
            (6, 7, Stone::Black),
            (7, 7, Stone::Black), // 形成三三
        ]);
        assert_eq!(
            check_foul(&board, Position::new(7, 7), RuleSet::Renju),
            Some(FoulType::DoubleThree)
        );
    }

    #[test]
    fn test_no_foul_single_four() {
        // 单个四不是禁手
        let board = setup_board_with_stones(&[
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        assert_eq!(check_foul(&board, Position::new(7, 7), RuleSet::Renju), None);
    }

    #[test]
    fn test_no_foul_single_three() {
        // 单个活三不是禁手
        let board = setup_board_with_stones(&[
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        assert_eq!(check_foul(&board, Position::new(7, 7), RuleSet::Renju), None);
    }

    #[test]
    fn test_five_overrides_foul() {
        // 五连优先于禁手（五连不算禁手）
        let board = setup_board_with_stones(&[
            (7, 3, Stone::Black),
            (7, 4, Stone::Black),
            (7, 5, Stone::Black),
            (7, 6, Stone::Black),
            (7, 7, Stone::Black),
        ]);
        // 五连不触发长连禁手检测
        assert!(!check_overline(&board, Position::new(7, 5)));
    }
}
