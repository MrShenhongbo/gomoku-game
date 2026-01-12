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
import * as api from './api/gameApi';
import type { AnalysisResult, GameRecord, Move, Position, Stone } from './types/game';
import { saveGameRecord, calculateQualityScore, formatDate } from './utils/gameHistory';
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

  // 分析面板状态
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // 复盘状态
  const [showReplay, setShowReplay] = useState(false);
  const [replayMoves, setReplayMoves] = useState<Move[]>([]);
  const [replayStep, setReplayStep] = useState(0);

  // 对局记录状态
  const [showHistory, setShowHistory] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const gameRecordSavedRef = useRef(false);

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
      if (!gameRecordSavedRef.current && gameState.move_count > 0) {
        const saveRecord = async () => {
          try {
            const historyResult = await api.getMoveHistory();
            const duration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : undefined;
            const qualityScore = calculateQualityScore(
              historyResult.moves,
              gameState.status,
              gameState.game_mode,
              gameState.ai_difficulty,
              gameState.player_stone
            );
            const record: GameRecord = {
              id: Date.now().toString(),
              date: formatDate(new Date()),
              gameMode: gameState.game_mode,
              ruleSet: gameState.rule_set,
              result: gameState.status,
              playerStone: gameState.game_mode === 'PvAI' ? gameState.player_stone : undefined,
              aiDifficulty: gameState.game_mode === 'PvAI' ? gameState.ai_difficulty : undefined,
              moves: historyResult.moves,
              moveCount: gameState.move_count,
              qualityScore,
              duration,
            };
            saveGameRecord(record);
            gameRecordSavedRef.current = true;
          } catch (e) {
            console.error('Failed to save game record:', e);
          }
        };
        saveRecord();
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
  }, [gameState, playPlaceSound, playWinSound, playLoseSound, gameStartTime]);

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
        await fetchGameState();
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
  }, [gameState, aivaiConfig, aivaiPaused, fetchGameState]);

  // 落子后自动刷新分析
  useEffect(() => {
    if (showAnalysis && gameState && gameState.move_count > 0 && !isAnalyzing) {
      const doAnalysis = async () => {
        setIsAnalyzing(true);
        try {
          const result = await api.analyzePosition();
          setAnalysisResult(result);
        } catch (e) {
          console.error('Analysis error:', e);
        } finally {
          setIsAnalyzing(false);
        }
      };
      doAnalysis();
    }
  }, [gameState?.move_count, showAnalysis]);

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
    setShowAnalysis(false);
    setAnalysisResult(null);
    prevMoveCountRef.current = 0;
    prevStatusRef.current = 'Playing';
    setGameStartTime(Date.now());
    gameRecordSavedRef.current = false;
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
      setShowAnalysis(false);
      setAnalysisResult(null);
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
      setShowAnalysis(false);
      setAnalysisResult(null);
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

  // 分析功能
  const handleAnalysis = useCallback(async () => {
    if (showAnalysis) {
      // 如果已打开，执行刷新分析
      setIsAnalyzing(true);
      try {
        const result = await api.analyzePosition();
        setAnalysisResult(result);
      } catch (e) {
        console.error('Analysis error:', e);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // 首次打开，执行分析
      setShowAnalysis(true);
      setIsAnalyzing(true);
      try {
        const result = await api.analyzePosition();
        setAnalysisResult(result);
      } catch (e) {
        console.error('Analysis error:', e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [showAnalysis]);

  const handleAnalysisClose = useCallback(() => {
    setShowAnalysis(false);
  }, []);

  // 复盘功能
  const handleReplay = useCallback(async () => {
    try {
      const result = await api.getMoveHistory();
      setReplayMoves(result.moves);
      setReplayStep(result.moves.length);
      setShowReplay(true);
    } catch (e) {
      console.error('Failed to get move history:', e);
    }
  }, []);

  const handleReplayStepChange = useCallback((step: number) => {
    setReplayStep(step);
  }, []);

  const handleReplayClose = useCallback(() => {
    setShowReplay(false);
    setReplayMoves([]);
    setReplayStep(0);
  }, []);

  // 从历史记录复盘
  const handleHistoryReplay = useCallback((record: GameRecord) => {
    setReplayMoves(record.moves);
    setReplayStep(record.moves.length);
    setShowReplay(true);
    setShowHistory(false);
  }, []);

  const handleShowHistory = useCallback(() => {
    setShowHistory(true);
  }, []);

  const handleHistoryBack = useCallback(() => {
    setShowHistory(false);
  }, []);

  const getReplayBoard = useCallback((step: number): (Stone | null)[][] => {
    const board: (Stone | null)[][] = Array(15).fill(null).map(() => Array(15).fill(null));
    for (let i = 0; i < step && i < replayMoves.length; i++) {
      const move = replayMoves[i];
      board[move.position.row][move.position.col] = move.stone;
    }
    return board;
  }, [replayMoves]);

  const getReplayLastMove = useCallback((step: number): Position | null => {
    if (step === 0 || replayMoves.length === 0) return null;
    return replayMoves[step - 1].position;
  }, [replayMoves]);

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
        showHistoryBtn={showModeSelector && !showHistory && !showPuzzleMode}
        onShowHistory={handleShowHistory}
      />

      {error && <div className="error">{error}</div>}

      {showPuzzleMode ? (
        <PuzzleMode onBack={handlePuzzleBack} />
      ) : showHistory ? (
        <GameHistory onBack={handleHistoryBack} onReplay={handleHistoryReplay} />
      ) : showReplay ? (
        <div className="game-layout replay-layout">
          <div className="game-main replay-main">
            <Board
              board={getReplayBoard(replayStep)}
              lastMove={getReplayLastMove(replayStep)}
              winningPositions={null}
              hintPosition={null}
              onCellClick={() => {}}
              disabled={true}
            />
          </div>
          <ReplayPanel
            moves={replayMoves.map(m => ({
              position: m.position,
              stone: m.stone,
              moveNumber: m.move_number,
            }))}
            currentStep={replayStep}
            onStepChange={handleReplayStepChange}
            onClose={handleReplayClose}
          />
        </div>
      ) : showModeSelector ? (
        <div className="mode-selector-wrapper">
          <GameModeSelector onStartGame={handleStartGame} />
        </div>
      ) : (
        <div className="game-layout">
          <div className="game-main">
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
              board={showReplay ? getReplayBoard(replayStep) : gameState.board}
              lastMove={showReplay ? getReplayLastMove(replayStep) : gameState.last_move}
              winningPositions={showReplay ? null : gameState.winning_positions}
              hintPosition={showReplay ? null : hintPosition}
              onCellClick={handleCellClick}
              disabled={isLoading || gameState.status !== 'Playing' || isAIvAI || showReplay}
            />
            <ControlPanel
              gameState={gameState}
              isLoading={isLoading}
              isGettingHint={isGettingHint}
              isAnalyzing={isAnalyzing}
              onNewGame={handleNewGameClick}
              onUndo={handleUndo}
              onGetHint={handleGetHint}
              onSurrender={handleSurrenderClick}
              onAnalysis={handleAnalysis}
              onReplay={handleReplay}
            />
          </div>
          <AnalysisPanel
            isOpen={showAnalysis}
            isLoading={isAnalyzing}
            analysis={analysisResult}
            onClose={handleAnalysisClose}
          />
          {showReplay && (
            <ReplayPanel
              moves={replayMoves.map(m => ({
                position: m.position,
                stone: m.stone,
                moveNumber: m.move_number,
              }))}
              currentStep={replayStep}
              onStepChange={handleReplayStepChange}
              onClose={handleReplayClose}
            />
          )}
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
