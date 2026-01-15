import { useState, useEffect, useCallback } from 'react';
import { Board } from '../Board/Board';
import { getPuzzleList, getPuzzle, checkPuzzleMove } from '../../api/gameApi';
import type { Puzzle, PuzzleListItem, Stone, Position } from '../../types/game';
import { BOARD_SIZE } from '../../types/game';
import './PuzzleMode.css';

// 难度标签映射
const getDifficultyLabel = (difficulty: string): string => {
  const labels: Record<string, string> = {
    'Easy': '简单',
    'Medium': '中等',
    'Hard': '困难',
    'Expert': '专家',
    'Master': '大师'
  };
  return labels[difficulty] || difficulty;
};

interface PuzzleModeProps {
  onBack: () => void;
}

export function PuzzleMode({ onBack }: PuzzleModeProps) {
  const [puzzleList, setPuzzleList] = useState<PuzzleListItem[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [board, setBoard] = useState<(Stone | null)[][]>([]);
  const [playerMoves, setPlayerMoves] = useState<[number, number][]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  // 使用 useState 缓存已完成的残局，避免每次渲染都读取 localStorage
  const [completedPuzzles, setCompletedPuzzles] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('completedPuzzles') || '[]');
    } catch {
      return [];
    }
  });

  // 加载残局列表
  useEffect(() => {
    getPuzzleList().then(setPuzzleList);
  }, []);

  // 初始化棋盘
  const initBoard = useCallback((puzzle: Puzzle) => {
    const newBoard: (Stone | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(null)
    );
    for (const [row, col, stone] of puzzle.initial_stones) {
      newBoard[row][col] = stone as Stone;
    }
    setBoard(newBoard);
    setPlayerMoves([]);
    setMessage(null);
    setShowHint(false);
    setCompleted(false);
    setLastMove(null);
  }, []);

  // 选择残局
  const selectPuzzle = async (id: number) => {
    const puzzle = await getPuzzle(id);
    if (puzzle) {
      setCurrentPuzzle(puzzle);
      initBoard(puzzle);
    }
  };

  // 落子
  const handleCellClick = async (row: number, col: number) => {
    if (!currentPuzzle || completed) return;
    if (board[row][col] !== null) return;

    // 放置棋子
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = currentPuzzle.player_stone as Stone;
    setBoard(newBoard);
    setLastMove({ row, col });

    const newMoves: [number, number][] = [...playerMoves, [row, col]];
    setPlayerMoves(newMoves);

    // 检查走法
    const result = await checkPuzzleMove(currentPuzzle.id, newMoves);
    if (result.complete) {
      setMessage({ text: result.message, type: 'success' });
      setCompleted(true);
      // 更新本地完成记录
      if (!completedPuzzles.includes(currentPuzzle.id)) {
        const newCompletedPuzzles = [...completedPuzzles, currentPuzzle.id];
        setCompletedPuzzles(newCompletedPuzzles);
        localStorage.setItem('completedPuzzles', JSON.stringify(newCompletedPuzzles));
      }
    } else if (result.correct) {
      setMessage({ text: result.message, type: 'info' });
    } else {
      setMessage({ text: result.message, type: 'error' });
      // 错误走法，撤销
      setTimeout(() => {
        const revertBoard = board.map(r => [...r]);
        setBoard(revertBoard);
        setPlayerMoves(playerMoves);
        setLastMove(playerMoves.length > 0 ? { row: playerMoves[playerMoves.length - 1][0], col: playerMoves[playerMoves.length - 1][1] } : null);
        setMessage(null);
      }, 1000);
    }
  };

  // 重置当前残局
  const resetPuzzle = () => {
    if (currentPuzzle) {
      initBoard(currentPuzzle);
    }
  };

  // 返回列表
  const backToList = () => {
    setCurrentPuzzle(null);
  };

  // 下一题
  const nextPuzzle = () => {
    if (!currentPuzzle) return;
    const currentIndex = puzzleList.findIndex(p => p.id === currentPuzzle.id);
    if (currentIndex < puzzleList.length - 1) {
      selectPuzzle(puzzleList[currentIndex + 1].id);
    }
  };

  if (!currentPuzzle) {
    // 显示残局列表
    return (
      <div className="puzzle-mode">
        <div className="puzzle-header">
          <span className="puzzle-title">残局练习</span>
          <button className="puzzle-back-btn" onClick={onBack}>
            返回
          </button>
        </div>
        <div className="puzzle-list">
          {puzzleList.map((puzzle) => (
            <div
              key={puzzle.id}
              className="puzzle-item"
              onClick={() => selectPuzzle(puzzle.id)}
            >
              <div className="puzzle-item-info">
                <span className="puzzle-item-name">
                  {completedPuzzles.includes(puzzle.id) ? '✓ ' : ''}
                  {puzzle.name}
                </span>
                <span className="puzzle-item-desc">{puzzle.description}</span>
              </div>
              <span className={`puzzle-difficulty ${puzzle.difficulty}`}>
                {getDifficultyLabel(puzzle.difficulty)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 显示残局游戏
  return (
    <div className="puzzle-mode">
      <div className="puzzle-header">
        <span className="puzzle-title">{currentPuzzle.name}</span>
        <button className="puzzle-back-btn" onClick={backToList}>
          返回列表
        </button>
      </div>

      <div className="puzzle-info">
        <div className="puzzle-info-header">
          <span className="puzzle-info-name">{currentPuzzle.description}</span>
          <span className={`puzzle-difficulty ${currentPuzzle.difficulty}`}>
            {getDifficultyLabel(currentPuzzle.difficulty)}
          </span>
        </div>
        <span className="puzzle-player">
          执子：{currentPuzzle.player_stone === 'Black' ? '黑棋 ●' : '白棋 ○'}
        </span>
      </div>

      {message && (
        <div className={`puzzle-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {showHint && !completed && (
        <div className="puzzle-hint">
          提示：{currentPuzzle.hint}
        </div>
      )}

      {completed ? (
        <div className="puzzle-completed">
          <span className="puzzle-completed-icon">🎉</span>
          <span className="puzzle-completed-text">恭喜完成！</span>
          <div className="puzzle-controls">
            <button className="puzzle-btn secondary" onClick={resetPuzzle}>
              再来一次
            </button>
            {puzzleList.findIndex(p => p.id === currentPuzzle.id) < puzzleList.length - 1 && (
              <button className="puzzle-btn primary" onClick={nextPuzzle}>
                下一题
              </button>
            )}
            <button className="puzzle-btn warning" onClick={backToList}>
              返回列表
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="puzzle-board-wrapper">
            <Board
              board={board}
              lastMove={lastMove}
              winningPositions={null}
              hintPosition={null}
              onCellClick={handleCellClick}
              disabled={false}
            />
          </div>

          <div className="puzzle-controls">
            <button className="puzzle-btn secondary" onClick={resetPuzzle}>
              重置
            </button>
            <button
              className="puzzle-btn warning"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? '隐藏提示' : '显示提示'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
