import { useState } from 'react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import './Settings.css';

interface SettingsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const THEME_LABELS: Record<Theme, string> = {
  classic: '🎨',
  dark: '🌙',
  green: '🌿',
};

export function Settings({ soundEnabled, onToggleSound }: SettingsProps) {
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
      <button
        className={`settings-btn sound-btn ${soundEnabled ? 'on' : 'off'}`}
        onClick={onToggleSound}
        title={soundEnabled ? '关闭音效' : '开启音效'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      <div className="theme-selector">
        <button
          className="settings-btn theme-btn"
          onClick={handleThemeClick}
          title="切换主题"
        >
          {THEME_LABELS[theme]}
        </button>
        {showThemeMenu && (
          <div className="theme-menu">
            <button onClick={() => handleThemeSelect('classic')}>🎨 经典</button>
            <button onClick={() => handleThemeSelect('dark')}>🌙 深色</button>
            <button onClick={() => handleThemeSelect('green')}>🌿 护眼</button>
          </div>
        )}
      </div>
    </div>
  );
}
