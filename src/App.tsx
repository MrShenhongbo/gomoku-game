import { useCallback, useEffect, useRef, useState } from 'react';
import { Board } from './components/Board/Board';
import { GameInfo } from './components/GameInfo/GameInfo';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GameModeSelector, TimerConfig } from './components/GameModeSelector/GameModeSelector';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { Settings } from './components/Settings/Settings';
import { Timer } from './components/Timer/Timer';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSound } from './hooks/useSound';
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
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({ mode: 'none', seconds: 30 });
  const [timerKey, setTimerKey] = useState(0);
  const prevMoveCountRef = useRef(0);
  const prevStatusRef = useRef<string | null>(null);

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
        // PvP 模式播放获胜音效
        playWinSound();
      }
    }
    prevStatusRef.current = gameState.status;
  }, [gameState, playPlaceSound, playWinSound, playLoseSound]);

  const handleStartGame = (
    mode: 'PvP' | 'PvAI',
    difficulty?: 'Easy' | 'Medium' | 'Hard',
    playerStone?: 'Black' | 'White',
    timer?: TimerConfig
  ) => {
    startNewGame(mode, difficulty, playerStone);
    setShowModeSelector(false);
    prevMoveCountRef.current = 0;
    prevStatusRef.current = 'Playing';
    if (timer) {
      setTimerConfig(timer);
      setTimerKey((k) => k + 1); // 重置计时器
    }
  };

  const handleNewGameClick = useCallback(() => {
    // 如果游戏进行中且有落子，显示确认对话框
    if (gameState && gameState.move_count > 0 && gameState.status === 'Playing') {
      setConfirmAction('newGame');
    } else {
      setShowModeSelector(true);
    }
  }, [gameState]);

  const handleSurrenderClick = () => {
    setConfirmAction('surrender');
  };

  const handleConfirm = () => {
    if (confirmAction === 'newGame') {
      setShowModeSelector(true);
    } else if (confirmAction === 'surrender') {
      handleSurrender();
    }
    setConfirmAction(null);
  };

  const handleCancel = useCallback(() => {
    setConfirmAction(null);
  }, []);

  const handleTimeout = useCallback(() => {
    // 超时判负，当前玩家认输
    handleSurrender();
  }, [handleSurrender]);

  // 键盘快捷键
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onNewGame: handleNewGameClick,
    onHint: handleGetHint,
    onEscape: handleCancel,
    enabled: !showModeSelector && !!gameState,
  });

  if (!gameState) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="app">
      <h1 className="title">五子棋</h1>
      <Settings soundEnabled={soundEnabled} onToggleSound={toggleSound} />

      {error && <div className="error">{error}</div>}

      {showModeSelector ? (
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
          <Timer
            key={timerKey}
            mode={timerConfig.mode}
            seconds={timerConfig.seconds}
            currentPlayer={gameState.current_player}
            isPlaying={gameState.status === 'Playing' && !isLoading && !isAIThinking}
            onTimeout={handleTimeout}
          />
          <Board
            board={gameState.board}
            lastMove={gameState.last_move}
            winningPositions={gameState.winning_positions}
            hintPosition={hintPosition}
            onCellClick={handleCellClick}
            disabled={isLoading || gameState.status !== 'Playing'}
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
