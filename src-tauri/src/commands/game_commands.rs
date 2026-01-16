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
    let (board, ai_stone, depth) = {
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
        )
    };

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

#[cfg(test)]
mod tests {
    use crate::game::state::GameStateInner;
    use crate::game::{GameMode, GameStatus, Position, RuleSet, Stone};

    // Test GameStateInner directly instead of Tauri commands
    // since Tauri's State type cannot be constructed in tests

    fn create_test_game() -> GameStateInner {
        GameStateInner::new()
    }

    // === new_game (set_mode) tests ===

    #[test]
    fn test_new_game_pvp_default() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvP, None, None, None);

        assert_eq!(game.game_mode, GameMode::PvP);
        assert_eq!(game.status, GameStatus::Playing);
        assert_eq!(game.current_player, Stone::Black);
        assert_eq!(game.move_history.len(), 0);
    }

    #[test]
    fn test_new_game_pvai_with_difficulty() {
        let mut game = create_test_game();
        game.set_mode(
            GameMode::PvAI,
            Some(crate::game::AIDifficulty::Hard),
            Some(Stone::Black),
            None,
        );

        assert_eq!(game.game_mode, GameMode::PvAI);
        assert_eq!(game.ai_difficulty, crate::game::AIDifficulty::Hard);
        assert_eq!(game.player_stone, Stone::Black);
    }

    #[test]
    fn test_new_game_pvai_player_white() {
        let mut game = create_test_game();
        game.set_mode(
            GameMode::PvAI,
            Some(crate::game::AIDifficulty::Easy),
            Some(Stone::White),
            None,
        );

        assert_eq!(game.player_stone, Stone::White);
    }

    #[test]
    fn test_new_game_aivai() {
        let mut game = create_test_game();
        game.set_mode(GameMode::AIvAI, Some(crate::game::AIDifficulty::Medium), None, None);

        assert_eq!(game.game_mode, GameMode::AIvAI);
    }

    #[test]
    fn test_new_game_with_renju_rules() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvP, None, None, Some(RuleSet::Renju));

        assert_eq!(game.rule_set, RuleSet::Renju);
    }

    #[test]
    fn test_new_game_resets_board() {
        let mut game = create_test_game();

        // Make some moves first
        game.make_move(Position::new(7, 7)).unwrap();
        game.make_move(Position::new(7, 8)).unwrap();

        // Start new game using set_mode which calls reset internally
        game.set_mode(GameMode::PvP, None, None, None);

        assert_eq!(game.move_history.len(), 0);
        assert!(game.board.get(Position::new(7, 7)).is_none());
    }

    // === make_move tests ===

    #[test]
    fn test_make_move_valid() {
        let mut game = create_test_game();
        let result = game.make_move(Position::new(7, 7));

        assert!(result.is_ok());
        assert_eq!(game.move_history.len(), 1);
        assert_eq!(game.current_player, Stone::White);
    }

    #[test]
    fn test_make_move_occupied_position() {
        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap();

        let result = game.make_move(Position::new(7, 7));
        assert!(result.is_err());
    }

    #[test]
    fn test_make_move_invalid_position() {
        let mut game = create_test_game();
        let result = game.make_move(Position::new(15, 15));
        assert!(result.is_err());
    }

    #[test]
    fn test_make_move_win_detection() {
        let mut game = create_test_game();

        // Create a winning position for Black
        // Black: (7,7), (7,8), (7,9), (7,10)
        // White: (8,7), (8,8), (8,9), (8,10)
        game.make_move(Position::new(7, 7)).unwrap(); // Black
        game.make_move(Position::new(8, 7)).unwrap(); // White
        game.make_move(Position::new(7, 8)).unwrap(); // Black
        game.make_move(Position::new(8, 8)).unwrap(); // White
        game.make_move(Position::new(7, 9)).unwrap(); // Black
        game.make_move(Position::new(8, 9)).unwrap(); // White
        game.make_move(Position::new(7, 10)).unwrap(); // Black
        game.make_move(Position::new(8, 10)).unwrap(); // White

        // Winning move for Black
        game.make_move(Position::new(7, 11)).unwrap();

        assert_eq!(game.status, GameStatus::BlackWin);
    }

    #[test]
    fn test_make_move_game_over() {
        let mut game = create_test_game();
        game.status = GameStatus::BlackWin;

        let result = game.make_move(Position::new(0, 0));
        assert!(result.is_err());
    }

    // === undo_move tests ===

    #[test]
    fn test_undo_move_pvp() {
        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap();
        game.make_move(Position::new(7, 8)).unwrap();

        let result = game.undo_move();

        assert!(result.is_ok());
        // In PvP, only one move is undone
        assert_eq!(game.move_history.len(), 1);
    }

    #[test]
    fn test_undo_move_pvai() {
        let mut game = create_test_game();
        game.set_mode(
            GameMode::PvAI,
            Some(crate::game::AIDifficulty::Easy),
            Some(Stone::Black),
            None,
        );

        // Simulate player and AI moves
        game.make_move(Position::new(7, 7)).unwrap(); // Player (Black)
        game.make_move(Position::new(7, 8)).unwrap(); // AI (White)

        // Undo both moves manually (as the command would do)
        game.undo_move().unwrap();
        game.undo_move().unwrap();

        assert_eq!(game.move_history.len(), 0);
    }

    #[test]
    fn test_undo_move_empty_history() {
        let mut game = create_test_game();
        let result = game.undo_move();
        assert!(result.is_err());
    }

    // === surrender tests ===

    #[test]
    fn test_surrender_black() {
        let mut game = create_test_game();
        // Black's turn
        let result = game.surrender();

        assert!(result.is_ok());
        assert_eq!(game.status, GameStatus::WhiteWin);
    }

    #[test]
    fn test_surrender_white() {
        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap(); // Black moves

        // White's turn
        let result = game.surrender();

        assert!(result.is_ok());
        assert_eq!(game.status, GameStatus::BlackWin);
    }

    #[test]
    fn test_surrender_game_over() {
        let mut game = create_test_game();
        game.status = GameStatus::BlackWin;

        let result = game.surrender();
        assert!(result.is_err());
    }

    // === move_history tests ===

    #[test]
    fn test_move_history_empty() {
        let game = create_test_game();
        assert!(game.move_history.is_empty());
    }

    #[test]
    fn test_move_history_with_moves() {
        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap();
        game.make_move(Position::new(7, 8)).unwrap();

        assert_eq!(game.move_history.len(), 2);
        assert_eq!(game.move_history[0].position, Position::new(7, 7));
        assert_eq!(game.move_history[0].stone, Stone::Black);
        assert_eq!(game.move_history[1].position, Position::new(7, 8));
        assert_eq!(game.move_history[1].stone, Stone::White);
    }

    // === game status tests ===

    #[test]
    fn test_game_status_playing() {
        let game = create_test_game();
        assert_eq!(game.status, GameStatus::Playing);
    }

    #[test]
    fn test_game_status_black_win() {
        let mut game = create_test_game();
        game.status = GameStatus::BlackWin;
        assert_eq!(game.status, GameStatus::BlackWin);
    }

    #[test]
    fn test_game_status_white_win() {
        let mut game = create_test_game();
        game.status = GameStatus::WhiteWin;
        assert_eq!(game.status, GameStatus::WhiteWin);
    }

    #[test]
    fn test_game_status_draw() {
        let mut game = create_test_game();
        game.status = GameStatus::Draw;
        assert_eq!(game.status, GameStatus::Draw);
    }

    // === game mode and rules tests ===

    #[test]
    fn test_game_mode_pvp() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvP, None, None, None);
        assert_eq!(game.game_mode, GameMode::PvP);
    }

    #[test]
    fn test_game_mode_pvai() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvAI, None, None, None);
        assert_eq!(game.game_mode, GameMode::PvAI);
    }

    #[test]
    fn test_rule_set_standard() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvP, None, None, Some(RuleSet::Standard));
        assert_eq!(game.rule_set, RuleSet::Standard);
    }

    #[test]
    fn test_rule_set_renju() {
        let mut game = create_test_game();
        game.set_mode(GameMode::PvP, None, None, Some(RuleSet::Renju));
        assert_eq!(game.rule_set, RuleSet::Renju);
    }

    // === GameSnapshot tests ===

    #[test]
    fn test_snapshot_contains_correct_data() {
        use crate::game::GameSnapshot;

        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap();

        let snapshot = GameSnapshot::from(&game);

        assert_eq!(snapshot.move_count, 1);
        assert_eq!(snapshot.current_player, Stone::White);
        assert!(snapshot.last_move.is_some());
        assert_eq!(snapshot.last_move.unwrap(), Position::new(7, 7));
    }

    #[test]
    fn test_snapshot_board_state() {
        use crate::game::GameSnapshot;

        let mut game = create_test_game();
        game.make_move(Position::new(7, 7)).unwrap();

        let snapshot = GameSnapshot::from(&game);

        assert_eq!(snapshot.board[7][7], Some(Stone::Black));
    }
}
