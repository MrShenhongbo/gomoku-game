import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onUndo: () => void;
  onNewGame: () => void;
  onHint: () => void;
  onEscape: () => void;
  enabled: boolean;
}

export function useKeyboardShortcuts({
  onUndo,
  onNewGame,
  onHint,
  onEscape,
  enabled,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+Z / Cmd+Z - 悔棋
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        onUndo();
        return;
      }

      // Ctrl+N / Cmd+N - 新游戏
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        onNewGame();
        return;
      }

      // H - AI 建议
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onHint();
        return;
      }

      // Escape - 关闭对话框
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onUndo, onNewGame, onHint, onEscape]);
}
