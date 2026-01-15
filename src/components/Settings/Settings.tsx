import { useState } from 'react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import './Settings.css';

interface SettingsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  showHistoryBtn?: boolean;
  onShowHistory?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  canExport?: boolean;
}

const THEME_LABELS: Record<Theme, string> = {
  classic: '☀️',
  dark: '🌙',
};

export function Settings({ soundEnabled, onToggleSound, showHistoryBtn, onShowHistory, onExport, onImport, canExport }: SettingsProps) {
  const { theme, setTheme } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleThemeClick = () => {
    setShowThemeMenu(!showThemeMenu);
  };

  const handleThemeSelect = (newTheme: Theme) => {
    setTheme(newTheme);
    setShowThemeMenu(false);
  };

  return (
    <div className="settings">
      {showHistoryBtn && onShowHistory && (
        <button
          className="settings-btn history-btn"
          onClick={onShowHistory}
          title="对局记录"
          aria-label="对局记录"
        >
          📋
        </button>
      )}
      {onImport && (
        <button
          className="settings-btn import-btn"
          onClick={onImport}
          title="导入棋谱"
          aria-label="导入棋谱"
        >
          📥
        </button>
      )}
      {onExport && (
        <button
          className="settings-btn export-btn"
          onClick={onExport}
          disabled={!canExport}
          title="导出棋谱"
          aria-label="导出棋谱"
        >
          📤
        </button>
      )}
      <button
        className={`settings-btn sound-btn ${soundEnabled ? 'on' : 'off'}`}
        onClick={onToggleSound}
        title={soundEnabled ? '关闭音效' : '开启音效'}
        aria-label={soundEnabled ? '关闭音效' : '开启音效'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      <div className="theme-selector">
        <button
          className="settings-btn theme-btn"
          onClick={handleThemeClick}
          title="切换主题"
          aria-label="切换主题"
          aria-expanded={showThemeMenu}
        >
          {THEME_LABELS[theme]}
        </button>
        {showThemeMenu && (
          <div className="theme-menu" role="menu">
            <button onClick={() => handleThemeSelect('classic')} role="menuitem">☀️ 亮色</button>
            <button onClick={() => handleThemeSelect('dark')} role="menuitem">🌙 深色</button>
          </div>
        )}
      </div>
    </div>
  );
}
