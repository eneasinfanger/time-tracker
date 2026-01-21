import { Settings } from './models';

let settings: Settings;

export const SettingsHolder = {
  getSettings: () => settings,
  setSettings: (newSettings: Settings) => settings = newSettings,
  getDefaultSettings: () => ({
    alwaysShownActivities: [],
    durationThreshold: { weeks: 1, days: 0, hours: 0, minutes: 0 },
    enableTasks: true,
    theme: 'system',
    loepaProjects: ['LOEPA', 'LAB', 'SYS', 'ENG', 'TECH', 'TC'],
    svanetProjects: ['TB', 'LADEV', 'TT', 'AKB', 'ARTAG', 'TRB'],
  } satisfies Settings),
};
