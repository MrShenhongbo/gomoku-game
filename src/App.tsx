import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './components/Board/Board';
import { GameInfo } from './components/GameInfo/GameInfo';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GameModeSelector, TimerConfig, AIvAIConfig } from './components/GameModeSelector/GameModeSelector';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { Settings } from './components/Settings/Settings';
import { Timer } from './components/Timer/Timer';
import { PuzzleMode } from './components/PuzzleMode/PuzzleMode';
import { AnalysisPanel } from './components/AnalysisPanel/AnalysisPanel';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSound } from './hooks/useSound';
import * as api from './api/gameApi';
import './App.css';

type ConfirmAction = 'newGame' | 'surrender' | null;

function App() {
  const {
    gameState,
    isLoading,
    isAIThinking,
    isGettingHint,
    hintPosition,
    error,
    startNewGame,
    handleCellClick,
    handleUndo,
    handleGetHint,
    handleSurrender,
  } = useGame();

  const { soundEnabled, toggleSound, playPlaceSound, playWinSound, playLoseSound } = useSound();

  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showPuzzleMode, setShowPuzzleMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({ mode: 'none', seconds: 30 });
  const [timerKey, setTimerKey] = useState(0);
  const prevMoveCountRef = useRef(0);
  const prevStatusRef = useRef<string | null>(null);

  // AIvAI 模式状态
  const [aivaiConfig, setAivaiConfig] = useState<AIvAIConfig | null>(null);
  const [aivaiPaused, setAivaiPaused] = useState(false);
  const aivaiIntervalRef = useRef<number | null>(null);

  // 监听落子播放音效
  useEffect(() => {
    if (!gameState) return;

    // 落子音效
    if (gameState.move_count > prevMoveCountRef.current) {
      playPlaceSound();
    }
    prevMoveCountRef.current = gameState.move_count;

    // 游戏结束音效
    if (prevStatusRef.current === 'Playing' && gameState.status !== 'Playing') {
      if (gameState.status === 'Draw') {
        // 平局不播放音效
      } else if (
        gameState.game_mode === 'PvAI' &&
        ((gameState.player_stone === 'Black' && gameState.status === 'BlackWin') ||
          (gameState.player_stone === 'White' && gameState.status === 'WhiteWin'))
      ) {
        playWinSound();
      } else if (gameState.game_mode === 'PvAI') {
        playLoseSound();
      } else {
        // PvP 或 AIvAI 模式播放获胜音效
        playWinSound();
      }
    }
    prevStatusRef.current = gameState.status;
  }, [gameState, playPlaceSound, playWinSound, playLoseSound]);

  // AIvAI 自动对弈
  useEffect(() => {
    if (!gameState || gameState.game_mode !== 'AIvAI' || !aivaiConfig) return;
    if (gameState.status !== 'Playing' || aivaiPaused) {
      if (aivaiIntervalRef.current) {
        clearTimeout(aivaiIntervalRef.current);
        aivaiIntervalRef.current = null;
      }
      return;
    }

    const makeAIMove = async () => {
      try {
        await api.aiMove();
      } catch (e) {
        console.error('AI move error:', e);
      }
    };

    aivaiIntervalRef.current = window.setTimeout(makeAIMove, aivaiConfig.speed);

    return () => {
      if (aivaiIntervalRef.current) {
        clearTimeout(aivaiIntervalRef.current);
        aivaiIntervalRef.current = null;
      }
    };
  }, [gameState, aivaiConfig, aivaiPaused]);

  const handleStartGame = (
    mode: 'PvP' | 'PvAI' | 'AIvAI' | 'Puzzle',
    difficulty?: 'Easy' | 'Medium' | 'Hard',
    playerStone?: 'Black' | 'White',
    timer?: TimerConfig,
    aivai?: AIvAIConfig,
    ruleSet?: 'Standard' | 'Renju'
  ) => {
    if (mode === 'Puzzle') {
      setShowPuzzleMode(true);
      setShowModeSelector(false);
      return;
    }
    if (mode === 'AIvAI' && aivai) {
      // AIvAI 模式使用黑棋难度作为默认难度
      startNewGame(mode, aivai.blackDifficulty, 'Black', ruleSet);
      setAivaiConfig(aivai);
      setAivaiPaused(false);
    } else {
      startNewGame(mode, difficulty, playerStone, ruleSet);
      setAivaiConfig(null);
    }
    setShowModeSelector(false);
    prevMoveCountRef.current = 0;
    prevStatusRef.current = 'Playing';
    if (timer) {
      setTimerConfig(timer);
      setTimerKey((k) => k + 1);
    }
  };

  const handleNewGameClick = useCallback(() => {
    if (gameState && gameState.move_count > 0 && gameState.status === 'Playing') {
      setConfirmAction('newGame');
    } else {
      setShowModeSelector(true);
      setShowPuzzleMode(false);
      setAivaiConfig(null);
    }
  }, [gameState]);

  const handleSurrenderClick = () => {
    setConfirmAction('surrender');
  };

  const handleConfirm = () => {
    if (confirmAction === 'newGame') {
      setShowModeSelector(true);
      setShowPuzzleMode(false);
      setAivaiConfig(null);
    } else if (confirmAction === 'surrender') {
      handleSurrender();
    }
    setConfirmAction(null);
  };

  const handleCancel = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleTimeout = useCallback(() => {
    handleSurrender();
  }, [handleSurrender]);

  const handleTogglePause = useCallback(() => {
    setAivaiPaused((p) => !p);
  }, []);

  const handlePuzzleBack = useCallback(() => {
    setShowPuzzleMode(false);
    setShowModeSelector(true);
  }, []);

  // 键盘快捷键
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onNewGame: handleNewGameClick,
    onHint: handleGetHint,
    onEscape: handleCancel,
    enabled: !showModeSelector && !showPuzzleMode && !!gameState,
  });

  if (!gameState) {
    return <div className="loading">加载中...</div>;
  }

  const isAIvAI = gameState.game_mode === 'AIvAI';

  return (
    <div className="app">
      <h1 className="title">五子棋</h1>
      <Settings soundEnabled={soundEnabled} onToggleSound={toggleSound} />

      {error && <div className="error">{error}</div>}

      {showPuzzleMode ? (
        <PuzzleMode onBack={handlePuzzleBack} />
      ) : showModeSelector ? (
        <div className="mode-selector-wrapper">
          <GameModeSelector onStartGame={handleStartGame} />
        </div>
      ) : (
        <>
          <GameInfo
            gameState={gameState}
            isLoading={isLoading}
            isAIThinking={isAIThinking}
          />
          {!isAIvAI && (
            <Timer
              key={timerKey}
              mode={timerConfig.mode}
              seconds={timerConfig.seconds}
              currentPlayer={gameState.current_player}
              isPlaying={gameState.status === 'Playing' && !isLoading && !isAIThinking}
              onTimeout={handleTimeout}
            />
          )}
          {isAIvAI && gameState.status === 'Playing' && (
            <div className="aivai-controls">
              <button
                className={`aivai-btn ${aivaiPaused ? 'paused' : 'playing'}`}
                onClick={handleTogglePause}
              >
                {aivaiPaused ? '▶ 继续' : '⏸ 暂停'}
              </button>
            </div>
          )}
          <Board
            board={gameState.board}
            lastMove={gameState.last_move}
            winningPositions={gameState.winning_positions}
            hintPosition={hintPosition}
            onCellClick={handleCellClick}
            disabled={isLoading || gameState.status !== 'Playing' || isAIvAI}
          />
          <ControlPanel
            gameState={gameState}
            isLoading={isLoading}
            isGettingHint={isGettingHint}
            onNewGame={handleNewGameClick}
            onUndo={handleUndo}
            onGetHint={handleGetHint}
            onSurrender={handleSurrenderClick}
          />
          {!isAIvAI && gameState.status === 'Playing' && (
            <AnalysisPanel disabled={isLoading || isAIThinking} />
          )}
        </>
      )}

      {confirmAction === 'newGame' && (
        <ConfirmDialog
          title="开始新游戏"
          message="当前对局尚未结束，确定要开始新游戏吗？"
          confirmText="确定"
          cancelText="取消"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {confirmAction === 'surrender' && (
        <ConfirmDialog
          title="确认认输"
          message="确定要认输吗？对手将获得胜利。"
          confirmText="认输"
          cancelText="取消"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default App;
