use serde::{Deserialize, Serialize};
use tauri::State;

use crate::ai::find_best_move;
use crate::game::{AIDifficulty, GameMode, GameSnapshot, GameState, Move, MoveResult, Position, RuleSet, Stone};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIMoveResult {
    pub position: Option<Position>,
    pub move_result: Option<MoveResult>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HintResult {
    pub position: Option<Position>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveHistoryResult {
    pub moves: Vec<Move>,
}

#[tauri::command]
pub fn new_game(
    state: State<GameState>,
    mode: GameMode,
    difficulty: Option<AIDifficulty>,
    player_stone: Option<Stone>,
    rule_set: Option<RuleSet>,
) -> GameSnapshot {
    let mut game = state.inner.lock().unwrap();
    game.set_mode(mode, difficulty, player_stone, rule_set);
    GameSnapshot::from(&*game)
}

#[tauri::command]
pub fn make_move(state: State<GameState>, row: usize, col: usize) -> Result<MoveResult, String> {
    let mut game = state.inner.lock().unwrap();
    let pos = Position::new(row, col);
    game.make_move(pos)
}

#[tauri::command]
pub async fn ai_move(state: State<'_, GameState>) -> Result<AIMoveResult, String> {
    // 从状态中提取 AI 计算所需的数据
    let (board, ai_stone, depth, is_ai_turn) = {
        let game = state.inner.lock().unwrap();

        if !game.is_ai_turn() {
            return Ok(AIMoveResult {
                position: None,
                move_result: None,
                error: Some("不是 AI 的回合".to_string()),
            });
        }

        (
            game.board.clone(),
            game.current_player,
            game.ai_difficulty.search_depth(),
            true,
        )
    };

    if !is_ai_turn {
        return Ok(AIMoveResult {
            position: None,
            move_result: None,
            error: Some("不是 AI 的回合".to_string()),
        });
    }

    // 在单独的线程中执行 AI 计算，避免阻塞主线程
    let best_pos = tokio::task::spawn_blocking(move || {
        find_best_move(&board, ai_stone, depth)
    })
    .await
    .map_err(|e| format!("AI 计算失败: {}", e))?;

    // 获取锁并执行落子
    let mut game = state.inner.lock().unwrap();

    // 再次检查是否仍然是 AI 回合（防止竞态条件）
    if !game.is_ai_turn() {
        return Ok(AIMoveResult {
            position: None,
            move_result: None,
            error: Some("状态已改变，不是 AI 的回合".to_string()),
        });
    }

    match best_pos {
        Some(pos) => match game.make_move(pos) {
            Ok(result) => Ok(AIMoveResult {
                position: Some(pos),
                move_result: Some(result),
                error: None,
            }),
            Err(e) => Ok(AIMoveResult {
                position: None,
                move_result: None,
                error: Some(e),
            }),
        },
        None => Ok(AIMoveResult {
            position: None,
            move_result: None,
            error: Some("AI 无法找到有效落子位置".to_string()),
        }),
    }
}

#[tauri::command]
pub fn undo_move(state: State<GameState>) -> Result<GameSnapshot, String> {
    let mut game = state.inner.lock().unwrap();

    // 在人机模式下，需要撤销两步（玩家和AI各一步）
    if game.game_mode == GameMode::PvAI && game.move_history.len() >= 2 {
        game.undo_move()?;
        game.undo_move()?;
    } else {
        game.undo_move()?;
    }

    Ok(GameSnapshot::from(&*game))
}

#[tauri::command]
pub fn get_game_state(state: State<GameState>) -> GameSnapshot {
    let game = state.inner.lock().unwrap();
    GameSnapshot::from(&*game)
}

#[tauri::command]
pub fn surrender(state: State<GameState>) -> Result<GameSnapshot, String> {
    let mut game = state.inner.lock().unwrap();
    game.surrender()?;
    Ok(GameSnapshot::from(&*game))
}

#[tauri::command]
pub async fn get_hint(state: State<'_, GameState>) -> Result<HintResult, String> {
    use crate::game::GameStatus;

    // 从状态中提取计算所需的数据
    let (board, current_stone, depth) = {
        let game = state.inner.lock().unwrap();

        if game.status != GameStatus::Playing {
            return Err("游戏已结束".to_string());
        }

        (
            game.board.clone(),
            game.current_player,
            game.ai_difficulty.search_depth(),
        )
    };

    // 在单独的线程中执行 AI 计算
    let suggested_pos = tokio::task::spawn_blocking(move || {
        find_best_move(&board, current_stone, depth)
    })
    .await
    .map_err(|e| format!("计算失败: {}", e))?;

    Ok(HintResult {
        position: suggested_pos,
    })
}

#[tauri::command]
pub fn get_move_history(state: State<GameState>) -> MoveHistoryResult {
    let game = state.inner.lock().unwrap();
    MoveHistoryResult {
        moves: game.move_history.clone(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub version: String,
    pub exported_at: String,
    pub moves: Vec<Move>,
    pub game_mode: GameMode,
    pub rule_set: RuleSet,
    pub result: String,
}

#[tauri::command]
pub fn export_game(state: State<GameState>) -> ExportData {
    let game = state.inner.lock().unwrap();
    let result = match game.status {
        crate::game::GameStatus::BlackWin => "黑棋获胜".to_string(),
        crate::game::GameStatus::WhiteWin => "白棋获胜".to_string(),
        crate::game::GameStatus::Draw => "平局".to_string(),
        crate::game::GameStatus::Playing => "进行中".to_string(),
    };
    ExportData {
        version: "1.0".to_string(),
        exported_at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        moves: game.move_history.clone(),
        game_mode: game.game_mode,
        rule_set: game.rule_set,
        result,
    }
}
