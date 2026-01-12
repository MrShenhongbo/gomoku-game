use serde::{Deserialize, Serialize};
use std::sync::Mutex;

use super::board::Board;
use super::rules;
use super::types::{AIDifficulty, GameMode, GameStatus, Move, Position, Stone};

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

    pub fn set_mode(&mut self, mode: GameMode, difficulty: Option<AIDifficulty>, player_stone: Option<Stone>) {
        self.game_mode = mode;
        if let Some(diff) = difficulty {
            self.ai_difficulty = diff;
        }
        if let Some(stone) = player_stone {
            self.player_stone = stone;
        }
        self.reset();
    }

    pub fn make_move(&mut self, pos: Position) -> Result<MoveResult, String> {
        if self.status != GameStatus::Playing {
            return Err("游戏已结束".to_string());
        }

        self.board.place_stone(pos, self.current_player)?;

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
        }
    }
}
