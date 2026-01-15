import { useState, useRef, useEffect, useCallback } from 'react';
import type { Position, Stone } from '../../types/game';
import './ReplayPanel.css';

interface MoveRecord {
  position: Position;
  stone: Stone;
  moveNumber: number;
}

interface ReplayPanelProps {
  moves: MoveRecord[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

// 将位置转换为棋谱坐标（如 H8）
function positionToNotation(pos: Position): string {
  const col = String.fromCharCode(65 + pos.col); // A-O
  const row = 15 - pos.row; // 1-15
  return `${col}${row}`;
}

export function ReplayPanel({ moves, currentStep, onStepChange, onClose }: ReplayPanelProps) {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const stepRef = useRef(currentStep);

  // 同步 stepRef
  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  // 清理 interval
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsAutoPlaying(false);
  }, []);

  const handleFirst = () => onStepChange(0);
  const handlePrev = () => onStepChange(Math.max(0, currentStep - 1));
  const handleNext = () => onStepChange(Math.min(moves.length, currentStep + 1));
  const handleLast = () => onStepChange(moves.length);

  const handleAutoPlay = () => {
    if (isAutoPlaying) {
      stopAutoPlay();
      return;
    }

    setIsAutoPlaying(true);
    intervalRef.current = window.setInterval(() => {
      const nextStep = stepRef.current + 1;
      if (nextStep > moves.length) {
        stopAutoPlay();
        return;
      }
      onStepChange(nextStep);
    }, 800);
  };

  return (
    <div className="replay-panel">
      <div className="replay-header">
        <h4>对局复盘</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="replay-controls">
        <button onClick={handleFirst} disabled={currentStep === 0}>⏮</button>
        <button onClick={handlePrev} disabled={currentStep === 0}>◀</button>
        <button onClick={handleAutoPlay}>
          {isAutoPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={handleNext} disabled={currentStep >= moves.length}>▶</button>
        <button onClick={handleLast} disabled={currentStep >= moves.length}>⏭</button>
      </div>

      <div className="replay-progress">
        <span>{currentStep} / {moves.length}</span>
      </div>

      <div className="move-list">
        {moves.map((move, index) => (
          <div
            key={index}
            className={`move-item ${index < currentStep ? 'played' : ''} ${index === currentStep - 1 ? 'current' : ''}`}
            onClick={() => onStepChange(index + 1)}
          >
            <span className="move-number">{move.moveNumber}.</span>
            <span className={`move-stone ${move.stone.toLowerCase()}`} />
            <span className="move-pos">{positionToNotation(move.position)}</span>
          </div>
        ))}
      </div>

      <button className="replay-back-btn" onClick={onClose}>
        ← 退出复盘
      </button>
    </div>
  );
}
