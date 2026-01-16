import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGame } from './useGame';
import * as api from '../api/gameApi';
import { createMockGameSnapshot } from '../test/setup';

vi.mock('../api/gameApi');

const mockedApi = vi.mocked(api);

describe('useGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getGameState
    mockedApi.getGameState.mockResolvedValue(createMockGameSnapshot());
  });

  describe('initial state', () => {
    it('should have null gameState initially', () => {
      const { result } = renderHook(() => useGame());
      expect(result.current.gameState).toBeNull();
    });

    it('should have isLoading false initially', () => {
      const { result } = renderHook(() => useGame());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have isAIThinking false initially', () => {
      const { result } = renderHook(() => useGame());
      expect(result.current.isAIThinking).toBe(false);
    });

    it('should have isGettingHint false initially', () => {
      const { result } = renderHook(() => useGame());
      expect(result.current.isGettingHint).toBe(false);
    });

    it('should have null hintPosition initially', () => {
      const { result } = renderHook(() => useGame());
      expect(result.current.hintPosition).toBeNull();
    });

    it('should expose all required functions', () => {
      const { result } = renderHook(() => useGame());

      expect(typeof result.current.startNewGame).toBe('function');
      expect(typeof result.current.handleCellClick).toBe('function');
      expect(typeof result.current.handleUndo).toBe('function');
      expect(typeof result.current.handleGetHint).toBe('function');
      expect(typeof result.current.handleSurrender).toBe('function');
      expect(typeof result.current.clearHint).toBe('function');
      expect(typeof result.current.fetchGameState).toBe('function');
    });
  });

  describe('startNewGame', () => {
    it('should call newGame API with correct parameters for PvP', async () => {
      const mockSnapshot = createMockGameSnapshot({ game_mode: 'PvP' });
      mockedApi.newGame.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.startNewGame('PvP');
      });

      expect(mockedApi.newGame).toHaveBeenCalledWith('PvP', undefined, undefined, undefined);
    });

    it('should call newGame API with difficulty and player stone for PvAI', async () => {
      const mockSnapshot = createMockGameSnapshot({ game_mode: 'PvAI' });
      mockedApi.newGame.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.startNewGame('PvAI', 'Hard', 'Black');
      });

      expect(mockedApi.newGame).toHaveBeenCalledWith('PvAI', 'Hard', 'Black', undefined);
    });

    it('should call newGame API with rule set', async () => {
      const mockSnapshot = createMockGameSnapshot({ rule_set: 'Renju' });
      mockedApi.newGame.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.startNewGame('PvP', undefined, undefined, 'Renju');
      });

      expect(mockedApi.newGame).toHaveBeenCalledWith('PvP', undefined, undefined, 'Renju');
    });

    it('should update gameState after successful newGame', async () => {
      const mockSnapshot = createMockGameSnapshot({ game_mode: 'PvP', move_count: 0 });
      mockedApi.newGame.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.startNewGame('PvP');
      });

      expect(result.current.gameState).toEqual(mockSnapshot);
    });
  });

  describe('clearHint', () => {
    it('should clear hintPosition', async () => {
      const { result } = renderHook(() => useGame());

      // Set a hint position first by mocking the state
      const mockHintResult = { position: { row: 7, col: 7 } };
      mockedApi.getHint.mockResolvedValue(mockHintResult);
      mockedApi.getGameState.mockResolvedValue(createMockGameSnapshot({ status: 'Playing' }));

      // Fetch game state first
      await act(async () => {
        await result.current.fetchGameState();
      });

      // Get hint
      await act(async () => {
        await result.current.handleGetHint();
      });

      // Clear hint
      act(() => {
        result.current.clearHint();
      });

      expect(result.current.hintPosition).toBeNull();
    });
  });

  describe('fetchGameState', () => {
    it('should call getGameState API', async () => {
      const mockSnapshot = createMockGameSnapshot();
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.fetchGameState();
      });

      expect(mockedApi.getGameState).toHaveBeenCalled();
    });

    it('should update gameState with fetched data', async () => {
      const mockSnapshot = createMockGameSnapshot({ move_count: 5 });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.fetchGameState();
      });

      expect(result.current.gameState?.move_count).toBe(5);
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockedApi.getGameState.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGame());

      await act(async () => {
        await result.current.fetchGameState();
      });

      // Should not throw, gameState remains null
      expect(result.current.gameState).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('handleUndo', () => {
    it('should call undoMove API', async () => {
      const mockSnapshot = createMockGameSnapshot({ move_count: 1, status: 'Playing' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);
      mockedApi.undoMove.mockResolvedValue(createMockGameSnapshot({ move_count: 0 }));

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleUndo();
      });

      expect(mockedApi.undoMove).toHaveBeenCalled();
    });
  });

  describe('handleSurrender', () => {
    it('should call surrender API when game is playing', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'Playing' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);
      mockedApi.surrender.mockResolvedValue(createMockGameSnapshot({ status: 'WhiteWin' }));

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleSurrender();
      });

      expect(mockedApi.surrender).toHaveBeenCalled();
    });

    it('should not call surrender API when game is not playing', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'BlackWin' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleSurrender();
      });

      expect(mockedApi.surrender).not.toHaveBeenCalled();
    });
  });

  describe('handleGetHint', () => {
    it('should call getHint API when game is playing', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'Playing' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);
      mockedApi.getHint.mockResolvedValue({ position: { row: 7, col: 7 } });

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleGetHint();
      });

      expect(mockedApi.getHint).toHaveBeenCalled();
    });

    it('should set hintPosition on successful hint', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'Playing' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);
      mockedApi.getHint.mockResolvedValue({ position: { row: 5, col: 5 } });

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleGetHint();
      });

      expect(result.current.hintPosition).toEqual({ row: 5, col: 5 });
    });

    it('should not call getHint API when game is not playing', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'BlackWin' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleGetHint();
      });

      expect(mockedApi.getHint).not.toHaveBeenCalled();
    });
  });

  describe('handleCellClick', () => {
    it('should call makeMove API with correct position', async () => {
      const mockSnapshot = createMockGameSnapshot({
        status: 'Playing',
        game_mode: 'PvP',
        current_player: 'Black'
      });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);
      mockedApi.makeMove.mockResolvedValue({
        success: true,
        game_over: false,
        status: 'Playing',
        current_player: 'White',
        winning_positions: null
      });

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleCellClick(7, 7);
      });

      expect(mockedApi.makeMove).toHaveBeenCalledWith(7, 7);
    });

    it('should not call makeMove when game is not playing', async () => {
      const mockSnapshot = createMockGameSnapshot({ status: 'BlackWin' });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleCellClick(7, 7);
      });

      expect(mockedApi.makeMove).not.toHaveBeenCalled();
    });

    it('should not call makeMove on occupied cell', async () => {
      const board = Array(15).fill(null).map(() => Array(15).fill(null));
      board[7][7] = 'Black';
      const mockSnapshot = createMockGameSnapshot({
        status: 'Playing',
        board
      });
      mockedApi.getGameState.mockResolvedValue(mockSnapshot);

      const { result } = renderHook(() => useGame());

      // First fetch game state
      await act(async () => {
        await result.current.fetchGameState();
      });

      await act(async () => {
        await result.current.handleCellClick(7, 7);
      });

      expect(mockedApi.makeMove).not.toHaveBeenCalled();
    });
  });
});
