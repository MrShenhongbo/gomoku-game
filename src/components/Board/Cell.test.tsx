import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Cell } from './Cell';

describe('Cell', () => {
  const defaultProps = {
    row: 7,
    col: 7,
    stone: null,
    isLastMove: false,
    isWinning: false,
    isHint: false,
    disabled: false,
    onCellClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render empty cell', () => {
      render(<Cell {...defaultProps} />);
      const cell = screen.getByRole('button');
      expect(cell).toBeInTheDocument();
      expect(cell).toHaveAttribute('aria-label', 'H8, 空位');
    });

    it('should render black stone', () => {
      render(<Cell {...defaultProps} stone="Black" />);
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-label', 'H8, 黑棋');
      expect(cell.querySelector('.stone.black')).toBeInTheDocument();
    });

    it('should render white stone', () => {
      render(<Cell {...defaultProps} stone="White" />);
      const cell = screen.getByRole('button');
      expect(cell).toHaveAttribute('aria-label', 'H8, 白棋');
      expect(cell.querySelector('.stone.white')).toBeInTheDocument();
    });

    it('should show last move indicator', () => {
      render(<Cell {...defaultProps} stone="Black" isLastMove={true} />);
      const stone = screen.getByRole('button').querySelector('.stone');
      expect(stone).toHaveClass('last-move');
    });

    it('should show winning indicator', () => {
      render(<Cell {...defaultProps} stone="Black" isWinning={true} />);
      const stone = screen.getByRole('button').querySelector('.stone');
      expect(stone).toHaveClass('winning');
    });

    it('should show hint marker when empty and isHint', () => {
      render(<Cell {...defaultProps} isHint={true} />);
      const cell = screen.getByRole('button');
      expect(cell.querySelector('.hint-marker')).toBeInTheDocument();
    });

    it('should not show hint marker when has stone', () => {
      render(<Cell {...defaultProps} stone="Black" isHint={true} />);
      const cell = screen.getByRole('button');
      expect(cell.querySelector('.hint-marker')).not.toBeInTheDocument();
    });
  });

  describe('click handling', () => {
    it('should call onCellClick when clicked', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onCellClick).toHaveBeenCalledWith(7, 7);
    });

    it('should not call onCellClick when disabled', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} disabled={true} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onCellClick).not.toHaveBeenCalled();
    });
  });

  describe('keyboard handling', () => {
    it('should call onCellClick on Enter key', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(onCellClick).toHaveBeenCalledWith(7, 7);
    });

    it('should call onCellClick on Space key', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
      expect(onCellClick).toHaveBeenCalledWith(7, 7);
    });

    it('should not call onCellClick on other keys', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'a' });
      expect(onCellClick).not.toHaveBeenCalled();
    });

    it('should not call onCellClick when disabled', () => {
      const onCellClick = vi.fn();
      render(<Cell {...defaultProps} onCellClick={onCellClick} disabled={true} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(onCellClick).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have correct aria-label for different positions', () => {
      const { rerender } = render(<Cell {...defaultProps} row={0} col={0} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'A15, 空位');

      rerender(<Cell {...defaultProps} row={14} col={14} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'O1, 空位');
    });

    it('should have tabIndex 0 when not disabled', () => {
      render(<Cell {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabIndex -1 when disabled', () => {
      render(<Cell {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
    });

    it('should have aria-disabled when disabled', () => {
      render(<Cell {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
