import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  const defaultOptions = {
    onUndo: vi.fn(),
    onNewGame: vi.fn(),
    onHint: vi.fn(),
    onEscape: vi.fn(),
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fireKeyDown = (key: string, options: Partial<KeyboardEventInit> = {}) => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      ...options,
    });
    window.dispatchEvent(event);
  };

  describe('Ctrl+Z / Cmd+Z - Undo', () => {
    it('should call onUndo on Ctrl+Z', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('z', { ctrlKey: true });

      expect(defaultOptions.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should call onUndo on Cmd+Z (Mac)', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('z', { metaKey: true });

      expect(defaultOptions.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should prevent default behavior', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Ctrl+N / Cmd+N - New Game', () => {
    it('should call onNewGame on Ctrl+N', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('n', { ctrlKey: true });

      expect(defaultOptions.onNewGame).toHaveBeenCalledTimes(1);
    });

    it('should call onNewGame on Cmd+N (Mac)', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('n', { metaKey: true });

      expect(defaultOptions.onNewGame).toHaveBeenCalledTimes(1);
    });
  });

  describe('H key - Hint', () => {
    it('should call onHint on lowercase h', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('h');

      expect(defaultOptions.onHint).toHaveBeenCalledTimes(1);
    });

    it('should call onHint on uppercase H', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('H');

      expect(defaultOptions.onHint).toHaveBeenCalledTimes(1);
    });
  });

  describe('Escape key', () => {
    it('should call onEscape on Escape key', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('Escape');

      expect(defaultOptions.onEscape).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled state', () => {
    it('should do nothing when enabled is false', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          ...defaultOptions,
          enabled: false,
        })
      );

      fireKeyDown('z', { ctrlKey: true });
      fireKeyDown('n', { ctrlKey: true });
      fireKeyDown('h');
      fireKeyDown('Escape');

      expect(defaultOptions.onUndo).not.toHaveBeenCalled();
      expect(defaultOptions.onNewGame).not.toHaveBeenCalled();
      expect(defaultOptions.onHint).not.toHaveBeenCalled();
      expect(defaultOptions.onEscape).not.toHaveBeenCalled();
    });
  });

  describe('input focus', () => {
    it('should ignore keys when input is focused', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });

      window.dispatchEvent(event);

      expect(defaultOptions.onUndo).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('should ignore keys when textarea is focused', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const event = new KeyboardEvent('keydown', {
        key: 'h',
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: textarea });

      window.dispatchEvent(event);

      expect(defaultOptions.onHint).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useKeyboardShortcuts(defaultOptions));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('other keys', () => {
    it('should not call any handler for unregistered keys', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('a');
      fireKeyDown('b');
      fireKeyDown('Enter');

      expect(defaultOptions.onUndo).not.toHaveBeenCalled();
      expect(defaultOptions.onNewGame).not.toHaveBeenCalled();
      expect(defaultOptions.onHint).not.toHaveBeenCalled();
      expect(defaultOptions.onEscape).not.toHaveBeenCalled();
    });

    it('should not call onUndo for z without modifier', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('z');

      expect(defaultOptions.onUndo).not.toHaveBeenCalled();
    });

    it('should not call onNewGame for n without modifier', () => {
      renderHook(() => useKeyboardShortcuts(defaultOptions));

      fireKeyDown('n');

      expect(defaultOptions.onNewGame).not.toHaveBeenCalled();
    });
  });
});
