mod ai;
mod commands;
mod game;

use commands::{ai_move, get_game_state, get_hint, make_move, new_game, undo_move};
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
            get_hint
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
