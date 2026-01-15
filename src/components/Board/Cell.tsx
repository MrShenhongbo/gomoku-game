import { memo, useCallback } from 'react';
import type { Stone } from '../../types/game';
import './Board.css';

interface CellProps {
  row: number;
  col: number;
  stone: Stone | null;
  isLastMove: boolean;
  isWinning: boolean;
  isHint: boolean;
  disabled: boolean;
  onCellClick: (row: number, col: number) => void;
}

// 生成棋盘位置的无障碍标签
function getCellLabel(row: number, col: number, stone: Stone | null): string {
  const colLabel = String.fromCharCode(65 + col); // A-O
  const rowLabel = 15 - row; // 15-1
  const position = `${colLabel}${rowLabel}`;
  if (stone) {
    return `${position}, ${stone === 'Black' ? '黑棋' : '白棋'}`;
  }
  return `${position}, 空位`;
}

export const Cell = memo(function Cell({
  row,
  col,
  stone,
  isLastMove,
  isWinning,
  isHint,
  disabled,
  onCellClick,
}: CellProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onCellClick(row, col);
    }
  }, [disabled, onCellClick, row, col]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault();
        onCellClick(row, col);
      }
    },
    [disabled, onCellClick, row, col]
  );

  return (
    <div
      className="cell"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={getCellLabel(row, col, stone)}
      aria-disabled={disabled}
    >
      <div className="cell-cross" />
      {stone && (
        <div
          className={`stone ${stone.toLowerCase()} ${isLastMove ? 'last-move' : ''} ${isWinning ? 'winning' : ''}`}
        />
      )}
      {!stone && isHint && <div className="hint-marker" />}
    </div>
  );
});
