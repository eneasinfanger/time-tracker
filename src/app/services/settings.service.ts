import { inject, Injectable } from '@angular/core';
import { Observable, Observer, Subject, Subscription } from 'rxjs';
import { Settings } from "../utils/models";
import { settingsMigrations } from "./storage.migrations";
import { SyncService } from "./sync.service";

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly syncService = inject(SyncService);
  private readonly settingsChange = new Subject<Settings>();
  private currentSettings: Settings = this.getDefaultSettings();

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    let settings = await this.syncService.getSettings();
    const fullSettings = this.getDefaultSettings();
    if (!settings) {
      settings = fullSettings;
    } else {
      const filtered = Object.fromEntries(
        Object.entries(settings).filter(([, v]) => v !== undefined)
      ) as Partial<Settings>;
      settings = { ...fullSettings, ...filtered };
    }
    for (const migration of settingsMigrations) {
      migration.run(settings);
    }
    await this.setSettings(settings);
  }

  private getDefaultSettings(): Settings {
    return {
      alwaysShownActivities: [],
      durationThreshold: { weeks: 1, days: 0, hours: 0, minutes: 0 },
      enableTasks: true,
      theme: 'system',
      jiraSources: [],
    };
  }

  getSettings(): Settings {
    return this.currentSettings;
  }

  async setSettings(newSettings: Settings): Promise<void> {
    await this.syncService.saveSettings(this.currentSettings);
    this.currentSettings = newSettings;
    this.settingsChange.next(newSettings);
  }

  onSettingsChange(callback: ((s: Settings) => void) | Partial<Observer<Settings>>): Subscription {
    return this.settingsChange.subscribe(callback);
  }
}
