mod ai;
mod commands;
mod game;

use commands::{ai_move, export_game, get_game_state, get_hint, get_move_history, make_move, new_game, surrender, undo_move, get_puzzle_list, get_puzzle, check_puzzle_move};
use game::GameState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(GameState::new())
        .invoke_handler(tauri::generate_handler![
            new_game,
            make_move,
            ai_move,
            undo_move,
            get_game_state,
            get_hint,
            surrender,
            get_move_history,
            export_game,
            get_puzzle_list,
            get_puzzle,
            check_puzzle_move
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
