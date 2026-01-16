import { useCallback, useRef, useState } from 'react';
import type { GameRecord, GameSnapshot } from '../types/game';
import { saveGameRecord, calculateQualityScore, formatDate } from '../utils/gameHistory';
import * as api from '../api/gameApi';

interface UseGameRecordReturn {
  showHistory: boolean;
  gameStartTime: number | null;
  openHistory: () => void;
  closeHistory: () => void;
  startRecording: () => void;
  saveRecord: (gameState: GameSnapshot) => Promise<void>;
  isRecordSaved: () => boolean;
}

export function useGameRecord(): UseGameRecordReturn {
  const [showHistory, setShowHistory] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const gameRecordSavedRef = useRef(false);

  // 打开对局记录页面
  const openHistory = useCallback(() => {
    setShowHistory(true);
  }, []);

  // 关闭对局记录页面
  const closeHistory = useCallback(() => {
    setShowHistory(false);
  }, []);

  // 开始记录（新游戏开始时调用）
  const startRecording = useCallback(() => {
    setGameStartTime(Date.now());
    gameRecordSavedRef.current = false;
  }, []);

  // 保存对局记录
  const saveRecord = useCallback(
    async (gameState: GameSnapshot) => {
      if (gameRecordSavedRef.current || gameState.move_count === 0) {
        return;
      }

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
    },
    [gameStartTime]
  );

  // 检查当前对局是否已保存
  const isRecordSaved = useCallback(() => {
    return gameRecordSavedRef.current;
  }, []);

  return {
    showHistory,
    gameStartTime,
    openHistory,
    closeHistory,
    startRecording,
    saveRecord,
    isRecordSaved,
  };
}
