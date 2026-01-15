import { invoke, type InvokeArgs } from '@tauri-apps/api/core';
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

// 统一错误处理包装器
async function invokeWithErrorHandling<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  try {
    return await invoke<T>(cmd, args);
  } catch (error) {
    console.error(`Command ${cmd} failed:`, error);
    throw error;
  }
}

export async function newGame(
  mode: GameMode,
  difficulty?: AIDifficulty,
  playerStone?: Stone,
  ruleSet?: RuleSet
): Promise<GameSnapshot> {
  return invokeWithErrorHandling<GameSnapshot>('new_game', {
    mode,
    difficulty,
    playerStone,
    ruleSet,
  });
}

export async function makeMove(row: number, col: number): Promise<MoveResult> {
  return invokeWithErrorHandling<MoveResult>('make_move', { row, col });
}

export async function aiMove(): Promise<AIMoveResult> {
  return invokeWithErrorHandling<AIMoveResult>('ai_move');
}

export async function undoMove(): Promise<GameSnapshot> {
  return invokeWithErrorHandling<GameSnapshot>('undo_move');
}

export async function getGameState(): Promise<GameSnapshot> {
  return invokeWithErrorHandling<GameSnapshot>('get_game_state');
}

export async function getHint(): Promise<HintResult> {
  return invokeWithErrorHandling<HintResult>('get_hint');
}

export async function surrender(): Promise<GameSnapshot> {
  return invokeWithErrorHandling<GameSnapshot>('surrender');
}

export async function getMoveHistory(): Promise<MoveHistoryResult> {
  return invokeWithErrorHandling<MoveHistoryResult>('get_move_history');
}

export async function exportGame(): Promise<ExportData> {
  return invokeWithErrorHandling<ExportData>('export_game');
}

export async function getPuzzleList(): Promise<PuzzleListItem[]> {
  return invokeWithErrorHandling<PuzzleListItem[]>('get_puzzle_list');
}

export async function getPuzzle(id: number): Promise<Puzzle | null> {
  return invokeWithErrorHandling<Puzzle | null>('get_puzzle', { id });
}

export async function checkPuzzleMove(
  id: number,
  moves: [number, number][]
): Promise<PuzzleCheckResult> {
  return invokeWithErrorHandling<PuzzleCheckResult>('check_puzzle_move', { id, moves });
}

export async function analyzePosition(): Promise<AnalysisResult> {
  return invokeWithErrorHandling<AnalysisResult>('analyze_position');
}
