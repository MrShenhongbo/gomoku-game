import { useState } from 'react';
import { Board } from './components/Board/Board';
import { GameInfo } from './components/GameInfo/GameInfo';
import { ControlPanel } from './components/ControlPanel/ControlPanel';
import { GameModeSelector } from './components/GameModeSelector/GameModeSelector';
import { useGame } from './hooks/useGame';
import './App.css';

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
  } = useGame();

  const [showModeSelector, setShowModeSelector] = useState(true);

  const handleStartGame = (
    mode: 'PvP' | 'PvAI',
    difficulty?: 'Easy' | 'Medium' | 'Hard',
    playerStone?: 'Black' | 'White'
  ) => {
    startNewGame(mode, difficulty, playerStone);
    setShowModeSelector(false);
  };

  const handleNewGame = () => {
    setShowModeSelector(true);
  };

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
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onGetHint={handleGetHint}
          />
        </>
      )}
    </div>
  );
}

export default App;
