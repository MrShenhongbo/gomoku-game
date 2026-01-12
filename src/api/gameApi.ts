import { invoke } from '@tauri-apps/api/core';
import type {
  AIDifficulty,
  AIMoveResult,
  AnalysisResult,
  ExportData,
  GameMode,
  GameSnapshot,
  HintResult,
  MoveHistoryResult,
  MoveResult,
  Puzzle,
  PuzzleCheckResult,
  PuzzleListItem,
  RuleSet,
  Stone,
} from '../types/game';

export async function newGame(
  mode: GameMode,
  difficulty?: AIDifficulty,
  playerStone?: Stone,
  ruleSet?: RuleSet
): Promise<GameSnapshot> {
  return invoke<GameSnapshot>('new_game', {
    mode,
    difficulty,
    playerStone,
    ruleSet,
  });
}

export async function makeMove(row: number, col: number): Promise<MoveResult> {
  return invoke<MoveResult>('make_move', { row, col });
}

export async function aiMove(): Promise<AIMoveResult> {
  return invoke<AIMoveResult>('ai_move');
}

export async function undoMove(): Promise<GameSnapshot> {
  return invoke<GameSnapshot>('undo_move');
}

export async function getGameState(): Promise<GameSnapshot> {
  return invoke<GameSnapshot>('get_game_state');
}

export async function getHint(): Promise<HintResult> {
  return invoke<HintResult>('get_hint');
}

export async function surrender(): Promise<GameSnapshot> {
  return invoke<GameSnapshot>('surrender');
}

export async function getMoveHistory(): Promise<MoveHistoryResult> {
  return invoke<MoveHistoryResult>('get_move_history');
}

export async function exportGame(): Promise<ExportData> {
  return invoke<ExportData>('export_game');
}

export async function getPuzzleList(): Promise<PuzzleListItem[]> {
  return invoke<PuzzleListItem[]>('get_puzzle_list');
}

export async function getPuzzle(id: number): Promise<Puzzle | null> {
  return invoke<Puzzle | null>('get_puzzle', { id });
}

export async function checkPuzzleMove(
  id: number,
  moves: [number, number][]
): Promise<PuzzleCheckResult> {
  return invoke<PuzzleCheckResult>('check_puzzle_move', { id, moves });
}

export async function analyzePosition(): Promise<AnalysisResult> {
  return invoke<AnalysisResult>('analyze_position');
}
