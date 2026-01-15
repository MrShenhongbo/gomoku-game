import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadGameHistory,
  saveGameRecord,
  deleteGameRecord,
  clearGameHistory,
  calculateQualityScore,
  formatDate,
  getResultText,
  getModeText,
} from './gameHistory';
import type { GameRecord, Move } from '../types/game';

describe('gameHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadGameHistory', () => {
    it('should return empty array when no history exists', () => {
      const history = loadGameHistory();
      expect(history).toEqual([]);
    });

    it('should return saved history', () => {
      const mockHistory: GameRecord[] = [
        {
          id: '1',
          date: new Date().toISOString(),
          moves: [],
          result: 'BlackWin',
          gameMode: 'PvP',
          duration: 100,
          qualityScore: 50,
        },
      ];
      localStorage.setItem('gomoku-game-history', JSON.stringify(mockHistory));
      const history = loadGameHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('1');
    });

    it('should return empty array on parse error', () => {
      localStorage.setItem('gomoku-game-history', 'invalid json');
      const history = loadGameHistory();
      expect(history).toEqual([]);
    });
  });

  describe('saveGameRecord', () => {
    it('should save a new record', () => {
      const record: GameRecord = {
        id: '1',
        date: new Date().toISOString(),
        moves: [],
        result: 'BlackWin',
        gameMode: 'PvP',
        duration: 100,
        qualityScore: 50,
      };
      saveGameRecord(record);
      const history = loadGameHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('1');
    });

    it('should prepend new records', () => {
      const record1: GameRecord = {
        id: '1',
        date: new Date().toISOString(),
        moves: [],
        result: 'BlackWin',
        gameMode: 'PvP',
        duration: 100,
        qualityScore: 50,
      };
      const record2: GameRecord = {
        id: '2',
        date: new Date().toISOString(),
        moves: [],
        result: 'WhiteWin',
        gameMode: 'PvP',
        duration: 200,
        qualityScore: 60,
      };
      saveGameRecord(record1);
      saveGameRecord(record2);
      const history = loadGameHistory();
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('2'); // 最新的在前
      expect(history[1].id).toBe('1');
    });

    it('should limit to 50 records', () => {
      for (let i = 0; i < 55; i++) {
        saveGameRecord({
          id: String(i),
          date: new Date().toISOString(),
          moves: [],
          result: 'BlackWin',
          gameMode: 'PvP',
          duration: 100,
          qualityScore: 50,
        });
      }
      const history = loadGameHistory();
      expect(history).toHaveLength(50);
    });
  });

  describe('deleteGameRecord', () => {
    it('should delete a record by id', () => {
      const record: GameRecord = {
        id: '1',
        date: new Date().toISOString(),
        moves: [],
        result: 'BlackWin',
        gameMode: 'PvP',
        duration: 100,
        qualityScore: 50,
      };
      saveGameRecord(record);
      deleteGameRecord('1');
      const history = loadGameHistory();
      expect(history).toHaveLength(0);
    });

    it('should not affect other records', () => {
      saveGameRecord({
        id: '1',
        date: new Date().toISOString(),
        moves: [],
        result: 'BlackWin',
        gameMode: 'PvP',
        duration: 100,
        qualityScore: 50,
      });
      saveGameRecord({
        id: '2',
        date: new Date().toISOString(),
        moves: [],
        result: 'WhiteWin',
        gameMode: 'PvP',
        duration: 200,
        qualityScore: 60,
      });
      deleteGameRecord('1');
      const history = loadGameHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('2');
    });
  });

  describe('clearGameHistory', () => {
    it('shoul history', () => {
      saveGameRecord({
        id: '1',
        date: new Date().toISOString(),
        moves: [],
        result: 'BlackWin',
        gameMode: 'PvP',
        duration: 100,
        qualityScore: 50,
      });
      clearGameHistory();
      const history = loadGameHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('calculateQualityScore', () => {
    const createMoves = (count: number): Move[] => {
      return Array(count).fill(null).map((_, i) => ({
        position: { row: Math.floor(i / 15), col: i % 15 },
        stone: i % 2 === 0 ? 'Black' : 'White',
        move_number: i + 1,
      })) as Move[];
    };

    it('should return base score of 50', () => {
      const score = calculateQualityScore([], 'Playing', 'PvP');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give bonus for optimal move count (20-60)', () => {
      const score30 = calculateQualityScore(createMoves(30), 'BlackWin', 'PvP');
      const score5 = calculateQualityScore(createMoves(5), 'BlackWin', 'PvP');
      expect(score30).toBeGreaterThan(score5);
    });

    it('should give bonus for winning in PvAI', () => {
      const winScore = calculateQualityScore(
        createMoves(30),
        'BlackWin',
        'PvAI',
        'Medium',
        'Black'
      );
      const lossScore = calculateQualityScore(
        createMoves(30),
        'WhiteWin',
        'PvAI',
        'Medium',
        'Black'
      );
      expect(winScore).toBeGreaterThan(lossScore);
    });

    it('should give bonus for Hard difficulty', () => {
      const hardScore = calculateQualityScore(
        createMoves(30),
        'BlackWin',
        'PvAI',
        'Hard',
        'Black'
      );
      const easyScore = calculateQualityScore(
        createMoves(30),
        'BlackWin',
        'PvAI',
        'Easy',
        'Black'
      );
      expect(hardScore).toBeGreaterThan(easyScore);
    });

    it('should cap score at 100', () => {
      const score = calculateQualityScore(
        createMoves(30),
        'BlackWin',
        'PvAI',
        'Hard',
        'Black'
      );
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should not go below 0', () => {
      const score = calculateQualityScore(createMoves(3), 'Playing', 'PvP');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date(2024, 0, 15, 14, 30); // 2024-01-15 14:30
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-15 14:30');
    });

    it('should pad single digits', () => {
      const date = new Date(2024, 0, 5, 9, 5); // 2024-01-05 09:05
      const formatted = formatDate(date);
      expect(formatted).toBe('2024-01-05 09:05');
    });
  });

  describe('getResultText', () => {
    it('should return "平局" for Draw', () => {
      expect(getResultText('Draw', 'PvP')).toBe('平局');
    });

    it('should return "进行中" for Playing', () => {
      expect(getResultText('Playing', 'PvP')).toBe('进行中');
    });

    it('should return "黑胜" for BlackWin in PvP', () => {
      expect(getResultText('BlackWin', 'PvP')).toBe('黑胜');
    });

    it('should return "白胜" for WhiteWin in PvP', () => {
      expect(getResultText('WhiteWin', 'PvP')).toBe('白胜');
    });

    it('should return "胜利" for player win in PvAI', () => {
      expect(getResultText('BlackWin', 'PvAI', 'Black')).toBe('胜利');
      expect(getResultText('WhiteWin', 'PvAI', 'White')).toBe('胜利');
    });

    it('should return "失败" for player loss in PvAI', () => {
      expect(getResultText('WhiteWin', 'PvAI', 'Black')).toBe('失败');
      expect(getResultText('BlackWin', 'PvAI', 'White')).toBe('失败');
    });
  });

  describe('getModeText', () => {
    it('should return correct text for each mode', () => {
      expect(getModeText('PvP')).toBe('双人对战');
      expect(getModeText('PvAI')).toBe('人机对战');
      expect(getModeText('AIvAI')).toBe('AI对战');
    });
  });
});
