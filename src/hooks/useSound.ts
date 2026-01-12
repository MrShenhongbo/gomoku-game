import { useCallback, useRef, useState } from 'react';

// 使用 Web Audio API 生成简单音效
function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export function useSound() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('gomoku-sound-enabled');
    return saved !== 'false';
  });
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('gomoku-sound-enabled', String(newValue));
      return newValue;
    });
  }, []);

  // 落子音效 - 短促的敲击声
  const playPlaceSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    // 模拟棋子落下的声音
    playTone(ctx, 800, 0.08, 'sine', 0.4);
    setTimeout(() => playTone(ctx, 400, 0.05, 'sine', 0.2), 20);
  }, [soundEnabled, getAudioContext]);

  // 获胜音效 - 上升的和弦
  const playWinSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(ctx, freq, 0.3, 'sine', 0.3), i * 100);
    });
  }, [soundEnabled, getAudioContext]);

  // 失败音效 - 下降的音调
  const playLoseSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [392, 330, 262]; // G4, E4, C4
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(ctx, freq, 0.25, 'sine', 0.3), i * 150);
    });
  }, [soundEnabled, getAudioContext]);

  // 按钮点击音效
  const playClickSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    playTone(ctx, 600, 0.05, 'sine', 0.2);
  }, [soundEnabled, getAudioContext]);

  return {
    soundEnabled,
    toggleSound,
    playPlaceSound,
    playWinSound,
    playLoseSound,
    playClickSound,
  };
}
