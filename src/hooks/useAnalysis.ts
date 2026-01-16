import { useCallback, useEffect, useState, useRef } from 'react';
import type { AnalysisResult } from '../types/game';
import * as api from '../api/gameApi';

interface UseAnalysisReturn {
  showAnalysis: boolean;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
  openAnalysis: () => Promise<void>;
  refreshAnalysis: () => Promise<void>;
  closeAnalysis: () => void;
  resetAnalysis: () => void;
}

export function useAnalysis(moveCount: number): UseAnalysisReturn {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // 追踪上一次的 moveCount，用于判断是否需要自动刷新
  const prevMoveCountRef = useRef(moveCount);

  // 执行分析
  const doAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const result = await api.analyzePosition();
      setAnalysisResult(result);
    } catch (e) {
      console.error('Analysis error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // 打开分析面板
  const openAnalysis = useCallback(async () => {
    setShowAnalysis(true);
    await doAnalysis();
  }, [doAnalysis]);

  // 刷新分析
  const refreshAnalysis = useCallback(async () => {
    await doAnalysis();
  }, [doAnalysis]);

  // 关闭分析面板
  const closeAnalysis = useCallback(() => {
    setShowAnalysis(false);
  }, []);

  // 重置分析状态（开始新游戏时调用）
  const resetAnalysis = useCallback(() => {
    setShowAnalysis(false);
    setAnalysisResult(null);
  }, []);

  // 落子后自动刷新分析（只在 moveCount 真正变化时触发）
  useEffect(() => {
    if (showAnalysis && moveCount > 0 && moveCount !== prevMoveCountRef.current) {
      prevMoveCountRef.current = moveCount;
      doAnalysis();
    }
  }, [moveCount, showAnalysis, doAnalysis]);

  return {
    showAnalysis,
    isAnalyzing,
    analysisResult,
    openAnalysis,
    refreshAnalysis,
    closeAnalysis,
    resetAnalysis,
  };
}
