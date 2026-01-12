import './Settings.css';

interface SettingsProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Settings({ soundEnabled, onToggleSound }: SettingsProps) {
  return (
    <div className="settings">
      <button
        className={`settings-btn sound-btn ${soundEnabled ? 'on' : 'off'}`}
        onClick={onToggleSound}
        title={soundEnabled ? '关闭音效' : '开启音效'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
    </div>
  );
}
