import { useState, useEffect } from 'react';
import type { GameRecord } from '../../types/game';
import {
  loadGameHistory,
  deleteGameRecord,
  clearGameHistory,
  getResultText,
  getModeText,
} from '../../utils/gameHistory';
import './GameHistory.css';

interface GameHistoryProps {
  onBack: () => void;
  onReplay: (record: GameRecord) => void;
}

export function GameHistory({ onBack, onReplay }: GameHistoryProps) {
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setRecords(loadGameHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteGameRecord(id);
    setRecords(loadGameHistory());
  };

  const handleClear = () => {
    clearGameHistory();
    setRecords([]);
    setShowClearConfirm(false);
  };

  const getScoreClass = (score: number): string => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-poor';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '一般';
    return '较差';
  };

  return (
    <div className="game-history">
      <div className="history-header">
        <button className="back-btn" onClick={onBack}>
          ← 返回首页
        </button>
        <h3>对局记录</h3>
        {records.length > 0 && (
          <button
            className="clear-btn"
            onClick={() => setShowClearConfirm(true)}
          >
            清空
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="empty-history">
          <p>暂无对局记录</p>
          <p className="hint">完成一局游戏后，记录将自动保存</p>
        </div>
      ) : (
        <div className="history-list">
          {records.map((record) => (
            <div key={record.id} className="history-item">
              <div className="item-main" onClick={() => onReplay(record)}>
                <div className="item-info">
                  <span className="item-date">{record.date}</span>
                  <span className="item-mode">{getModeText(record.gameMode)}</span>
                  {record.aiDifficulty && (
                    <span className="item-difficulty">
                      {record.aiDifficulty === 'Easy' ? '简单' : record.aiDifficulty === 'Medium' ? '中等' : '困难'}
                    </span>
                  )}
                </div>
                <div className="item-result">
                  <span className={`result-text ${record.result.toLowerCase()}`}>
                    {getResultText(record.result, record.gameMode, record.playerStone)}
                  </span>
                  <span className="item-moves">{record.moveCount}步</span>
                </div>
                <div className="item-score">
                  <span className={`score-value ${getScoreClass(record.qualityScore)}`}>
                    {record.qualityScore}
                  </span>
                  <span className="score-label">{getScoreLabel(record.qualityScore)}</span>
                </div>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(record.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {showClearConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h4>确认清空</h4>
            <p>确定要清空所有对局记录吗？此操作不可恢复。</p>
            <div className="confirm-buttons">
              <button className="confirm-btn" onClick={handleClear}>
                确定
              </button>
              <button
                className="cancel-btn"
                onClick={() => setShowClearConfirm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
