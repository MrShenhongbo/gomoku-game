import { useState } from 'react';
import type { AIDifficulty, GameMode, Stone } from '../../types/game';
import type { TimerMode } from '../Timer/Timer';
import './GameModeSelector.css';

export interface TimerConfig {
  mode: TimerMode;
  seconds: number;
}

export interface AIvAIConfig {
  blackDifficulty: AIDifficulty;
  whiteDifficulty: AIDifficulty;
  speed: number; // 每步间隔毫秒
}

interface GameModeSelectorProps {
  onStartGame: (
    mode: GameMode,
    difficulty?: AIDifficulty,
    playerStone?: Stone,
    timerConfig?: TimerConfig,
    aivaiConfig?: AIvAIConfig
  ) => void;
}

export function GameModeSelector({ onStartGame }: GameModeSelectorProps) {
  const [mode, setMode] = useState<GameMode>('PvP');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('Medium');
  const [playerStone, setPlayerStone] = useState<Stone>('Black');
  const [timerMode, setTimerMode] = useState<TimerMode>('none');
  const [timerSeconds, setTimerSeconds] = useState(30);
  // AIvAI 配置
  const [blackDifficulty, setBlackDifficulty] = useState<AIDifficulty>('Medium');
  const [whiteDifficulty, setWhiteDifficulty] = useState<AIDifficulty>('Medium');
  const [aiSpeed, setAiSpeed] = useState(1000);

  const handleStart = () => {
    const timerConfig: TimerConfig = { mode: timerMode, seconds: timerSeconds };
    if (mode === 'PvAI') {
      onStartGame(mode, difficulty, playerStone, timerConfig);
    } else if (mode === 'AIvAI') {
      const aivaiConfig: AIvAIConfig = {
        blackDifficulty,
        whiteDifficulty,
        speed: aiSpeed,
      };
      onStartGame(mode, undefined, undefined, timerConfig, aivaiConfig);
    } else {
      onStartGame(mode, undefined, undefined, timerConfig);
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
        <button
          className={`mode-btn ${mode === 'AIvAI' ? 'active' : ''}`}
          onClick={() => setMode('AIvAI')}
        >
          AI观战
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

      {mode === 'AIvAI' && (
        <div className="ai-options">
          <div className="option-group">
            <label>黑棋 AI 难度</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${blackDifficulty === 'Easy' ? 'active' : ''}`}
                onClick={() => setBlackDifficulty('Easy')}
              >
                简单
              </button>
              <button
                className={`option-btn ${blackDifficulty === 'Medium' ? 'active' : ''}`}
                onClick={() => setBlackDifficulty('Medium')}
              >
                中等
              </button>
              <button
                className={`option-btn ${blackDifficulty === 'Hard' ? 'active' : ''}`}
                onClick={() => setBlackDifficulty('Hard')}
              >
                困难
              </button>
            </div>
          </div>

          <div className="option-group">
            <label>白棋 AI 难度</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${whiteDifficulty === 'Easy' ? 'active' : ''}`}
                onClick={() => setWhiteDifficulty('Easy')}
              >
                简单
              </button>
              <button
                className={`option-btn ${whiteDifficulty === 'Medium' ? 'active' : ''}`}
                onClick={() => setWhiteDifficulty('Medium')}
              >
                中等
              </button>
              <button
                className={`option-btn ${whiteDifficulty === 'Hard' ? 'active' : ''}`}
                onClick={() => setWhiteDifficulty('Hard')}
              >
                困难
              </button>
            </div>
          </div>

          <div className="option-group">
            <label>对弈速度</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${aiSpeed === 500 ? 'active' : ''}`}
                onClick={() => setAiSpeed(500)}
              >
                快速
              </button>
              <button
                className={`option-btn ${aiSpeed === 1000 ? 'active' : ''}`}
                onClick={() => setAiSpeed(1000)}
              >
                正常
              </button>
              <button
                className={`option-btn ${aiSpeed === 2000 ? 'active' : ''}`}
                onClick={() => setAiSpeed(2000)}
              >
                慢速
              </button>
            </div>
          </div>
        </div>
      )}

      {mode !== 'AIvAI' && (
        <div className="timer-options">
          <div className="option-group">
            <label>计时模式</label>
            <div className="option-buttons">
              <button
                className={`option-btn ${timerMode === 'none' ? 'active' : ''}`}
                onClick={() => setTimerMode('none')}
              >
                无限时
              </button>
              <button
                className={`option-btn ${timerMode === 'perMove' ? 'active' : ''}`}
                onClick={() => {
                  setTimerMode('perMove');
                  setTimerSeconds(30);
                }}
              >
                每步限时
              </button>
              <button
                className={`option-btn ${timerMode === 'total' ? 'active' : ''}`}
                onClick={() => {
                  setTimerMode('total');
                  setTimerSeconds(300);
                }}
              >
                总时间
              </button>
            </div>
          </div>

          {timerMode === 'perMove' && (
            <div className="option-group">
              <label>每步时间</label>
              <div className="option-buttons">
                <button
                  className={`option-btn ${timerSeconds === 15 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(15)}
                >
                  15秒
                </button>
                <button
                  className={`option-btn ${timerSeconds === 30 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(30)}
                >
                  30秒
                </button>
                <button
                  className={`option-btn ${timerSeconds === 60 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(60)}
                >
                  60秒
                </button>
              </div>
            </div>
          )}

          {timerMode === 'total' && (
            <div className="option-group">
              <label>总时间</label>
              <div className="option-buttons">
                <button
                  className={`option-btn ${timerSeconds === 300 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(300)}
                >
                  5分钟
                </button>
                <button
                  className={`option-btn ${timerSeconds === 600 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(600)}
                >
                  10分钟
                </button>
                <button
                  className={`option-btn ${timerSeconds === 900 ? 'active' : ''}`}
                  onClick={() => setTimerSeconds(900)}
                >
                  15分钟
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button className="start-btn" onClick={handleStart}>
        开始游戏
      </button>
    </div>
  );
}
