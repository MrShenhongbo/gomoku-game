import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// 测试组件，用于访问 useTheme hook
function TestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('classic')}>Set Classic</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('ThemeProvider', () => {
    it('should provide default theme as classic', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme').textContent).toBe('classic');
    });

    it('should load theme from localStorage', () => {
      localStorage.setItem('gomoku-theme', 'dark');
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });

    it('should save theme to localStorage when changed', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      fireEvent.click(screen.getByText('Set Dark'));
      expect(localStorage.getItem('gomoku-theme')).toBe('dark');
    });

    it('should update data-theme attribute on document', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      expect(document.documentElement.getAttribute('data-theme')).toBe('classic');
      fireEvent.click(screen.getByText('Set Dark'));
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should allow switching themes', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      expect(screen.getByTestId('theme').textContent).toBe('classic');
      fireEvent.click(screen.getByText('Set Dark'));
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      fireEvent.click(screen.getByText('Set Classic'));
      expect(screen.getByTestId('theme').textContent).toBe('classic');
    });
  });

  describe('useTheme', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // 捕获 console.error 以避免测试输出噪音
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});
