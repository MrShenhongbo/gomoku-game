use super::types::{Position, Stone};

pub const BOARD_SIZE: usize = 15;
const TOTAL_CELLS: usize = BOARD_SIZE * BOARD_SIZE; // 225

#[derive(Debug, Clone)]
pub struct Board {
    cells: [[Option<Stone>; BOARD_SIZE]; BOARD_SIZE],
    move_count: u32,
    stone_positions: Vec<Position>, // 记录所有已落子位置，用于加速候选位置计算
}

impl Board {
    pub fn new() -> Self {
        Self {
            cells: [[None; BOARD_SIZE]; BOARD_SIZE],
            move_count: 0,
            stone_positions: Vec::new(),
        }
    }

    #[inline]
    pub fn get(&self, pos: Position) -> Option<Stone> {
        if self.is_valid_position(pos) {
            self.cells[pos.row][pos.col]
        } else {
            None
        }
    }

    pub fn place_stone(&mut self, pos: Position, stone: Stone) -> Result<(), String> {
        if !self.is_valid_position(pos) {
            return Err("位置超出棋盘范围".to_string());
        }
        if self.cells[pos.row][pos.col].is_some() {
            return Err("该位置已有棋子".to_string());
        }
        self.cells[pos.row][pos.col] = Some(stone);
        self.move_count += 1;
        self.stone_positions.push(pos);
        Ok(())
    }

    #[inline]
    pub fn is_valid_position(&self, pos: Position) -> bool {
        pos.row < BOARD_SIZE && pos.col < BOARD_SIZE
    }

    #[inline]
    pub fn is_empty(&self, pos: Position) -> bool {
        self.is_valid_position(pos) && self.cells[pos.row][pos.col].is_none()
    }

    pub fn get_candidate_positions(&self) -> Vec<Position> {
        // 使用位图代替 HashSet，避免哈希开销
        let mut seen = [false; TOTAL_CELLS];
        let mut candidates = Vec::new();

        // 只遍历已落子的位置，而非整个棋盘
        for &pos in &self.stone_positions {
            for dr in -2i32..=2 {
                for dc in -2i32..=2 {
                    let nr = pos.row as i32 + dr;
                    let nc = pos.col as i32 + dc;
                    if nr >= 0
                        && nr < BOARD_SIZE as i32
                        && nc >= 0
                        && nc < BOARD_SIZE as i32
                    {
                        let idx = nr as usize * BOARD_SIZE + nc as usize;
                        if !seen[idx] {
                            seen[idx] = true;
                            let candidate = Position::new(nr as usize, nc as usize);
                            if self.is_empty(candidate) {
                                candidates.push(candidate);
                            }
                        }
                    }
                }
            }
        }

        if candidates.is_empty() {
            return vec![Position::new(BOARD_SIZE / 2, BOARD_SIZE / 2)];
        }

        candidates
    }

    #[inline]
    pub fn is_full(&self) -> bool {
        self.move_count >= (BOARD_SIZE * BOARD_SIZE) as u32
    }

    pub fn to_array(&self) -> Vec<Vec<Option<Stone>>> {
        self.cells.iter().map(|row| row.to_vec()).collect()
    }

    pub fn undo_move(&mut self, pos: Position) {
        if self.is_valid_position(pos) && self.cells[pos.row][pos.col].is_some() {
            self.cells[pos.row][pos.col] = None;
            self.move_count = self.move_count.saturating_sub(1);
            // 从已落子列表中移除，使用 swap_remove 实现 O(1) 复杂度
            if let Some(idx) = self.stone_positions.iter().position(|&p| p == pos) {
                self.stone_positions.swap_remove(idx);
            }
        }
    }

    pub fn stone_positions(&self) -> &[Position] {
        &self.stone_positions
    }
}

impl Default for Board {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_board_is_empty() {
        let board = Board::new();
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                assert!(board.is_empty(Position::new(row, col)));
            }
        }
        assert_eq!(board.move_count, 0);
        assert!(board.stone_positions.is_empty());
    }

    #[test]
    fn test_place_stone_success() {
        let mut board = Board::new();
        let pos = Position::new(7, 7);
        assert!(board.place_stone(pos, Stone::Black).is_ok());
        assert_eq!(board.get(pos), Some(Stone::Black));
        assert_eq!(board.move_count, 1);
        assert_eq!(board.stone_positions.len(), 1);
    }

    #[test]
    fn test_place_stone_occupied_position() {
        let mut board = Board::new();
        let pos = Position::new(7, 7);
        board.place_stone(pos, Stone::Black).unwrap();
        let result = board.place_stone(pos, Stone::White);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "该位置已有棋子");
    }

    #[test]
    fn test_place_stone_invalid_position() {
        let mut board = Board::new();
        let pos = Position::new(15, 15); // 超出范围
        let result = board.place_stone(pos, Stone::Black);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "位置超出棋盘范围");
    }

    #[test]
    fn test_undo_move() {
        let mut board = Board::new();
        let pos = Position::new(7, 7);
        board.place_stone(pos, Stone::Black).unwrap();
        board.undo_move(pos);
        assert!(board.is_empty(pos));
        assert_eq!(board.move_count, 0);
    }

    #[test]
    fn test_undo_move_updates_stone_positions() {
        let mut board = Board::new();
        let pos1 = Position::new(7, 7);
        let pos2 = Position::new(7, 8);
        board.place_stone(pos1, Stone::Black).unwrap();
        board.place_stone(pos2, Stone::White).unwrap();
        assert_eq!(board.stone_positions.len(), 2);
        board.undo_move(pos2);
        assert_eq!(board.stone_positions.len(), 1);
        assert!(board.stone_positions.contains(&pos1));
        assert!(!board.stone_positions.contains(&pos2));
    }

    #[test]
    fn test_get_candidate_positions_empty_board() {
        let board = Board::new();
        let candidates = board.get_candidate_positions();
        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0], Position::new(7, 7)); // 中心位置
    }

    #[test]
    fn test_get_candidate_positions_with_stones() {
        let mut board = Board::new();
        board.place_stone(Position::new(7, 7), Stone::Black).unwrap();
        let candidates = board.get_candidate_positions();
        assert!(candidates.len() > 1);
        // 已落子位置不应在候选列表中
        assert!(!candidates.contains(&Position::new(7, 7)));
        // 应包含邻近位置
        assert!(candidates.contains(&Position::new(7, 8)));
        assert!(candidates.contains(&Position::new(6, 7)));
    }

    #[test]
    fn test_is_full() {
        let mut board = Board::new();
        assert!(!board.is_full());
        // 填满棋盘
        for row in 0..BOARD_SIZE {
            for col in 0..BOARD_SIZE {
                let stone = if (row + col) % 2 == 0 {
                    Stone::Black
                } else {
                    Stone::White
                };
                board.place_stone(Position::new(row, col), stone).unwrap();
            }
        }
        assert!(board.is_full());
    }

    #[test]
    fn test_to_array() {
        let mut board = Board::new();
        board.place_stone(Position::new(0, 0), Stone::Black).unwrap();
        board.place_stone(Position::new(0, 1), Stone::White).unwrap();
        let arr = board.to_array();
        assert_eq!(arr[0][0], Some(Stone::Black));
        assert_eq!(arr[0][1], Some(Stone::White));
        assert_eq!(arr[0][2], None);
    }

    #[test]
    fn test_is_valid_position() {
        let board = Board::new();
        assert!(board.is_valid_position(Position::new(0, 0)));
        assert!(board.is_valid_position(Position::new(14, 14)));
        assert!(!board.is_valid_position(Position::new(15, 0)));
        assert!(!board.is_valid_position(Position::new(0, 15)));
    }

    #[test]
    fn test_get_out_of_bounds() {
        let board = Board::new();
        assert_eq!(board.get(Position::new(15, 15)), None);
    }
}
