import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import * as gameApi from './gameApi';

vi.mock('@tauri-apps/api/core');

const mockedInvoke = vi.mocked(invoke);

describe('gameApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('newGame', () => {
    it('should call invoke with correct command and args', async () => {
      mockedInvoke.mockResolvedValue({});

      await gameApi.newGame('PvP', 'Medium', 'Black', 'Standard');

      expect(mockedInvoke).toHaveBeenCalledWith('new_game', {
        mode: 'PvP',
        difficulty: 'Medium',
        playerStone: 'Black',
        ruleSet: 'Standard',
      });
    });

    it('should call invoke with undefined optional args', async () => {
      mockedInvoke.mockResolvedValue({});

      await gameApi.newGame('PvP');

      expect(mockedInvoke).toHaveBeenCalledWith('new_game', {
        mode: 'PvP',
        difficulty: undefined,
        playerStone: undefined,
        ruleSet: undefined,
      });
    });

    it('should return GameSnapshot on success', async () => {
      const mockSnapshot = { board: [], current_player: 'Black' };
      mockedInvoke.mockResolvedValue(mockSnapshot);

      const result = await gameApi.newGame('PvP');

      expect(result).toEqual(mockSnapshot);
    });

    it('should log and rethrow error on failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      mockedInvoke.mockRejectedValue(error);

      await expect(gameApi.newGame('PvP')).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Command new_game failed:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('makeMove', () => {
    it('should call invoke with row and col', async () => {
      mockedInvoke.mockResolvedValue({ success: true });

      await gameApi.makeMove(7, 8);

      expect(mockedInvoke).toHaveBeenCalledWith('make_move', { row: 7, col: 8 });
    });

    it('should return MoveResult', async () => {
      const mockResult = { success: true, game_over: false };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.makeMove(0, 0);

      expect(result).toEqual(mockResult);
    });
  });

  describe('aiMove', () => {
    it('should call invoke without args', async () => {
      mockedInvoke.mockResolvedValue({});

      await gameApi.aiMove();

      expect(mockedInvoke).toHaveBeenCalledWith('ai_move', undefined);
    });

    it('should return AIMoveResult', async () => {
      const mockResult = { position: { row: 7, col: 7 }, error: null };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.aiMove();

      expect(result).toEqual(mockResult);
    });
  });

  describe('undoMove', () => {
    it('should call invoke and return GameSnapshot', async () => {
      const mockSnapshot = { move_count: 0 };
      mockedInvoke.mockResolvedValue(mockSnapshot);

      const result = await gameApi.undoMove();

      expect(mockedInvoke).toHaveBeenCalledWith('undo_move', undefined);
      expect(result).toEqual(mockSnapshot);
    });
  });

  describe('getGameState', () => {
    it('should call invoke and return current GameSnapshot', async () => {
      const mockSnapshot = { status: 'Playing' };
      mockedInvoke.mockResolvedValue(mockSnapshot);

      const result = await gameApi.getGameState();

      expect(mockedInvoke).toHaveBeenCalledWith('get_game_state', undefined);
      expect(result).toEqual(mockSnapshot);
    });
  });

  describe('getHint', () => {
    it('should call invoke and return HintResult with position', async () => {
      const mockResult = { position: { row: 5, col: 5 } };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.getHint();

      expect(mockedInvoke).toHaveBeenCalledWith('get_hint', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('surrender', () => {
    it('should call invoke and return updated GameSnapshot', async () => {
      const mockSnapshot = { status: 'WhiteWin' };
      mockedInvoke.mockResolvedValue(mockSnapshot);

      const result = await gameApi.surrender();

      expect(mockedInvoke).toHaveBeenCalledWith('surrender', undefined);
      expect(result).toEqual(mockSnapshot);
    });
  });

  describe('getMoveHistory', () => {
    it('should call invoke and return MoveHistoryResult', async () => {
      const mockResult = { moves: [{ position: { row: 7, col: 7 }, stone: 'Black', move_number: 1 }] };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.getMoveHistory();

      expect(mockedInvoke).toHaveBeenCalledWith('get_move_history', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('exportGame', () => {
    it('should call invoke and return ExportData', async () => {
      const mockResult = { version: '1.0', moves: [], game_mode: 'PvP' };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.exportGame();

      expect(mockedInvoke).toHaveBeenCalledWith('export_game', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPuzzleList', () => {
    it('should call invoke and return array of PuzzleListItem', async () => {
      const mockResult = [{ id: 1, name: 'Puzzle 1', difficulty: 'Easy' }];
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.getPuzzleList();

      expect(mockedInvoke).toHaveBeenCalledWith('get_puzzle_list', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getPuzzle', () => {
    it('should call invoke with id and return Puzzle', async () => {
      const mockResult = { id: 1, name: 'Puzzle 1', initial_stones: [] };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.getPuzzle(1);

      expect(mockedInvoke).toHaveBeenCalledWith('get_puzzle', { id: 1 });
      expect(result).toEqual(mockResult);
    });

    it('should return null for non-existent puzzle', async () => {
      mockedInvoke.mockResolvedValue(null);

      const result = await gameApi.getPuzzle(999);

      expect(result).toBeNull();
    });
  });

  describe('checkPuzzleMove', () => {
    it('should call invoke with id and moves', async () => {
      const mockResult = { correct: true, complete: false, message: 'Correct!' };
      mockedInvoke.mockResolvedValue(mockResult);

      const moves: [number, number][] = [[7, 7], [8, 8]];
      const result = await gameApi.checkPuzzleMove(1, moves);

      expect(mockedInvoke).toHaveBeenCalledWith('check_puzzle_move', { id: 1, moves });
      expect(result).toEqual(mockResult);
    });
  });

  describe('analyzePosition', () => {
    it('should call invoke and return AnalysisResult', async () => {
      const mockResult = {
        board_score: 100,
        evaluation: 'Advantage',
        top_moves: [],
        threat_points: []
      };
      mockedInvoke.mockResolvedValue(mockResult);

      const result = await gameApi.analyzePosition();

      expect(mockedInvoke).toHaveBeenCalledWith('analyze_position', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('error handling', () => {
    it('should log errors with command name for all functions', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');
      mockedInvoke.mockRejectedValue(error);

      const commands = [
        () => gameApi.makeMove(0, 0),
        () => gameApi.aiMove(),
        () => gameApi.undoMove(),
        () => gameApi.getGameState(),
        () => gameApi.getHint(),
        () => gameApi.surrender(),
        () => gameApi.getMoveHistory(),
        () => gameApi.exportGame(),
        () => gameApi.getPuzzleList(),
        () => gameApi.getPuzzle(1),
        () => gameApi.checkPuzzleMove(1, []),
        () => gameApi.analyzePosition(),
      ];

      for (const cmd of commands) {
        await expect(cmd()).rejects.toThrow('Test error');
      }

      expect(consoleSpy).toHaveBeenCalledTimes(commands.length);
      consoleSpy.mockRestore();
    });
  });
});
