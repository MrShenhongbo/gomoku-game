use super::board::{Board, BOARD_SIZE};
use super::types::{GameStatus, Position, Stone};
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
}
