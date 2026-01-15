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
    AIvAI,
}

/// AI 难度
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum AIDifficulty {
    Easy,
    #[default]
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

/// 规则集
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum RuleSet {
    #[default]
    Standard,  // 标准规则，无禁手
    Renju,     // 连珠规则，黑棋有禁手
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stone_opponent() {
        assert_eq!(Stone::Black.opponent(), Stone::White);
        assert_eq!(Stone::White.opponent(), Stone::Black);
    }

    #[test]
    fn test_ai_difficulty_search_depth() {
        assert_eq!(AIDifficulty::Easy.search_depth(), 2);
        assert_eq!(AIDifficulty::Medium.search_depth(), 4);
        assert_eq!(AIDifficulty::Hard.search_depth(), 6);
    }

    #[test]
    fn test_ai_difficulty_default() {
        let difficulty: AIDifficulty = Default::default();
        assert_eq!(difficulty, AIDifficulty::Medium);
    }

    #[test]
    fn test_position_new() {
        let pos = Position::new(7, 8);
        assert_eq!(pos.row, 7);
        assert_eq!(pos.col, 8);
    }

    #[test]
    fn test_position_equality() {
        let pos1 = Position::new(7, 7);
        let pos2 = Position::new(7, 7);
        let pos3 = Position::new(7, 8);
        assert_eq!(pos1, pos2);
        assert_ne!(pos1, pos3);
    }

    #[test]
    fn test_rule_set_default() {
        let rule_set: RuleSet = Default::default();
        assert_eq!(rule_set, RuleSet::Standard);
    }

    #[test]
    fn test_game_status_variants() {
        assert_ne!(GameStatus::Playing, GameStatus::BlackWin);
        assert_ne!(GameStatus::BlackWin, GameStatus::WhiteWin);
        assert_ne!(GameStatus::WhiteWin, GameStatus::Draw);
    }

    #[test]
    fn test_game_mode_variants() {
        assert_ne!(GameMode::PvP, GameMode::PvAI);
        assert_ne!(GameMode::PvAI, GameMode::AIvAI);
    }

    #[test]
    fn test_move_struct() {
        let m = Move {
            position: Position::new(7, 7),
            stone: Stone::Black,
            move_number: 1,
        };
        assert_eq!(m.position.row, 7);
        assert_eq!(m.stone, Stone::Black);
        assert_eq!(m.move_number, 1);
    }
}
