import { useState } from 'react';
import { analyzePosition } from '../../api/gameApi';
import type { AnalysisResult } from '../../types/game';
import './AnalysisPanel.css';

interface AnalysisPanelProps {
  disabled: boolean;
}

export function AnalysisPanel({ disabled }: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const result = await analyzePosition();
      setAnalysis(result);
      setShowPanel(true);
    } catch (e) {
      console.error('Analysis error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  const getEvaluationClass = (evaluation: string) => {
    if (evaluation.includes('优')) return 'advantage';
    if (evaluation.includes('劣')) return 'disadvantage';
    return 'even';
  };

  const getScoreClass = (score: number) => {
    if (score > 200) return 'positive';
    if (score < -200) return 'negative';
    return 'neutral';
  };

  if (!showPanel) {
    return (
      <button
        className="analysis-btn"
        onClick={handleAnalyze}
        disabled={disabled || isLoading}
      >
        {isLoading ? '分析中...' : 'AI 局面分析'}
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="analysis-panel">
        <div className="analysis-loading">分析中...</div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="analysis-panel">
      <div className="analysis-header">
        <span className="analysis-title">AI 局面分析</span>
        <button className="analysis-close" onClick={handleClose}>
          ×
        </button>
      </div>

      <div className="analysis-score">
        <span className={`score-value ${getScoreClass(analysis.board_score)}`}>
          {analysis.board_score > 0 ? '+' : ''}{analysis.board_score}
        </span>
        <span className={`evaluation-badge ${getEvaluationClass(analysis.evaluation)}`}>
          {analysis.evaluation}
        </span>
      </div>

      <div className="analysis-section">
        <div className="section-title">推荐走法</div>
        <div className="top-moves">
          {analysis.top_moves.map((move, index) => (
            <div key={`${move.position.row}-${move.position.col}`} className="move-item">
              <span className={`move-rank rank-${index + 1}`}>{index + 1}</span>
              <span className="move-coord">{move.coord}</span>
              <span className="move-score">评分: {move.score}</span>
            </div>
          ))}
        </div>
      </div>

      {analysis.threat_points.length > 0 && (
        <div className="analysis-section">
          <div className="section-title">关键点位</div>
          <div className="threat-list">
            {analysis.threat_points.slice(0, 8).map((point, index) => (
              <span
                key={`${point.position.row}-${point.position.col}-${index}`}
                className={`threat-item ${point.threat_type} level-${point.level}`}
              >
                {String.fromCharCode(65 + point.position.col)}
                {15 - point.position.row}
                {point.threat_type === 'threat' ? ' ⚠' : ' ★'}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        className="analysis-btn"
        onClick={handleAnalyze}
        disabled={disabled || isLoading}
      >
        刷新分析
      </button>
    </div>
  );
}
