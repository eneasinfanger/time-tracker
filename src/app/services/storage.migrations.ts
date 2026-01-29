import { Settings } from '../utils/models';

export interface SettingsMigration {
  run: (settings: Settings) => void;
}

function makeJiraMigration(key: string, label: string, url: string): SettingsMigration {
  return {
    run: settings => {
      const oldSettings = settings as Settings & { [key: string]: string[] };
      if (oldSettings[key]) {
        settings.jiraSources = settings.jiraSources || [];
        settings.jiraSources.push({ name: label, url, projects: oldSettings[key] });
        delete oldSettings[key];
      }
    },
  };
}

export const settingsMigrations: SettingsMigration[] = [
  makeJiraMigration('loepaProjects', 'Loepa', 'https://jira.loewenfels.ch/jira/browse'),
  makeJiraMigration('svanetProjects', 'Svanet', 'https://jira.svanet.ch/browse'),
];
