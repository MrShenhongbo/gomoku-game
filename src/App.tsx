import { useCallback, useState } from 'react';
import { Board } from './components/Board/Board';
import { GameInfo } from './components/GameInfo/GameInfo';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GameModeSelector } from './components/GameModeSelector/GameModeSelector';
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
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

  const [showModeSelector, setShowModeSelector] = useState(true);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const handleStartGame = (
    mode: 'PvP' | 'PvAI',
    difficulty?: 'Easy' | 'Medium' | 'Hard',
    playerStone?: 'Black' | 'White'
  ) => {
    startNewGame(mode, difficulty, playerStone);
    setShowModeSelector(false);
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
