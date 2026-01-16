import { useCallback } from 'react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import type { ExportData, Move } from '../types/game';
import * as api from '../api/gameApi';

interface UseGameExportReturn {
  exportGame: () => Promise<void>;
  importGame: () => Promise<Move[] | null>;
}

export function useGameExport(): UseGameExportReturn {
  // 导出棋谱
  const exportGame = useCallback(async () => {
    try {
      const data = await api.exportGame();
      const filePath = await save({
        filters: [{ name: '棋谱文件', extensions: ['json'] }],
        defaultPath: `gomoku_${new Date().toISOString().slice(0, 10)}.json`,
      });
      if (filePath) {
        await writeTextFile(filePath, JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error('Failed to export game:', e);
    }
  }, []);

  // 导入棋谱，返回走法列表供复盘使用
  const importGame = useCallback(async (): Promise<Move[] | null> => {
    try {
      const filePath = await open({
        filters: [{ name: '棋谱文件', extensions: ['json'] }],
        multiple: false,
      });
      if (filePath) {
        const content = await readTextFile(filePath as string);
        const data: ExportData = JSON.parse(content);
        // 验证数据格式
        if (!data.moves || !Array.isArray(data.moves)) {
          alert('无效的棋谱文件');
          return null;
        }
        return data.moves;
      }
    } catch (e) {
      console.error('Failed to import game:', e);
    }
    return null;
  }, []);

  return {
    exportGame,
    importGame,
  };
}
