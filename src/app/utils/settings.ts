import { Settings } from './models';
import { Subject, Subscription } from 'rxjs';

const defaultSettings: Settings = {
  alwaysShownActivities: [],
  durationThreshold: { weeks: 1, days: 0, hours: 0, minutes: 0 },
  enableTasks: true,
  theme: 'system',
  issueTrackerSources: [],
};

let currentSettings: Settings = defaultSettings;
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
  getDefaultSettings: () => ({ ...defaultSettings }),
};
