import { Settings } from './models';

let settings: Settings;

export const SettingsHolder = {
  getSettings: () => settings,
  setSettings: (newSettings: Settings) => settings = newSettings,
};
