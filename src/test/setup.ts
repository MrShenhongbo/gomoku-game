import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';
import type { GameSnapshot, MoveResult, AIMoveResult, HintResult } from '../types/game';

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock requestAnimationFrame for useGame tests
global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  setTimeout(() => cb(0), 0);
  return 0;
});

global.cancelAnimationFrame = vi.fn();

// Test utility functions
export function createMockGameSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    current_player: 'Black',
    status: 'Playing',
    game_mode: 'PvP',
    move_count: 0,
    last_move: null,
    winning_positions: null,
    player_stone: 'Black',
    ai_difficulty: 'Medium',
    rule_set: 'Standard',
    ...overrides,
  };
}

export function createMockMoveResult(overrides: Partial<MoveResult> = {}): MoveResult {
  return {
    success: true,
    game_over: false,
    status: 'Playing',
    winning_positions: null,
    last_move: null,
    ...overrides,
  };
}

export function createMockAIMoveResult(overrides: Partial<AIMoveResult> = {}): AIMoveResult {
  return {
    position: { row: 7, col: 7 },
    move_result: createMockMoveResult(),
    error: null,
    ...overrides,
  };
}

export function createMockHintResult(overrides: Partial<HintResult> = {}): HintResult {
  return {
    position: { row: 7, col: 7 },
    ...overrides,
  };
}

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: vi.fn(),
  readTextFile: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock AudioContext
class MockAudioContext {
  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
  get destination() {
    return {};
  }
  close() {
    return Promise.resolve();
  }
}
(window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext = MockAudioContext;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
