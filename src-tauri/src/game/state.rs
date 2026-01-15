use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use super::board::Board;
use super::rules;
use super::types::{AIDifficulty, GameMode, GameStatus, Move, Position, RuleSet, Stone};

pub struct GameState {
    pub inner: Mutex<GameStateInner>,
}

impl GameState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(GameStateInner::new()),
        }
    }
}

impl Default for GameState {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct GameStateInner {
    pub board: Board,
    pub current_player: Stone,
    pub game_mode: GameMode,
    pub ai_difficulty: AIDifficulty,
    pub player_stone: Stone,
    pub status: GameStatus,
    pub move_history: Vec<Move>,
    pub winning_positions: Option<Vec<Position>>,
    pub last_move: Option<Position>,
    pub rule_set: RuleSet,
}

impl GameStateInner {
    pub fn new() -> Self {
        Self {
            board: Board::new(),
            current_player: Stone::Black,
            game_mode: GameMode::PvP,
            ai_difficulty: AIDifficulty::Medium,
            player_stone: Stone::Black,
            status: GameStatus::Playing,
            move_history: Vec::new(),
            winning_positions: None,
            last_move: None,
            rule_set: RuleSet::Standard,
        }
    }

    pub fn reset(&mut self) {
        self.board = Board::new();
        self.current_player = Stone::Black;
        self.status = GameStatus::Playing;
        self.move_history.clear();
        self.winning_positions = None;
        self.last_move = None;
    }

    pub fn set_mode(
        &mut self,
        mode: GameMode,
        difficulty: Option<AIDifficulty>,
        player_stone: Option<Stone>,
        rule_set: Option<RuleSet>,
    ) {
        self.game_mode = mode;
        if let Some(diff) = difficulty {
            self.ai_difficulty = diff;
        }
        if let Some(stone) = player_stone {
            self.player_stone = stone;
        }
        if let Some(rules) = rule_set {
            self.rule_set = rules;
        }
        self.reset();
    }

    pub fn make_move(&mut self, pos: Position) -> Result<MoveResult, String> {
        if self.status != GameStatus::Playing {
            return Err("游戏已结束".to_string());
        }

        self.board.place_stone(pos, self.current_player)?;

        // 检查禁手（仅对黑棋生效）
        if self.current_player == Stone::Black {
            if let Some(foul) = rules::check_foul(&self.board, pos, self.rule_set) {
                // 禁手，撤销落子，黑棋判负
                self.board.undo_move(pos);
                self.status = GameStatus::WhiteWin;
                let foul_msg = match foul {
                    rules::FoulType::Overline => "长连禁手",
                    rules::FoulType::DoubleFour => "四四禁手",
                    rules::FoulType::DoubleThree => "三三禁手",
                };
                return Err(format!("黑棋{}，白棋获胜", foul_msg));
            }
        }

        let move_record = Move {
            position: pos,
            stone: self.current_player,
            move_number: self.move_history.len() as u32 + 1,
        };
        self.move_history.push(move_record);
        self.last_move = Some(pos);

        if let Some(result) = rules::check_win(&self.board, pos) {
            self.status = result.status;
            self.winning_positions = result.winning_positions;
            return Ok(MoveResult {
                success: true,
                game_over: true,
                status: self.status,
                winning_positions: self.winning_positions.clone(),
                last_move: self.last_move,
            });
        }

        self.current_player = self.current_player.opponent();

        Ok(MoveResult {
            success: true,
            game_over: false,
            status: self.status,
            winning_positions: None,
            last_move: self.last_move,
        })
    }

    pub fn undo_move(&mut self) -> Result<(), String> {
        if self.move_history.is_empty() {
            return Err("没有可以悔棋的步骤".to_string());
        }

        let last_move = self.move_history.pop().unwrap();
        self.board.undo_move(last_move.position);
        self.current_player = last_move.stone;
        self.status = GameStatus::Playing;
        self.winning_positions = None;
        self.last_move = self.move_history.last().map(|m| m.position);

        Ok(())
    }

    pub fn is_ai_turn(&self) -> bool {
        if self.status != GameStatus::Playing {
            return false;
        }
        match self.game_mode {
            GameMode::PvAI => self.current_player != self.player_stone,
            GameMode::AIvAI => true, // AIvAI 模式下总是 AI 回合
            GameMode::PvP => false,
        }
    }

    pub fn surrender(&mut self) -> Result<(), String> {
        if self.status != GameStatus::Playing {
            return Err("游戏已结束".to_string());
        }

        // 当前玩家认输，对手获胜
        self.status = match self.current_player {
            Stone::Black => GameStatus::WhiteWin,
            Stone::White => GameStatus::BlackWin,
        };

        Ok(())
    }
}

impl Default for GameStateInner {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveResult {
    pub success: bool,
    pub game_over: bool,
    pub status: GameStatus,
    pub winning_positions: Option<Vec<Position>>,
    pub last_move: Option<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSnapshot {
    pub board: Vec<Vec<Option<Stone>>>,
    pub current_player: Stone,
    pub game_mode: GameMode,
    pub ai_difficulty: AIDifficulty,
    pub player_stone: Stone,
    pub status: GameStatus,
    pub move_count: usize,
    pub winning_positions: Option<Vec<Position>>,
    pub last_move: Option<Position>,
    pub rule_set: RuleSet,
}

impl From<&GameStateInner> for GameSnapshot {
    fn from(state: &GameStateInner) -> Self {
        Self {
            board: state.board.to_array(),
            current_player: state.current_player,
            game_mode: state.game_mode,
            ai_difficulty: state.ai_difficulty,
            player_stone: state.player_stone,
            status: state.status,
            move_count: state.move_history.len(),
            winning_positions: state.winning_positions.clone(),
            last_move: state.last_move,
            rule_set: state.rule_set,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_game_state() {
        let state = GameStateInner::new();
        assert_eq!(state.current_player, Stone::Black);
        assert_eq!(state.status, GameStatus::Playing);
        assert!(state.move_history.is_empty());
        assert_eq!(state.game_mode, GameMode::PvP);
        assert_eq!(state.ai_difficulty, AIDifficulty::Medium);
        assert!(state.winning_positions.is_none());
        assert!(state.last_move.is_none());
    }

    #[test]
    fn test_reset() {
        let mut state = GameStateInner::new();
        state.make_move(Position::new(7, 7)).unwrap();
        state.make_move(Position::new(7, 8)).unwrap();
        state.reset();
        assert_eq!(state.current_player, Stone::Black);
        assert!(state.move_history.is_empty());
        assert_eq!(state.status, GameStatus::Playing);
        assert!(state.last_move.is_none());
    }

    #[test]
    fn test_set_mode() {
        let mut state = GameStateInner::new();
        state.set_mode(
            GameMode::PvAI,
            Some(AIDifficulty::Hard),
            Some(Stone::White),
            Some(RuleSet::Renju),
        );
        assert_eq!(state.game_mode, GameMode::PvAI);
        assert_eq!(state.ai_difficulty, AIDifficulty::Hard);
        assert_eq!(state.player_stone, Stone::White);
        assert_eq!(state.rule_set, RuleSet::Renju);
        // set_mode 会调用 reset
        assert!(state.move_history.is_empty());
    }

    #[test]
    fn test_make_move_success() {
        let mut state = GameStateInner::new();
        let result = state.make_move(Position::new(7, 7)).unwrap();
        assert!(result.success);
        assert!(!result.game_over);
        assert_eq!(state.current_player, Stone::White);
        assert_eq!(state.move_history.len(), 1);
        assert_eq!(state.last_move, Some(Position::new(7, 7)));
    }

    #[test]
    fn test_make_move_game_over() {
        let mut state = GameStateInner::new();
        state.status = GameStatus::BlackWin;
        let result = state.make_move(Position::new(7, 7));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "游戏已结束");
    }

    #[test]
    fn test_make_move_win_detection() {
        let mut state = GameStateInner::new();
        // 黑棋: (7,3), (7,4), (7,5), (7,6), (7,7) - 五连
        // 白棋: (8,3), (8,4), (8,5), (8,6)
        let moves = [
            (7, 3), (8, 3), // 黑, 白
            (7, 4), (8, 4), // 黑, 白
            (7, 5), (8, 5), // 黑, 白
            (7, 6), (8, 6), // 黑, 白
            (7, 7),         // 黑 - 获胜
        ];
        for (i, (row, col)) in moves.iter().enumerate() {
            let result = state.make_move(Position::new(*row, *col)).unwrap();
            if i == 8 {
                // 最后一步黑棋获胜
                assert!(result.game_over);
                assert_eq!(result.status, GameStatus::BlackWin);
                assert!(result.winning_positions.is_some());
            }
        }
    }

    #[test]
    fn test_undo_move() {
        let mut state = GameStateInner::new();
        state.make_move(Position::new(7, 7)).unwrap();
        state.undo_move().unwrap();
        assert_eq!(state.current_player, Stone::Black);
        assert!(state.move_history.is_empty());
        assert!(state.last_move.is_none());
    }

    #[test]
    fn test_undo_move_empty_history() {
        let mut state = GameStateInner::new();
        let result = state.undo_move();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "没有可以悔棋的步骤");
    }

    #[test]
    fn test_undo_move_restores_last_move() {
        let mut state = GameStateInner::new();
        state.make_move(Position::new(7, 7)).unwrap();
        state.make_move(Position::new(7, 8)).unwrap();
        state.undo_move().unwrap();
        assert_eq!(state.last_move, Some(Position::new(7, 7)));
    }

    #[test]
    fn test_is_ai_turn_pvp() {
        let mut state = GameStateInner::new();
        state.game_mode = GameMode::PvP;
        assert!(!state.is_ai_turn());
    }

    #[test]
    fn test_is_ai_turn_pvai_player_turn() {
        let mut state = GameStateInner::new();
        state.game_mode = GameMode::PvAI;
        state.player_stone = Stone::Black;
        state.current_player = Stone::Black;
        assert!(!state.is_ai_turn());
    }

    #[test]
    fn test_is_ai_turn_pvai_ai_turn() {
        let mut state = GameStateInner::new();
        state.game_mode = GameMode::PvAI;
        state.player_stone = Stone::Black;
        state.current_player = Stone::White;
        assert!(state.is_ai_turn());
    }

    #[test]
    fn test_is_ai_turn_aivai() {
        let mut state = GameStateInner::new();
        state.game_mode = GameMode::AIvAI;
        assert!(state.is_ai_turn());
    }

    #[test]
    fn test_is_ai_turn_game_over() {
        let mut state = GameStateInner::new();
        state.game_mode = GameMode::PvAI;
        state.status = GameStatus::BlackWin;
        assert!(!state.is_ai_turn());
    }

    #[test]
    fn test_surrender() {
        let mut state = GameStateInner::new();
        state.surrender().unwrap();
        // 黑棋认输，白棋获胜
        assert_eq!(state.status, GameStatus::WhiteWin);
    }

    #[test]
    fn test_surrender_white() {
        let mut state = GameStateInner::new();
        state.current_player = Stone::White;
        state.surrender().unwrap();
        // 白棋认输，黑棋获胜
        assert_eq!(state.status, GameStatus::BlackWin);
    }

    #[test]
    fn test_surrender_game_over() {
        let mut state = GameStateInner::new();
        state.status = GameStatus::BlackWin;
        let result = state.surrender();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "游戏已结束");
    }

    #[test]
    fn test_game_snapshot_from_state() {
        let mut state = GameStateInner::new();
        state.make_move(Position::new(7, 7)).unwrap();
        let snapshot = GameSnapshot::from(&state);
        assert_eq!(snapshot.current_player, Stone::White);
        assert_eq!(snapshot.move_count, 1);
        assert_eq!(snapshot.last_move, Some(Position::new(7, 7)));
        assert_eq!(snapshot.board[7][7], Some(Stone::Black));
    }
}
