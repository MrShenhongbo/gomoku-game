export type Stone = 'Black' | 'White';

export type GameMode = 'PvP' | 'PvAI' | 'AIvAI';

export type AIDifficulty = 'Easy' | 'Medium' | 'Hard';

export type GameStatus = 'Playing' | 'BlackWin' | 'WhiteWin' | 'Draw';

export type RuleSet = 'Standard' | 'Renju';

export type PuzzleDifficulty = 'Easy' | 'Medium' | 'Hard';

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

export interface Move {
  position: Position;
  stone: Stone;
  move_number: number;
}

export interface MoveHistoryResult {
  moves: Move[];
}

export interface ExportData {
  moves: Move[];
  game_mode: GameMode;
  rule_set: RuleSet;
  result: string;
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
  rule_set: RuleSet;
}

export const BOARD_SIZE = 15;

export interface Puzzle {
  id: number;
  name: string;
  difficulty: PuzzleDifficulty;
  description: string;
  initial_stones: [number, number, string][];
  player_stone: string;
  solutions: [number, number][][];
  hint: string;
}

export interface PuzzleListItem {
  id: number;
  name: string;
  difficulty: PuzzleDifficulty;
  description: string;
}

export interface PuzzleCheckResult {
  correct: boolean;
  complete: boolean;
  message: string;
}
