export type Stone = 'Black' | 'White';

export type GameMode = 'PvP' | 'PvAI';

export type AIDifficulty = 'Easy' | 'Medium' | 'Hard';

export type GameStatus = 'Playing' | 'BlackWin' | 'WhiteWin' | 'Draw';

export interface Position {
  row: number;
  col: number;
}

export interface MoveResult {
  success: boolean;
  game_over: boolean;
  status: GameStatus;
  winning_positions: Position[] | null;
  last_move: Position | null;
}

export interface AIMoveResult {
  position: Position | null;
  move_result: MoveResult | null;
  error: string | null;
}

export interface HintResult {
  position: Position | null;
}

export interface GameSnapshot {
  board: (Stone | null)[][];
  current_player: Stone;
  game_mode: GameMode;
  ai_difficulty: AIDifficulty;
  player_stone: Stone;
  status: GameStatus;
  move_count: number;
  winning_positions: Position[] | null;
  last_move: Position | null;
}

export const BOARD_SIZE = 15;
