import type { GameSnapshot } from '../../types/game';
import './GameInfo.css';

interface GameInfoProps {
  gameState: GameSnapshot;
  isLoading: boolean;
  isAIThinking?: boolean;
}

export function GameInfo({ gameState, isLoading: _isLoading, isAIThinking }: GameInfoProps) {
  const getStatusText = () => {
    switch (gameState.status) {
      case 'BlackWin':
        return '黑棋获胜!';
      case 'WhiteWin':
        return '白棋获胜!';
      case 'Draw':
        return '平局!';
      default:
        return null;
    }
  };

  const statusText = getStatusText();

  return (
    <div className="game-info">
      {statusText ? (
        <div
          className={`game-status ${gameState.status.toLowerCase().replace('win', '-win')}`}
        >
          {statusText}
        </div>
      ) : (
        <>
          <h2>当前回合</h2>
          <div className="current-player">
            <span
              className={`player-indicator ${gameState.current_player.toLowerCase()}`}
            />
            <span>
              {gameState.current_player === 'Black' ? '黑棋' : '白棋'}
              {gameState.game_mode === 'PvAI' &&
                gameState.current_player !== gameState.player_stone &&
                ' (AI)'}
            </span>
          </div>
        </>
      )}
      <div className="move-count">第 {gameState.move_count} 手</div>
      {isAIThinking ? (
        <div className="loading-indicator">
          <span className="thinking-dots">AI 思考中</span>
        </div>
      ) : (
        <div className="loading-placeholder">&nbsp;</div>
      )}
    </div>
  );
}
