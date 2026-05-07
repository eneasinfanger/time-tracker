import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeSignal = signal<Theme>('light');
  
  readonly theme = computed(() => this.themeSignal());
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  constructor() {
    this.loadThemeFromStorage();
    this.setupThemeEffect();
  }

  private loadThemeFromStorage(): void {
    const stored = localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = stored || (systemDark ? 'dark' : 'light');
    this.themeSignal.set(initialTheme);
  }

  private setupThemeEffect(): void {
    effect(() => {
      const theme = this.themeSignal();
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('theme', theme);
    });
  }

  toggleTheme(): void {
    this.themeSignal.update(current => current === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
  }
}
