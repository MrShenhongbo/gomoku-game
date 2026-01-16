import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Timer } from './Timer';

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('mode: none', () => {
    it('should return null when mode is none', () => {
      const { container } = render(
        <Timer
          mode="none"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('mode: perMove', () => {
    it('should display initial time correctly', () => {
      render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={false}
          onTimeout={vi.fn()}
        />
      );

      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('should count down every second when playing', () => {
      render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      expect(screen.getByText('0:30')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('0:29')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('0:24')).toBeInTheDocument();
    });

    it('should reset on player change', () => {
      const { rerender } = render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText('0:20')).toBeInTheDocument();

      // Change player
      rerender(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="White"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      expect(screen.getByText('0:30')).toBeInTheDocument();
    });

    it('should call onTimeout when time reaches 0', () => {
      const onTimeout = vi.fn();
      render(
        <Timer
          mode="perMove"
          seconds={3}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={onTimeout}
        />
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('should show low-time class when <= 10 seconds', () => {
      const { container } = render(
        <Timer
          mode="perMove"
          seconds={15}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      expect(container.querySelector('.low-time')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(container.querySelector('.low-time')).toBeInTheDocument();
    });

    it('should stop counting when not playing', () => {
      const { rerender } = render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('0:25')).toBeInTheDocument();

      rerender(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={false}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Time should not change when not playing
      expect(screen.getByText('0:25')).toBeInTheDocument();
    });
  });

  describe('mode: total', () => {
    it('should show both player times', () => {
      render(
        <Timer
          mode="total"
          seconds={300}
          currentPlayer="Black"
          isPlaying={false}
          onTimeout={vi.fn()}
        />
      );

      const timeDisplays = screen.getAllByText('5:00');
      expect(timeDisplays).toHaveLength(2);
    });

    it('should only decrease active player time', () => {
      render(
        <Timer
          mode="total"
          seconds={60}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Black's time should decrease
      expect(screen.getByText('0:50')).toBeInTheDocument();
      // White's time should remain
      expect(screen.getByText('1:00')).toBeInTheDocument();
    });

    it('should mark active player', () => {
      const { container } = render(
        <Timer
          mode="total"
          seconds={60}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      const playerTimes = container.querySelectorAll('.player-time');
      expect(playerTimes[0]).toHaveClass('active');
      expect(playerTimes[1]).not.toHaveClass('active');
    });

    it('should call onTimeout for correct player', () => {
      const onTimeout = vi.fn();
      render(
        <Timer
          mode="total"
          seconds={3}
          currentPlayer="White"
          isPlaying={true}
          onTimeout={onTimeout}
        />
      );

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('should show low-time for each player independently', () => {
      const { container, rerender } = render(
        <Timer
          mode="total"
          seconds={15}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Black should have low-time
      const lowTimeElements = container.querySelectorAll('.low-time');
      expect(lowTimeElements).toHaveLength(1);

      // Switch to White
      rerender(
        <Timer
          mode="total"
          seconds={15}
          currentPlayer="White"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Both should have low-time now
      const allLowTime = container.querySelectorAll('.low-time');
      expect(allLowTime).toHaveLength(2);
    });
  });

  describe('time formatting', () => {
    it('should format minutes:seconds correctly', () => {
      render(
        <Timer
          mode="perMove"
          seconds={125}
          currentPlayer="Black"
          isPlaying={false}
          onTimeout={vi.fn()}
        />
      );

      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('should pad seconds with leading zero', () => {
      render(
        <Timer
          mode="perMove"
          seconds={65}
          currentPlayer="Black"
          isPlaying={false}
          onTimeout={vi.fn()}
        />
      );

      expect(screen.getByText('1:05')).toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      const { unmount } = render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear interval when mode changes to none', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      const { rerender } = render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      rerender(
        <Timer
          mode="none"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={vi.fn()}
        />
      );

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('ref stability', () => {
    it('should not reset interval when onTimeout changes', () => {
      const onTimeout1 = vi.fn();
      const onTimeout2 = vi.fn();

      const { rerender } = render(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={onTimeout1}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByText('0:25')).toBeInTheDocument();

      // Change onTimeout callback
      rerender(
        <Timer
          mode="perMove"
          seconds={30}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={onTimeout2}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Timer should continue from where it was
      expect(screen.getByText('0:20')).toBeInTheDocument();
    });

    it('should prevent multiple timeout calls', () => {
      const onTimeout = vi.fn();
      render(
        <Timer
          mode="perMove"
          seconds={2}
          currentPlayer="Black"
          isPlaying={true}
          onTimeout={onTimeout}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should only be called once even after multiple intervals
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });
});
