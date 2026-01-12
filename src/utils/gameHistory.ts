import type { GameRecord, Move, GameStatus, GameMode, AIDifficulty } from '../types/game';

const STORAGE_KEY = 'gomoku-game-history';
const MAX_RECORDS = 50;

export function loadGameHistory(): GameRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveGameRecord(record: GameRecord): void {
  const history = loadGameHistory();
  history.unshift(record);
  if (history.length > MAX_RECORDS) {
    history.pop();
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function deleteGameRecord(id: string): void {
  const history = loadGameHistory();
  const filtered = history.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function calculateQualityScore(
  moves: Move[],
  result: GameStatus,
  gameMode: GameMode,
  aiDifficulty?: AIDifficulty,
  playerStone?: string
): number {
  let score = 50;

  // 步数因素：20-60步为最佳区间
  const moveCount = moves.length;
  if (moveCount >= 20 && moveCount <= 60) {
    score += 15;
  } else if (moveCount >= 10 && moveCount <= 80) {
    score += 8;
  } else if (moveCount < 10) {
    score -= 10;
  }

  // 结果因素
  if (gameMode === 'PvAI') {
    const isWin = (playerStone === 'Black' && result === 'BlackWin') ||
                  (playerStone === 'White' && result === 'WhiteWin');
    const isLoss = (playerStone === 'Black' && result === 'WhiteWin') ||
                   (playerStone === 'White' && result === 'BlackWin');
    if (isWin) {
      score += 20;
    } else if (result === 'Draw') {
      score += 10;
    } else if (isLoss) {
      score += 0;
    }
  } else {
    // PvP 或 AIvAI
    if (result !== 'Playing') {
      score += 15;
    }
  }

  // 难度因素 (PvAI)
  if (gameMode === 'PvAI' && aiDifficulty) {
    if (aiDifficulty === 'Hard') {
      score += 10;
    } else if (aiDifficulty === 'Medium') {
      score += 5;
    }
  }

  return Math.min(100, Math.max(0, score));
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getResultText(result: GameStatus, gameMode: GameMode, playerStone?: string): string {
  if (result === 'Draw') return '平局';
  if (result === 'Playing') return '进行中';

  if (gameMode === 'PvAI') {
    const isWin = (playerStone === 'Black' && result === 'BlackWin') ||
                  (playerStone === 'White' && result === 'WhiteWin');
    return isWin ? '胜利' : '失败';
  }

  return result === 'BlackWin' ? '黑胜' : '白胜';
}

export function getModeText(mode: GameMode): string {
  switch (mode) {
    case 'PvP': return '双人对战';
    case 'PvAI': return '人机对战';
    case 'AIvAI': return 'AI对战';
  }
}
