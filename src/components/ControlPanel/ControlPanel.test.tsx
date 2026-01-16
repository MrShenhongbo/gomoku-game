import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlPanel } from './ControlPanel';
import type { GameSnapshot } from '../../types/game';

describe('ControlPanel', () => {
  const createMockGameState = (overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
    board: Array(15).fill(null).map(() => Array(15).fill(null)),
    current_player: 'Black',
    status: 'Playing',
    game_mode: 'PvP',
    move_count: 0,
    last_move: null,
    winning_positions: null,
    player_stone: 'Black',
    ai_difficulty: 'Medium',
    rule_set: 'Standard',
    ...overrides,
  });

  const defaultProps = {
    gameState: createMockGameState(),
    isLoading: false,
    isGettingHint: false,
    isAnalyzing: false,
    onNewGame: vi.fn(),
    onUndo: vi.fn(),
    onGetHint: vi.fn(),
    onSurrender: vi.fn(),
    onAnalysis: vi.fn(),
    onReplay: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('button rendering', () => {
    it('should render all 6 buttons', () => {
      render(<ControlPanel {...defaultProps} />);

      expect(screen.getByText('新游戏')).toBeInTheDocument();
      expect(screen.getByText('悔棋')).toBeInTheDocument();
      expect(screen.getByText('AI建议')).toBeInTheDocument();
      expect(screen.getByText('AI分析')).toBeInTheDocument();
      expect(screen.getByText('认输')).toBeInTheDocument();
      expect(screen.getByText('复盘')).toBeInTheDocument();
    });

    it('should show "思考中..." when getting hint', () => {
      render(<ControlPanel {...defaultProps} isGettingHint={true} />);

      expect(screen.getByText('思考中...')).toBeInTheDocument();
      expect(screen.queryByText('AI建议')).not.toBeInTheDocument();
    });

    it('should show "分析中..." when analyzing', () => {
      render(<ControlPanel {...defaultProps} isAnalyzing={true} />);

      expect(screen.getByText('分析中...')).toBeInTheDocument();
      expect(screen.queryByText('AI分析')).not.toBeInTheDocument();
    });
  });

  describe('button states', () => {
    it('should disable undo when no moves', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 0 })} />);

      expect(screen.getByText('悔棋')).toBeDisabled();
    });

    it('should enable undo when has moves and playing', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 2 })} />);

      expect(screen.getByText('悔棋')).not.toBeDisabled();
    });

    it('should disable undo when game over', () => {
      render(
        <ControlPanel
          {...defaultProps}
          gameState={createMockGameState({ move_count: 10, status: 'BlackWin' })}
        />
      );

      expect(screen.getByText('悔棋')).toBeDisabled();
    });

    it('should disable hint when loading', () => {
      render(<ControlPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText('AI建议')).toBeDisabled();
    });

    it('should disable hint when already getting hint', () => {
      render(<ControlPanel {...defaultProps} isGettingHint={true} />);

      expect(screen.getByText('思考中...')).toBeDisabled();
    });

    it('should disable surrender when no moves', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 0 })} />);

      expect(screen.getByText('认输')).toBeDisabled();
    });

    it('should enable surrender when has moves and playing', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 2 })} />);

      expect(screen.getByText('认输')).not.toBeDisabled();
    });

    it('should disable replay when game playing', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 5 })} />);

      expect(screen.getByText('复盘')).toBeDisabled();
    });

    it('should enable replay when game over with moves', () => {
      render(
        <ControlPanel
          {...defaultProps}
          gameState={createMockGameState({ move_count: 10, status: 'BlackWin' })}
        />
      );

      expect(screen.getByText('复盘')).not.toBeDisabled();
    });

    it('should disable replay when game over but no moves', () => {
      render(
        <ControlPanel
          {...defaultProps}
          gameState={createMockGameState({ move_count: 0, status: 'WhiteWin' })}
        />
      );

      expect(screen.getByText('复盘')).toBeDisabled();
    });

    it('should disable analysis when loading', () => {
      render(<ControlPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText('AI分析')).toBeDisabled();
    });

    it('should disable analysis when already analyzing', () => {
      render(<ControlPanel {...defaultProps} isAnalyzing={true} />);

      expect(screen.getByText('分析中...')).toBeDisabled();
    });

    it('should disable new game when loading', () => {
      render(<ControlPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText('新游戏')).toBeDisabled();
    });
  });

  describe('click handlers', () => {
    it('should call onNewGame on click', () => {
      render(<ControlPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('新游戏'));

      expect(defaultProps.onNewGame).toHaveBeenCalledTimes(1);
    });

    it('should call onUndo when enabled', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 2 })} />);

      fireEvent.click(screen.getByText('悔棋'));

      expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should not call onUndo when disabled', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 0 })} />);

      fireEvent.click(screen.getByText('悔棋'));

      expect(defaultProps.onUndo).not.toHaveBeenCalled();
    });

    it('should call onGetHint when enabled', () => {
      render(<ControlPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('AI建议'));

      expect(defaultProps.onGetHint).toHaveBeenCalledTimes(1);
    });

    it('should call onSurrender when enabled', () => {
      render(<ControlPanel {...defaultProps} gameState={createMockGameState({ move_count: 2 })} />);

      fireEvent.click(screen.getByText('认输'));

      expect(defaultProps.onSurrender).toHaveBeenCalledTimes(1);
    });

    it('should call onAnalysis when enabled', () => {
      render(<ControlPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('AI分析'));

      expect(defaultProps.onAnalysis).toHaveBeenCalledTimes(1);
    });

    it('should call onReplay when enabled', () => {
      render(
        <ControlPanel
          {...defaultProps}
          gameState={createMockGameState({ move_count: 10, status: 'BlackWin' })}
        />
      );

      fireEvent.click(screen.getByText('复盘'));

      expect(defaultProps.onReplay).toHaveBeenCalledTimes(1);
    });
  });
});
