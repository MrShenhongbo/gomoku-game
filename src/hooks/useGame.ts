import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/gameApi';
import type {
  AIDifficulty,
  GameMode,
  GameSnapshot,
  Position,
  RuleSet,
  Stone,
} from '../types/game';

export function useGame() {
  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [hintPosition, setHintPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aiMoveInProgress = useRef(false);

  const fetchGameState = useCallback(async () => {
    try {
      const state = await api.getGameState();
      setGameState(state);
      return state;
    } catch (e) {
      setError(String(e));
      return null;
    }
  }, []);

  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const triggerAIMove = useCallback(async () => {
    // 防止重复触发
    if (aiMoveInProgress.current) return;
    aiMoveInProgress.current = true;

    setIsAIThinking(true);
    setError(null);

    try {
      const result = await api.aiMove();
      if (result.error) {
        setError(result.error);
      } else {
        await fetchGameState();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsAIThinking(false);
      aiMoveInProgress.current = false;
    }
  }, [fetchGameState]);

  const startNewGame = useCallback(
    async (mode: GameMode, difficulty?: AIDifficulty, playerStone?: Stone, ruleSet?: RuleSet) => {
      setIsLoading(true);
      setError(null);
      aiMoveInProgress.current = false;

      try {
        const state = await api.newGame(mode, difficulty, playerStone, ruleSet);
        setGameState(state);

        // 如果是人机模式且 AI 先手，触发 AI 落子
        if (mode === 'PvAI' && playerStone === 'White') {
          // 使用 requestAnimationFrame 确保 UI 先更新
          requestAnimationFrame(() => {
            setTimeout(() => triggerAIMove(), 100);
          });
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    },
    [triggerAIMove]
  );

  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!gameState || gameState.status !== 'Playing' || isLoading || isAIThinking) {
        return;
      }

      // 检查是否轮到玩家
      if (
        gameState.game_mode === 'PvAI' &&
        gameState.current_player !== gameState.player_stone
      ) {
        return;
      }

      // 检查位置是否已有棋子
      if (gameState.board[row][col] !== null) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setHintPosition(null); // 清除建议标记

      try {
        const result = await api.makeMove(row, col);

        if (result.success) {
          // 立即获取并更新游戏状态，让玩家看到自己的落子
          const newState = await fetchGameState();

          // 如果游戏继续且是人机模式，触发 AI
          if (!result.game_over && newState?.game_mode === 'PvAI') {
            // 先结束 loading 状态，让 UI 响应
            setIsLoading(false);
            // 使用 requestAnimationFrame 确保 UI 先渲染
            requestAnimationFrame(() => {
              setTimeout(() => triggerAIMove(), 50);
            });
            return; // 提前返回，不要在 finally 中再次设置 isLoading
          }
        }
      } catch (e) {
        setError(String(e));
      } finally {
        setIsLoading(false);
      }
    },
    [gameState, isLoading, isAIThinking, fetchGameState, triggerAIMove]
  );

  const handleUndo = useCallback(async () => {
    if (!gameState || isLoading || isAIThinking) return;

    setIsLoading(true);
    setError(null);
    setHintPosition(null); // 清除建议标记

    try {
      const state = await api.undoMove();
      setGameState(state);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading, isAIThinking]);

  const handleGetHint = useCallback(async () => {
    if (!gameState || isLoading || isAIThinking || isGettingHint) return;
    if (gameState.status !== 'Playing') return;

    setIsGettingHint(true);
    setError(null);

    try {
      const result = await api.getHint();
      setHintPosition(result.position);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsGettingHint(false);
    }
  }, [gameState, isLoading, isAIThinking, isGettingHint]);

  const clearHint = useCallback(() => {
    setHintPosition(null);
  }, []);

  const handleSurrender = useCallback(async () => {
    if (!gameState || isLoading || isAIThinking) return;
    if (gameState.status !== 'Playing') return;

    setIsLoading(true);
    setError(null);
    setHintPosition(null);

    try {
      const state = await api.surrender();
      setGameState(state);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, [gameState, isLoading, isAIThinking]);

  return {
    gameState,
    isLoading: isLoading,
    isAIThinking,
    isGettingHint,
    hintPosition,
    error,
    startNewGame,
    handleCellClick,
    handleUndo,
    handleGetHint,
    handleSurrender,
    clearHint,
  };
}
