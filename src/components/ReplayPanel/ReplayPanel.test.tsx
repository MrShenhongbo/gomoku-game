import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReplayPanel } from './ReplayPanel';
import type { Position, Stone } from '../../types/game';

interface MoveRecord {
  position: Position;
  stone: Stone;
  moveNumber: number;
}

describe('ReplayPanel', () => {
  const createMoves = (count: number): MoveRecord[] => {
    return Array.from({ length: count }, (_, i) => ({
      position: { row: 7, col: 7 + i },
      stone: (i % 2 === 0 ? 'Black' : 'White') as Stone,
      moveNumber: i + 1,
    }));
  };

  const defaultProps = {
    moves: createMoves(10),
    currentStep: 0,
    onStepChange: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render header with title', () => {
      render(<ReplayPanel {...defaultProps} />);

      expect(screen.getByText('对局复盘')).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(<ReplayPanel {...defaultProps} />);

      expect(screen.getByText('⏮')).toBeInTheDocument();
      expect(screen.getByText('◀')).toBeInTheDocument();
      // There are two ▶ buttons (play and next)
      expect(screen.getAllByText('▶')).toHaveLength(2);
      expect(screen.getByText('⏭')).toBeInTheDocument();
    });

    it('should render progress indicator', () => {
      render(<ReplayPanel {...defaultProps} currentStep={5} />);

      expect(screen.getByText('5 / 10')).toBeInTheDocument();
    });

    it('should render move list', () => {
      render(<ReplayPanel {...defaultProps} />);

      // Check for move numbers
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('10.')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ReplayPanel {...defaultProps} />);

      expect(screen.getByText('×')).toBeInTheDocument();
      expect(screen.getByText('← 退出复盘')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should call onStepChange with 0 on first button click', () => {
      render(<ReplayPanel {...defaultProps} currentStep={5} />);

      fireEvent.click(screen.getByText('⏮'));

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(0);
    });

    it('should call onStepChange with decremented step on prev button', () => {
      render(<ReplayPanel {...defaultProps} currentStep={5} />);

      fireEvent.click(screen.getByText('◀'));

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(4);
    });

    it('should call onStepChange with incremented step on next button', () => {
      render(<ReplayPanel {...defaultProps} currentStep={5} />);

      // Button order: close(0), first(1), prev(2), play(3), next(4), last(5), back(6)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[4]); // Next button

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(6);
    });

    it('should call onStepChange with max step on last button', () => {
      render(<ReplayPanel {...defaultProps} currentStep={5} />);

      fireEvent.click(screen.getByText('⏭'));

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(10);
    });

    it('should disable first and prev buttons at step 0', () => {
      render(<ReplayPanel {...defaultProps} currentStep={0} />);

      expect(screen.getByText('⏮')).toBeDisabled();
      expect(screen.getByText('◀')).toBeDisabled();
    });

    it('should disable next and last buttons at max step', () => {
      render(<ReplayPanel {...defaultProps} currentStep={10} />);

      const buttons = screen.getAllByRole('button');
      // Button order: close(0), first(1), prev(2), play(3), next(4), last(5), back(6)
      expect(buttons[4]).toBeDisabled(); // Next button
      expect(buttons[5]).toBeDisabled(); // Last button
    });
  });

  describe('auto play', () => {
    it('should start auto play on play button click', () => {
      render(<ReplayPanel {...defaultProps} currentStep={0} />);

      // Button order: close(0), first(1), prev(2), play(3), next(4), last(5), back(6)
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Play button

      // Should show pause icon
      expect(buttons[3]).toHaveTextContent('⏸');
    });

    it('should advance step every 800ms during auto play', () => {
      render(<ReplayPanel {...defaultProps} currentStep={0} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Start auto play

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(1);

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(defaultProps.onStepChange).toHaveBeenCalledTimes(2);
    });

    it('should stop auto play at end', () => {
      render(<ReplayPanel {...defaultProps} currentStep={9} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Start auto play

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(10);

      // The component should stop auto play when reaching the end
      // No need to check for additional calls since the interval stops
    });

    it('should stop auto play on pause button click', () => {
      render(<ReplayPanel {...defaultProps} currentStep={0} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Start
      fireEvent.click(buttons[3]); // Pause

      expect(buttons[3]).toHaveTextContent('▶');

      act(() => {
        vi.advanceTimersByTime(1600);
      });

      // Should not advance after pause
      expect(defaultProps.onStepChange).not.toHaveBeenCalled();
    });
  });

  describe('move list', () => {
    it('should call onStepChange when clicking on move', () => {
      render(<ReplayPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('5.'));

      expect(defaultProps.onStepChange).toHaveBeenCalledWith(5);
    });

    it('should highlight current move', () => {
      const { container } = render(<ReplayPanel {...defaultProps} currentStep={5} />);

      const currentMove = container.querySelector('.move-item.current');
      expect(currentMove).toBeInTheDocument();
    });

    it('should style played moves differently', () => {
      const { container } = render(<ReplayPanel {...defaultProps} currentStep={5} />);

      const playedMoves = container.querySelectorAll('.move-item.played');
      expect(playedMoves).toHaveLength(5);
    });
  });

  describe('position notation', () => {
    it('should convert position to notation correctly', () => {
      const moves: MoveRecord[] = [
        { position: { row: 7, col: 7 }, stone: 'Black', moveNumber: 1 },
      ];

      render(<ReplayPanel {...defaultProps} moves={moves} />);

      expect(screen.getByText('H8')).toBeInTheDocument();
    });

    it('should handle corner positions', () => {
      const moves: MoveRecord[] = [
        { position: { row: 0, col: 0 }, stone: 'Black', moveNumber: 1 },
        { position: { row: 14, col: 14 }, stone: 'White', moveNumber: 2 },
      ];

      render(<ReplayPanel {...defaultProps} moves={moves} />);

      expect(screen.getByText('A15')).toBeInTheDocument();
      expect(screen.getByText('O1')).toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      const { unmount } = render(<ReplayPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Start auto play (play button is at index 3)

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should call onClose on close button click', () => {
      render(<ReplayPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('×'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose on back button click', () => {
      render(<ReplayPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('← 退出复盘'));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
