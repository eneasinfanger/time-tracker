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
    this.loadThemeFromSettings();
    this.setupThemeEffect();
    this.setupSettingsSync();
  }

  private resolveTheme(theme: 'light' | 'dark' | 'system'): Theme {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  private loadThemeFromSettings(): void {
    this.syncingFromSettings = true;
    this.themeSignal.set(this.resolveTheme(SettingsHolder.getSettings().theme));
    this.syncingFromSettings = false;
  }

  private setupSettingsSync(): void {
    SettingsHolder.onSettingsChange(settings => {
      const resolvedTheme = this.resolveTheme(settings.theme);

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
