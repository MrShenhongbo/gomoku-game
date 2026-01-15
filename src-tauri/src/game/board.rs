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
