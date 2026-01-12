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

  return (
    <div className="cell" onClick={handleClick}>
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
