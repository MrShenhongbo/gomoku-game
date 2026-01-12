import { invoke } from '@tauri-apps/api/core';
import type {
  AIDifficulty,
  AIMoveResult,
  GameMode,
  GameSnapshot,
  HintResult,
  MoveResult,
  Stone,
} from '../types/game';

export async function newGame(
  mode: GameMode,
  difficulty?: AIDifficulty,
  playerStone?: Stone
): Promise<GameSnapshot> {
  return invoke<GameSnapshot>('new_game', {
    mode,
    difficulty,
    playerStone,
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
