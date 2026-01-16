import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Board } from './Board';
import type { Position, Stone } from '../../types/game';

describe('Board', () => {
  const emptyBoard: (Stone | null)[][] = Array(15)
    .fill(null)
    .map(() => Array(15).fill(null));

  const defaultProps = {
    board: emptyBoard,
    lastMove: null,
    winningPositions: null,
    hintPosition: null,
    onCellClick: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render 15x15 grid (225 cells)', () => {
      render(<Board {...defaultProps} />);
      const cells = screen.getAllByRole('button');
      expect(cells).toHaveLength(225);
    });

    it('should render column labels A-O at top', () => {
      render(<Board {...defaultProps} />);
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
      labels.forEach((label) => {
        // Each label appears twice (top and bottom)
        const elements = screen.getAllByText(label);
        expect(elements.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should render row labels 15-1', () => {
      render(<Board {...defaultProps} />);
      for (let i = 1; i <= 15; i++) {
        // Each label appears twice (left and right)
        const elements = screen.getAllByText(String(i));
        expect(elements.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should render stones in correct positions', () => {
      const boardWithStones = emptyBoard.map((row) => [...row]);
      boardWithStones[7][7] = 'Black';
      boardWithStones[7][8] = 'White';

      render(<Board {...defaultProps} board={boardWithStones} />);

      // Check for black stone
      const blackStoneCell = screen.getByLabelText('H8, 黑棋');
      expect(blackStoneCell.querySelector('.stone.black')).toBeInTheDocument();

      // Check for white stone
      const whiteStoneCell = screen.getByLabelText('I8, 白棋');
      expect(whiteStoneCell.querySelector('.stone.white')).toBeInTheDocument();
    });

    it('should apply disabled class when disabled', () => {
      const { container } = render(<Board {...defaultProps} disabled={true} />);
      expect(container.querySelector('.board-container.disabled')).toBeInTheDocument();
    });

    it('should not apply disabled class when not disabled', () => {
      const { container } = render(<Board {...defaultProps} disabled={false} />);
      expect(container.querySelector('.board-container.disabled')).not.toBeInTheDocument();
    });
  });

  describe('cell interaction', () => {
    it('should call onCellClick with correct row and col', () => {
      const onCellClick = vi.fn();
      render(<Board {...defaultProps} onCellClick={onCellClick} />);

      // Click on center cell (H8 = row 7, col 7)
      const centerCell = screen.getByLabelText('H8, 空位');
      fireEvent.click(centerCell);

      expect(onCellClick).toHaveBeenCalledWith(7, 7);
    });

    it('should pass disabled prop to cells', () => {
      const onCellClick = vi.fn();
      render(<Board {...defaultProps} onCellClick={onCellClick} disabled={true} />);

      const cell = screen.getByLabelText('A15, 空位');
      fireEvent.click(cell);

      expect(onCellClick).not.toHaveBeenCalled();
    });

    it('should call onCellClick for different positions', () => {
      const onCellClick = vi.fn();
      render(<Board {...defaultProps} onCellClick={onCellClick} />);

      // Click on corner cell (A15 = row 0, col 0)
      const cornerCell = screen.getByLabelText('A15, 空位');
      fireEvent.click(cornerCell);
      expect(onCellClick).toHaveBeenCalledWith(0, 0);

      // Click on another corner (O1 = row 14, col 14)
      const otherCorner = screen.getByLabelText('O1, 空位');
      fireEvent.click(otherCorner);
      expect(onCellClick).toHaveBeenCalledWith(14, 14);
    });
  });

  describe('last move indicator', () => {
    it('should mark last move cell correctly', () => {
      const boardWithStone = emptyBoard.map((row) => [...row]);
      boardWithStone[7][7] = 'Black';
      const lastMove: Position = { row: 7, col: 7 };

      render(<Board {...defaultProps} board={boardWithStone} lastMove={lastMove} />);

      const lastMoveCell = screen.getByLabelText('H8, 黑棋');
      expect(lastMoveCell.querySelector('.stone.last-move')).toBeInTheDocument();
    });

    it('should not mark other cells as last move', () => {
      const boardWithStones = emptyBoard.map((row) => [...row]);
      boardWithStones[7][7] = 'Black';
      boardWithStones[7][8] = 'White';
      const lastMove: Position = { row: 7, col: 8 };

      render(<Board {...defaultProps} board={boardWithStones} lastMove={lastMove} />);

      // First stone should not have last-move class
      const firstStoneCell = screen.getByLabelText('H8, 黑棋');
      expect(firstStoneCell.querySelector('.stone.last-move')).not.toBeInTheDocument();

      // Second stone should have last-move class
      const lastMoveCell = screen.getByLabelText('I8, 白棋');
      expect(lastMoveCell.querySelector('.stone.last-move')).toBeInTheDocument();
    });
  });

  describe('winning positions', () => {
    it('should mark winning cells correctly', () => {
      const boardWithWin = emptyBoard.map((row) => [...row]);
      // Create a horizontal win
      for (let col = 7; col < 12; col++) {
        boardWithWin[7][col] = 'Black';
      }

      const winningPositions: Position[] = [
        { row: 7, col: 7 },
        { row: 7, col: 8 },
        { row: 7, col: 9 },
        { row: 7, col: 10 },
        { row: 7, col: 11 },
      ];

      render(
        <Board
          {...defaultProps}
          board={boardWithWin}
          winningPositions={winningPositions}
        />
      );

      // All winning cells should have winning class
      winningPositions.forEach((pos) => {
        const colLabel = String.fromCharCode(65 + pos.col);
        const rowLabel = 15 - pos.row;
        const cell = screen.getByLabelText(`${colLabel}${rowLabel}, 黑棋`);
        expect(cell.querySelector('.stone.winning')).toBeInTheDocument();
      });
    });

    it('should not mark non-winning cells', () => {
      const boardWithStones = emptyBoard.map((row) => [...row]);
      boardWithStones[7][7] = 'Black';
      boardWithStones[8][8] = 'White';

      const winningPositions: Position[] = [{ row: 7, col: 7 }];

      render(
        <Board
          {...defaultProps}
          board={boardWithStones}
          winningPositions={winningPositions}
        />
      );

      // Non-winning stone should not have winning class
      const nonWinningCell = screen.getByLabelText('I7, 白棋');
      expect(nonWinningCell.querySelector('.stone.winning')).not.toBeInTheDocument();
    });
  });

  describe('hint position', () => {
    it('should mark hint cell correctly', () => {
      const hintPosition: Position = { row: 7, col: 7 };

      render(<Board {...defaultProps} hintPosition={hintPosition} />);

      const hintCell = screen.getByLabelText('H8, 空位');
      expect(hintCell.querySelector('.hint-marker')).toBeInTheDocument();
    });

    it('should not show hint on cells with stones', () => {
      const boardWithStone = emptyBoard.map((row) => [...row]);
      boardWithStone[7][7] = 'Black';
      const hintPosition: Position = { row: 7, col: 7 };

      render(
        <Board {...defaultProps} board={boardWithStone} hintPosition={hintPosition} />
      );

      const cell = screen.getByLabelText('H8, 黑棋');
      expect(cell.querySelector('.hint-marker')).not.toBeInTheDocument();
    });

    it('should only show hint on specified position', () => {
      const hintPosition: Position = { row: 7, col: 7 };

      render(<Board {...defaultProps} hintPosition={hintPosition} />);

      // Other cells should not have hint marker
      const otherCell = screen.getByLabelText('A15, 空位');
      expect(otherCell.querySelector('.hint-marker')).not.toBeInTheDocument();
    });
  });

  describe('performance optimizations', () => {
    it('should use Set for winning positions lookup', () => {
      const boardWithWin = emptyBoard.map((row) => [...row]);
      for (let col = 7; col < 12; col++) {
        boardWithWin[7][col] = 'Black';
      }

      const winningPositions: Position[] = [
        { row: 7, col: 7 },
        { row: 7, col: 8 },
        { row: 7, col: 9 },
        { row: 7, col: 10 },
        { row: 7, col: 11 },
      ];

      // This test verifies the component renders correctly with winning positions
      // The Set optimization is internal implementation detail
      const { container } = render(
        <Board
          {...defaultProps}
          board={boardWithWin}
          winningPositions={winningPositions}
        />
      );

      const winningStones = container.querySelectorAll('.stone.winning');
      expect(winningStones).toHaveLength(5);
    });
  });
});
