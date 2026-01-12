import type { GameSnapshot } from '../../types/game';
import './ControlPanel.css';

interface ControlPanelProps {
  gameState: GameSnapshot;
  isLoading: boolean;
  isGettingHint: boolean;
  isAnalyzing: boolean;
  onNewGame: () => void;
  onUndo: () => void;
  onGetHint: () => void;
  onSurrender: () => void;
  onAnalysis: () => void;
}

export function ControlPanel({
  gameState,
  isLoading,
  isGettingHint,
  isAnalyzing,
  onNewGame,
  onUndo,
  onGetHint,
  onSurrender,
  onAnalysis,
}: ControlPanelProps) {
  const canUndo = gameState.move_count > 0 && gameState.status === 'Playing';
  const canGetHint = gameState.status === 'Playing' && !isLoading && !isGettingHint;
  const canSurrender = gameState.status === 'Playing' && gameState.move_count > 0;
  const canAnalyze = gameState.status === 'Playing' && !isLoading && !isAnalyzing;

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
      <button
        className="btn-analysis"
        onClick={onAnalysis}
        disabled={!canAnalyze}
      >
        {isAnalyzing ? '分析中...' : 'AI分析'}
      </button>
      <button
        className="btn-surrender"
        onClick={onSurrender}
        disabled={isLoading || !canSurrender}
      >
        认输
      </button>
    </div>
  );
}
