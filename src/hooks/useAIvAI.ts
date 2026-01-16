import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameSnapshot } from '../types/game';
import type { AIvAIConfig } from '../components/GameModeSelector/GameModeSelector';
import * as api from '../api/gameApi';

interface UseAIvAIReturn {
  aivaiConfig: AIvAIConfig | null;
  aivaiPaused: boolean;
  startAIvAI: (config: AIvAIConfig) => void;
  stopAIvAI: () => void;
  togglePause: () => void;
}

export function useAIvAI(
  gameState: GameSnapshot | null,
  fetchGameState: () => Promise<unknown>
): UseAIvAIReturn {
  const [aivaiConfig, setAivaiConfig] = useState<AIvAIConfig | null>(null);
  const [aivaiPaused, setAivaiPaused] = useState(false);
  const aivaiIntervalRef = useRef<number | null>(null);

  // 开始 AIvAI 模式
  const startAIvAI = useCallback((config: AIvAIConfig) => {
    setAivaiConfig(config);
    setAivaiPaused(false);
  }, []);

  // 停止 AIvAI 模式
  const stopAIvAI = useCallback(() => {
    setAivaiConfig(null);
    setAivaiPaused(false);
    if (aivaiIntervalRef.current) {
      clearTimeout(aivaiIntervalRef.current);
      aivaiIntervalRef.current = null;
    }
  }, []);

  // 切换暂停/继续
  const togglePause = useCallback(() => {
    setAivaiPaused((p) => !p);
  }, []);

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

  return {
    aivaiConfig,
    aivaiPaused,
    startAIvAI,
    stopAIvAI,
    togglePause,
  };
}
