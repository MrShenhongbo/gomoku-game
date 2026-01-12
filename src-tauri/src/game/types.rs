use serde::{Deserialize, Serialize};

/// 棋子类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stone {
    Black,
    White,
}

impl Stone {
    pub fn opponent(&self) -> Stone {
        match self {
            Stone::Black => Stone::White,
            Stone::White => Stone::Black,
        }
    }
}

/// 游戏模式
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameMode {
    PvP,
    PvAI,
}

/// AI 难度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AIDifficulty {
    Easy,
    Medium,
    Hard,
}

impl AIDifficulty {
    pub fn search_depth(&self) -> u32 {
        match self {
            AIDifficulty::Easy => 2,
            AIDifficulty::Medium => 4,
            AIDifficulty::Hard => 6,
        }
    }
}

impl Default for AIDifficulty {
    fn default() -> Self {
        AIDifficulty::Medium
    }
}

/// 游戏状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GameStatus {
    Playing,
    BlackWin,
    WhiteWin,
    Draw,
}

/// 棋盘位置
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Position {
    pub row: usize,
    pub col: usize,
}

impl Position {
    pub fn new(row: usize, col: usize) -> Self {
        Self { row, col }
    }
}

/// 落子记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Move {
    pub position: Position,
    pub stone: Stone,
    pub move_number: u32,
}
