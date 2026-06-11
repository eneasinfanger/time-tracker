import { Injectable, signal, computed, effect } from '@angular/core';
import { SettingsHolder } from '../utils/settings';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly themeSignal = signal<Theme>('light');
  private syncingFromSettings = false;
  
  readonly theme = computed(() => this.themeSignal());
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  constructor() {
    this.loadThemeFromStorage();
    this.setupThemeEffect();
    this.setupSettingsSync();
  }

  private loadThemeFromStorage(): void {
    const stored = localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = stored || (systemDark ? 'dark' : 'light');
    this.themeSignal.set(initialTheme);
  }

  private setupSettingsSync(): void {
    const currentSettings = SettingsHolder.getSettings();
    if (currentSettings?.theme) {
      this.themeSignal.set(currentSettings.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : currentSettings.theme);
    }

    SettingsHolder.onSettingsChange(settings => {
      const resolvedTheme = settings.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;

      if (this.themeSignal() !== resolvedTheme) {
        this.syncingFromSettings = true;
        this.themeSignal.set(resolvedTheme);
        this.syncingFromSettings = false;
      }
    });
  }

  private setupThemeEffect(): void {
    effect(() => {
      const theme = this.themeSignal();
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);

      if (!this.syncingFromSettings) {
        const settings = SettingsHolder.getSettings();
        if (settings && settings.theme !== theme) {
          SettingsHolder.setSettings({ ...settings, theme });
        }
      }
    });
  }

  toggleTheme(): void {
    this.themeSignal.update(current => current === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
  }
}
