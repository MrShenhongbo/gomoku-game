import type { GameSnapshot } from '../../types/game';
import './ControlPanel.css';

interface ControlPanelProps {
  gameState: GameSnapshot;
  isLoading: boolean;
  isGettingHint: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onGetHint: () => void;
}

export function ControlPanel({
  gameState,
  isLoading,
  isGettingHint,
  onNewGame,
  onUndo,
  onGetHint,
}: ControlPanelProps) {
  const canUndo = gameState.move_count > 0 && gameState.status === 'Playing';
  const canGetHint = gameState.status === 'Playing' && !isLoading && !isGettingHint;

  return (
    <div className="control-panel">
      <button className="btn-new-game" onClick={onNewGame} disabled={isLoading}>
        新游戏
      </button>
      <button
        className="btn-undo"
        onClick={onUndo}
        disabled={isLoading || !canUndo}
      >
        悔棋
      </button>
      <button
        className="btn-hint"
        onClick={onGetHint}
        disabled={!canGetHint}
      >
        {isGettingHint ? '思考中...' : 'AI建议'}
      </button>
    </div>
  );
}
