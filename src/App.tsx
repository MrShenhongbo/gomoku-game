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
import { ReplayPanel } from './components/ReplayPanel/ReplayPanel';
import { GameHistory } from './components/GameHistory/GameHistory';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSound } from './hooks/useSound';
import { useReplay } from './hooks/useReplay';
import { useAnalysis } from './hooks/useAnalysis';
import { useAIvAI } from './hooks/useAIvAI';
import { useGameExport } from './hooks/useGameExport';
import { useGameRecord } from './hooks/useGameRecord';
import { useGameTimer } from './hooks/useGameTimer';
import type { GameRecord } from './types/game';
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
    fetchGameState,
  } = useGame();

  const { soundEnabled, toggleSound, playPlaceSound, playWinSound, playLoseSound } = useSound();

  // 使用新的自定义 Hooks
  const replay = useReplay();
  const analysis = useAnalysis(gameState?.move_count ?? 0);
  const aivai = useAIvAI(gameState, fetchGameState);
  const gameExport = useGameExport();
  const gameRecord = useGameRecord();
  const gameTimer = useGameTimer();

  // 界面显示控制
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showPuzzleMode, setShowPuzzleMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // 音效追踪
  const prevMoveCountRef = useRef(0);
  const prevStatusRef = useRef<string | null>(null);

  // 监听落子播放音效 + 游戏结束保存记录
  useEffect(() => {
    if (!gameState) return;

    // 落子音效
    if (gameState.move_count > prevMoveCountRef.current) {
      playPlaceSound();
    }
    prevMoveCountRef.current = gameState.move_count;

    // 游戏结束音效 + 保存记录
    if (prevStatusRef.current === 'Playing' && gameState.status !== 'Playing') {
      // 保存对局记录
      if (!gameRecord.isRecordSaved()) {
        gameRecord.saveRecord(gameState);
      }

      // 音效
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
  }, [gameState, playPlaceSound, playWinSound, playLoseSound, gameRecord]);

  const handleStartGame = (
    mode: 'PvP' | 'PvAI' | 'AIvAI' | 'Puzzle',
    difficulty?: 'Easy' | 'Medium' | 'Hard',
    playerStone?: 'Black' | 'White',
    timer?: TimerConfig,
    aivaiConfig?: AIvAIConfig,
    ruleSet?: 'Standard' | 'Renju'
  ) => {
    if (mode === 'Puzzle') {
      setShowPuzzleMode(true);
      setShowModeSelector(false);
      return;
    }
    if (mode === 'AIvAI' && aivaiConfig) {
      startNewGame(mode, aivaiConfig.blackDifficulty, 'Black', ruleSet);
      aivai.startAIvAI(aivaiConfig);
    } else {
      startNewGame(mode, difficulty, playerStone, ruleSet);
      aivai.stopAIvAI();
    }
    setShowModeSelector(false);
    analysis.resetAnalysis();
    prevMoveCountRef.current = 0;
    prevStatusRef.current = 'Playing';
    gameRecord.startRecording();
    if (timer) {
      gameTimer.setTimerConfig(timer);
    }
  };

  const handleNewGameClick = useCallback(() => {
    if (gameState && gameState.move_count > 0 && gameState.status === 'Playing') {
      setConfirmAction('newGame');
    } else {
      setShowModeSelector(true);
      setShowPuzzleMode(false);
      aivai.stopAIvAI();
      analysis.resetAnalysis();
    }
  }, [gameState, aivai, analysis]);

  const handleSurrenderClick = () => {
    setConfirmAction('surrender');
  };

  const handleConfirm = () => {
    if (confirmAction === 'newGame') {
      setShowModeSelector(true);
      setShowPuzzleMode(false);
      aivai.stopAIvAI();
      analysis.resetAnalysis();
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

  const handlePuzzleBack = useCallback(() => {
    setShowPuzzleMode(false);
    setShowModeSelector(true);
  }, []);

  // 分析功能
  const handleAnalysis = useCallback(async () => {
    if (analysis.showAnalysis) {
      await analysis.refreshAnalysis();
    } else {
      await analysis.openAnalysis();
    }
  }, [analysis]);

  // 从历史记录复盘
  const handleHistoryReplay = useCallback(
    (record: GameRecord) => {
      replay.startReplayFromRecord(record);
      gameRecord.closeHistory();
    },
    [replay, gameRecord]
  );

  // 导入棋谱
  const handleImport = useCallback(async () => {
    const moves = await gameExport.importGame();
    if (moves) {
      replay.startReplayFromMoves(moves);
      setShowModeSelector(false);
      gameRecord.closeHistory();
    }
  }, [gameExport, replay, gameRecord]);

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
      <Settings
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        showHistoryBtn={showModeSelector && !gameRecord.showHistory && !showPuzzleMode}
        onShowHistory={gameRecord.openHistory}
        onExport={!showModeSelector && !replay.showReplay && !showPuzzleMode && !gameRecord.showHistory ? gameExport.exportGame : undefined}
        onImport={!replay.showReplay && !showPuzzleMode && !gameRecord.showHistory && (showModeSelector || gameState.status !== 'Playing') ? handleImport : undefined}
        canExport={gameState.move_count > 0}
      />

      {error && <div className="error">{error}</div>}

      {showPuzzleMode ? (
        <PuzzleMode onBack={handlePuzzleBack} />
      ) : gameRecord.showHistory ? (
        <GameHistory onBack={gameRecord.closeHistory} onReplay={handleHistoryReplay} />
      ) : replay.showReplay ? (
        <div className="game-layout replay-layout">
          <div className="game-main replay-main">
            <Board
              board={replay.getReplayBoard(replay.replayStep)}
              lastMove={replay.getReplayLastMove(replay.replayStep)}
              winningPositions={null}
              hintPosition={null}
              onCellClick={() => {}}
              disabled={true}
            />
          </div>
          <ReplayPanel
            moves={replay.replayMoves.map((m) => ({
              position: m.position,
              stone: m.stone,
              moveNumber: m.move_number,
            }))}
            currentStep={replay.replayStep}
            onStepChange={replay.setReplayStep}
            onClose={replay.closeReplay}
          />
        </div>
      ) : showModeSelector ? (
        <div className="mode-selector-wrapper">
          <GameModeSelector onStartGame={handleStartGame} />
        </div>
      ) : (
        <div className="game-layout">
          <div className="game-main">
            <GameInfo gameState={gameState} isAIThinking={isAIThinking} />
            {!isAIvAI && (
              <Timer
                key={gameTimer.timerKey}
                mode={gameTimer.timerConfig.mode}
                seconds={gameTimer.timerConfig.seconds}
                currentPlayer={gameState.current_player}
                isPlaying={gameState.status === 'Playing' && !isLoading && !isAIThinking}
                onTimeout={handleTimeout}
              />
            )}
            {isAIvAI && gameState.status === 'Playing' && (
              <div className="aivai-controls">
                <button
                  className={`aivai-btn ${aivai.aivaiPaused ? 'paused' : 'playing'}`}
                  onClick={aivai.togglePause}
                >
                  {aivai.aivaiPaused ? '▶ 继续' : '⏸ 暂停'}
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
              isAnalyzing={analysis.isAnalyzing}
              onNewGame={handleNewGameClick}
              onUndo={handleUndo}
              onGetHint={handleGetHint}
              onSurrender={handleSurrenderClick}
              onAnalysis={handleAnalysis}
              onReplay={replay.startReplay}
            />
          </div>
          <AnalysisPanel
            isOpen={analysis.showAnalysis}
            isLoading={analysis.isAnalyzing}
            analysis={analysis.analysisResult}
            onClose={analysis.closeAnalysis}
          />
        </div>
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
