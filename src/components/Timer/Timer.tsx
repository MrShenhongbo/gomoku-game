import { useEffect, useRef, useState } from 'react';
import './Timer.css';

export type TimerMode = 'none' | 'perMove' | 'total';

interface TimerProps {
  mode: TimerMode;
  seconds: number; // 每步秒数或总秒数
  currentPlayer: 'Black' | 'White';
  isPlaying: boolean;
  onTimeout: () => void;
}

export function Timer({ mode, seconds, currentPlayer, isPlaying, onTimeout }: TimerProps) {
  const [blackTime, setBlackTime] = useState(mode === 'total' ? seconds : seconds);
  const [whiteTime, setWhiteTime] = useState(mode === 'total' ? seconds : seconds);
  const [currentMoveTime, setCurrentMoveTime] = useState(mode === 'perMove' ? seconds : 0);
  const intervalRef = useRef<number | null>(null);
  const hasTimedOutRef = useRef(false);
  // 使用 ref 存储回调，避免 onTimeout 变化导致 interval 重置
  const onTimeoutRef = useRef(onTimeout);

  // 同步 onTimeout ref
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // 重置计时器
  useEffect(() => {
    if (mode === 'total') {
      setBlackTime(seconds);
      setWhiteTime(seconds);
    } else if (mode === 'perMove') {
      setCurrentMoveTime(seconds);
    }
    hasTimedOutRef.current = false;
  }, [mode, seconds]);

  // 每步计时模式：切换玩家时重置
  useEffect(() => {
    if (mode === 'perMove' && isPlaying) {
      setCurrentMoveTime(seconds);
    }
  }, [currentPlayer, mode, seconds, isPlaying]);

  // 计时逻辑
  useEffect(() => {
    if (mode === 'none' || !isPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      if (mode === 'perMove') {
        setCurrentMoveTime((prev) => {
          if (prev <= 1 && !hasTimedOutRef.current) {
            hasTimedOutRef.current = true;
            onTimeoutRef.current();
            return 0;
          }
          return Math.max(0, prev - 1);
        });
      } else if (mode === 'total') {
        if (currentPlayer === 'Black') {
          setBlackTime((prev) => {
            if (prev <= 1 && !hasTimedOutRef.current) {
              hasTimedOutRef.current = true;
              onTimeoutRef.current();
              return 0;
            }
            return Math.max(0, prev - 1);
          });
        } else {
          setWhiteTime((prev) => {
            if (prev <= 1 && !hasTimedOutRef.current) {
              hasTimedOutRef.current = true;
              onTimeoutRef.current();
              return 0;
            }
            return Math.max(0, prev - 1);
          });
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [mode, isPlaying, currentPlayer]);

  if (mode === 'none') {
    return null;
  }

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const isLowTime = (time: number): boolean => time <= 10;

  if (mode === 'perMove') {
    return (
      <div className="timer timer-per-move">
        <div className={`time-display ${isLowTime(currentMoveTime) ? 'low-time' : ''}`}>
          {formatTime(currentMoveTime)}
        </div>
      </div>
    );
  }

  return (
    <div className="timer timer-total">
      <div className={`player-time ${currentPlayer === 'Black' ? 'active' : ''}`}>
        <span className="player-indicator black" />
        <span className={`time-display ${isLowTime(blackTime) ? 'low-time' : ''}`}>
          {formatTime(blackTime)}
        </span>
      </div>
      <div className={`player-time ${currentPlayer === 'White' ? 'active' : ''}`}>
        <span className="player-indicator white" />
        <span className={`time-display ${isLowTime(whiteTime) ? 'low-time' : ''}`}>
          {formatTime(whiteTime)}
        </span>
      </div>
    </div>
  );
}
