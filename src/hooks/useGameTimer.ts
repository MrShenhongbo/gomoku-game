import { useCallback, useState } from 'react';
import type { TimerConfig } from '../components/GameModeSelector/GameModeSelector';

interface UseGameTimerReturn {
  timerConfig: TimerConfig;
  timerKey: number;
  setTimerConfig: (config: TimerConfig) => void;
  resetTimer: () => void;
}

export function useGameTimer(): UseGameTimerReturn {
  const [timerConfig, setTimerConfigState] = useState<TimerConfig>({ mode: 'none', seconds: 30 });
  const [timerKey, setTimerKey] = useState(0);

  // 设置计时器配置
  const setTimerConfig = useCallback((config: TimerConfig) => {
    setTimerConfigState(config);
    setTimerKey((k) => k + 1);
  }, []);

  // 重置计时器（强制重新渲染 Timer 组件）
  const resetTimer = useCallback(() => {
    setTimerKey((k) => k + 1);
  }, []);

  return {
    timerConfig,
    timerKey,
    setTimerConfig,
    resetTimer,
  };
}
