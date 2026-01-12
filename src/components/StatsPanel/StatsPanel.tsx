import { useEffect, useState } from 'react';
import './StatsPanel.css';

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

interface StatsPanelProps {
  onClose: () => void;
}

const STATS_KEY = 'gomoku-stats';

export function loadStats(): Stats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
}

export function saveStats(stats: Stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordGameResult(result: 'win' | 'loss' | 'draw') {
  const stats = loadStats();
  stats.totalGames += 1;
  if (result === 'win') stats.wins += 1;
  else if (result === 'loss') stats.losses += 1;
  else stats.draws += 1;
  stats.winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  saveStats(stats);
}

export function StatsPanel({ onClose }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats>(loadStats());

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const handleReset = () => {
    const emptyStats = { totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 };
    saveStats(emptyStats);
    setStats(emptyStats);
  };

  return (
    <div className="stats-panel-overlay" onClick={onClose}>
      <div className="stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="stats-header">
          <h3>游戏统计</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="stats-content">
          <div className="stat-item">
            <span className="stat-label">总对局</span>
            <span className="stat-value">{stats.totalGames}</span>
          </div>
          <div className="stat-item win">
            <span className="stat-label">胜利</span>
            <span className="stat-value">{stats.wins}</span>
          </div>
          <div className="stat-item loss">
            <span className="stat-label">失败</span>
            <span className="stat-value">{stats.losses}</span>
          </div>
          <div className="stat-item draw">
            <span className="stat-label">平局</span>
            <span className="stat-value">{stats.draws}</span>
          </div>
          <div className="stat-item rate">
            <span className="stat-label">胜率</span>
            <span className="stat-value">{stats.winRate}%</span>
          </div>
        </div>

        <button className="reset-btn" onClick={handleReset}>
          重置统计
        </button>
      </div>
    </div>
  );
}
