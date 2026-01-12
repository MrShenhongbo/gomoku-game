import { useState } from 'react';
import type { AIDifficulty, GameMode, Stone } from '../../types/game';
import './GameModeSelector.css';

interface GameModeSelectorProps {
  onStartGame: (
    mode: GameMode,
    difficulty?: AIDifficulty,
    playerStone?: Stone
  ) => void;
}

export function GameModeSelector({ onStartGame }: GameModeSelectorProps) {
  const [mode, setMode] = useState<GameMode>('PvP');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('Medium');
  const [playerStone, setPlayerStone] = useState<Stone>('Black');

  const handleStart = () => {
    if (mode === 'PvAI') {
      onStartGame(mode, difficulty, playerStone);
    } else {
      onStartGame(mode);
    }
  };

  return (
    <div className="mode-selector">
      <h3>选择游戏模式</h3>
      <div className="mode-options">
        <button
          className={`mode-btn ${mode === 'PvP' ? 'active' : ''}`}
          onClick={() => setMode('PvP')}
        >
          双人对战
        </button>
        <button
          className={`mode-btn ${mode === 'PvAI' ? 'active' : ''}`}
          onClick={() => setMode('PvAI')}
        >
          人机对战
        </button>
      </div>

      {mode === 'PvAI' && (
        <div className="ai-options">
          <div className="option-group">
            <label>AI 难度</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${difficulty === 'Easy' ? 'active' : ''}`}
                onClick={() => setDifficulty('Easy')}
              >
                简单
              </button>
              <button
                className={`option-btn ${difficulty === 'Medium' ? 'active' : ''}`}
                onClick={() => setDifficulty('Medium')}
              >
                中等
              </button>
              <button
                className={`option-btn ${difficulty === 'Hard' ? 'active' : ''}`}
                onClick={() => setDifficulty('Hard')}
              >
                困难
              </button>
            </div>
          </div>

          <div className="option-group">
            <label>执子颜色</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${playerStone === 'Black' ? 'active' : ''}`}
                onClick={() => setPlayerStone('Black')}
              >
                黑棋 (先手)
              </button>
              <button
                className={`option-btn ${playerStone === 'White' ? 'active' : ''}`}
                onClick={() => setPlayerStone('White')}
              >
                白棋 (后手)
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="start-btn" onClick={handleStart}>
        开始游戏
      </button>
    </div>
  );
}
