import { Settings } from './models';
import { Subject, Subscription } from "rxjs";

let currentSettings: Settings;
const settingsChange = new Subject<Settings>();

export const SettingsHolder = {
  getSettings: () => currentSettings,
  setSettings: (newSettings: Settings) => {
    currentSettings = newSettings;
    settingsChange.next(newSettings);
  },
  onSettingsChange(callback: (settings: Settings) => void): Subscription {
    return settingsChange.subscribe(callback);
  },
  getDefaultSettings: () => ({
    alwaysShownActivities: [],
    durationThreshold: { weeks: 1, days: 0, hours: 0, minutes: 0 },
    enableTasks: true,
    theme: 'system',
    loepaProjects: ['LOEPA', 'LAB', 'SYS', 'ENG', 'TECH', 'TC'],
    svanetProjects: ['TB', 'LADEV', 'TT', 'AKB', 'ARTAG', 'TRB'],
  } as Settings),
};
