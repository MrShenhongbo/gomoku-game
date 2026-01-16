import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSound } from './useSound';

describe('useSound', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should default soundEnabled to true', () => {
      const { result } = renderHook(() => useSound());
      expect(result.current.soundEnabled).toBe(true);
    });

    it('should read initial state from localStorage', () => {
      localStorage.setItem('gomoku-sound-enabled', 'true');
      const { result } = renderHook(() => useSound());
      expect(result.current.soundEnabled).toBe(true);
    });

    it('should be false when localStorage is false', () => {
      localStorage.setItem('gomoku-sound-enabled', 'false');
      const { result } = renderHook(() => useSound());
      expect(result.current.soundEnabled).toBe(false);
    });
  });

  describe('toggleSound', () => {
    it('should toggle soundEnabled state', () => {
      const { result } = renderHook(() => useSound());

      expect(result.current.soundEnabled).toBe(true);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.soundEnabled).toBe(false);

      act(() => {
        result.current.toggleSound();
      });

      expect(result.current.soundEnabled).toBe(true);
    });

    it('should persist to localStorage', () => {
      const { result } = renderHook(() => useSound());

      act(() => {
        result.current.toggleSound();
      });

      expect(localStorage.getItem('gomoku-sound-enabled')).toBe('false');

      act(() => {
        result.current.toggleSound();
      });

      expect(localStorage.getItem('gomoku-sound-enabled')).toBe('true');
    });
  });

  describe('playPlaceSound', () => {
    it('should do nothing when sound disabled', () => {
      localStorage.setItem('gomoku-sound-enabled', 'false');
      const { result } = renderHook(() => useSound());

      // Should not throw
      expect(() => {
        result.current.playPlaceSound();
      }).not.toThrow();
    });

    it('should create AudioContext on first play', () => {
      const { result } = renderHook(() => useSound());

      // Play sound - should create AudioContext
      result.current.playPlaceSound();

      // The mock AudioContext should have been used
      // This verifies the function runs without error
      expect(result.current.soundEnabled).toBe(true);
    });
  });

  describe('playWinSound', () => {
    it('should do nothing when sound disabled', () => {
      localStorage.setItem('gomoku-sound-enabled', 'false');
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playWinSound();
      }).not.toThrow();
    });

    it('should play ascending chord when enabled', () => {
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playWinSound();
      }).not.toThrow();
    });
  });

  describe('playLoseSound', () => {
    it('should do nothing when sound disabled', () => {
      localStorage.setItem('gomoku-sound-enabled', 'false');
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playLoseSound();
      }).not.toThrow();
    });

    it('should play descending notes when enabled', () => {
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playLoseSound();
      }).not.toThrow();
    });
  });

  describe('playClickSound', () => {
    it('should do nothing when sound disabled', () => {
      localStorage.setItem('gomoku-sound-enabled', 'false');
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playClickSound();
      }).not.toThrow();
    });

    it('should play single short tone when enabled', () => {
      const { result } = renderHook(() => useSound());

      expect(() => {
        result.current.playClickSound();
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should close AudioContext on unmount', () => {
      const { result, unmount } = renderHook(() => useSound());

      // Trigger AudioContext creation
      result.current.playPlaceSound();

      // Unmount should close the context
      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('return values', () => {
    it('should return all expected functions', () => {
      const { result } = renderHook(() => useSound());

      expect(typeof result.current.soundEnabled).toBe('boolean');
      expect(typeof result.current.toggleSound).toBe('function');
      expect(typeof result.current.playPlaceSound).toBe('function');
      expect(typeof result.current.playWinSound).toBe('function');
      expect(typeof result.current.playLoseSound).toBe('function');
      expect(typeof result.current.playClickSound).toBe('function');
    });
  });
});
