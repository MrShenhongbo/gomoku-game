import { useCallback, useState } from 'react';
import type { Move, Position, Stone, GameRecord } from '../types/game';
import * as api from '../api/gameApi';

interface UseReplayReturn {
  showReplay: boolean;
  replayMoves: Move[];
  replayStep: number;
  startReplay: () => Promise<void>;
  startReplayFromMoves: (moves: Move[]) => void;
  startReplayFromRecord: (record: GameRecord) => void;
  closeReplay: () => void;
  setReplayStep: (step: number) => void;
  getReplayBoard: (step: number) => (Stone | null)[][];
  getReplayLastMove: (step: number) => Position | null;
}

export function useReplay(): UseReplayReturn {
  const [showReplay, setShowReplay] = useState(false);
  const [replayMoves, setReplayMoves] = useState<Move[]>([]);
  const [replayStep, setReplayStep] = useState(0);

  // 从当前对局开始复盘
  const startReplay = useCallback(async () => {
    try {
      const result = await api.getMoveHistory();
      setReplayMoves(result.moves);
      setReplayStep(result.moves.length);
      setShowReplay(true);
    } catch (e) {
      console.error('Failed to get move history:', e);
    }
  }, []);

  // 从指定走法列表开始复盘（用于导入棋谱）
  const startReplayFromMoves = useCallback((moves: Move[]) => {
    setReplayMoves(moves);
    setReplayStep(moves.length);
    setShowReplay(true);
  }, []);

  // 从历史记录开始复盘
  const startReplayFromRecord = useCallback((record: GameRecord) => {
    setReplayMoves(record.moves);
    setReplayStep(record.moves.length);
    setShowReplay(true);
  }, []);

  // 关闭复盘
  const closeReplay = useCallback(() => {
    setShowReplay(false);
    setReplayMoves([]);
    setReplayStep(0);
  }, []);

  // 根据步数生成复盘棋盘
  const getReplayBoard = useCallback(
    (step: number): (Stone | null)[][] => {
      const board: (Stone | null)[][] = Array(15)
        .fill(null)
        .map(() => Array(15).fill(null));
      for (let i = 0; i < step && i < replayMoves.length; i++) {
        const move = replayMoves[i];
        board[move.position.row][move.position.col] = move.stone;
      }
      return board;
    },
    [replayMoves]
  );

  // 获取复盘当前步的最后落子
  const getReplayLastMove = useCallback(
    (step: number): Position | null => {
      if (step === 0 || replayMoves.length === 0) return null;
      return replayMoves[step - 1].position;
    },
    [replayMoves]
  );

  return {
    showReplay,
    replayMoves,
    replayStep,
    startReplay,
    startReplayFromMoves,
    startReplayFromRecord,
    closeReplay,
    setReplayStep,
    getReplayBoard,
    getReplayLastMove,
  };
}
