import { useCallback, useMemo } from 'react';
import { Cell } from './Cell';
import type { Position, Stone } from '../../types/game';
import { BOARD_SIZE } from '../../types/game';
import './Board.css';

// 列坐标标签 A-O
const COL_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) =>
  String.fromCharCode(65 + i)
);
// 行坐标标签 15-1（从上到下）
const ROW_LABELS = Array.from({ length: BOARD_SIZE }, (_, i) =>
  String(BOARD_SIZE - i)
);

interface BoardProps {
  board: (Stone | null)[][];
  lastMove: Position | null;
  winningPositions: Position[] | null;
  hintPosition: Position | null;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

export function Board({
  board,
  lastMove,
  winningPositions,
  hintPosition,
  onCellClick,
  disabled,
}: BoardProps) {
  // 将 winningPositions 转为 Set，O(1) 查找
  const winningSet = useMemo(() => {
    if (!winningPositions) return null;
    return new Set(winningPositions.map((pos) => `${pos.row}-${pos.col}`));
  }, [winningPositions]);

  const isWinningPosition = useCallback(
    (row: number, col: number): boolean => {
      return winningSet?.has(`${row}-${col}`) ?? false;
    },
    [winningSet]
  );

  const isLastMove = useCallback(
    (row: number, col: number): boolean => {
      if (!lastMove) return false;
      return lastMove.row === row && lastMove.col === col;
    },
    [lastMove]
  );

  const isHintPosition = useCallback(
    (row: number, col: number): boolean => {
      if (!hintPosition) return false;
      return hintPosition.row === row && hintPosition.col === col;
    },
    [hintPosition]
  );

  // 使用 useCallback 缓存，确保 Cell 的 memo 生效
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      onCellClick(row, col);
    },
    [onCellClick]
  );

  return (
    <div className={`board-container ${disabled ? 'disabled' : ''}`}>
      <div className="board-wrapper">
        {/* 顶部列坐标 */}
        <div className="coord-row coord-top">
          <div className="coord-corner" />
          {COL_LABELS.map((label) => (
            <div key={label} className="coord-label col-label">
              {label}
            </div>
          ))}
          <div className="coord-corner" />
        </div>

        <div className="board-main">
          {/* 左侧行坐标 */}
          <div className="coord-col">
            {ROW_LABELS.map((label) => (
              <div key={label} className="coord-label row-label">
                {label}
              </div>
            ))}
          </div>

          {/* 棋盘 */}
          <div className="board">
            {Array.from({ length: BOARD_SIZE }, (_, row) => (
              <div key={row} className="board-row">
                {Array.from({ length: BOARD_SIZE }, (_, col) => (
                  <Cell
                    key={`${row}-${col}`}
                    row={row}
                    col={col}
                    stone={board[row]?.[col] ?? null}
                    isLastMove={isLastMove(row, col)}
                    isWinning={isWinningPosition(row, col)}
                    isHint={isHintPosition(row, col)}
                    disabled={disabled}
                    onCellClick={handleCellClick}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* 右侧行坐标 */}
          <div className="coord-col">
            {ROW_LABELS.map((label) => (
              <div key={label} className="coord-label row-label">
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* 底部列坐标 */}
        <div className="coord-row coord-bottom">
          <div className="coord-corner" />
          {COL_LABELS.map((label) => (
            <div key={label} className="coord-label col-label">
              {label}
            </div>
          ))}
          <div className="coord-corner" />
        </div>
      </div>
    </div>
  );
}
