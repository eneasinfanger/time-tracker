import { ApplicationRef, createComponent, ElementRef, EnvironmentInjector, inject, Injectable, Injector } from '@angular/core';
import { Activity, ActivityDetails, ActivityType, ISODate } from '../utils/models';
import { HOST_ELEMENT, SuggestionDropdownComponent } from '../suggestion-dropdown/suggestion-dropdown.component';
import { SyncService } from "./sync.service";
import { SettingsService } from "./settings.service";
import { subtractDuration } from "../utils/dates";

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private sync = inject(SyncService);
  private settings = inject(SettingsService);
  private appRef = inject(ApplicationRef);
  private envInj = inject(EnvironmentInjector);
  private currentCompRef: any = null;

  getActivitySuggestions(input: string, currentDateIso: ISODate, type: ActivityType): Promise<string[]> {
    return this.processPastActivities(input, currentDateIso, a => a.type === type, a => a.description, type === 'activity');
  }

  getActivitySuggestionsForTask(task: string, currentDateIso: ISODate): Promise<string[]> {
    const taskContains = this.textContainsOther(task);
    return this.processPastActivities('', currentDateIso, a => a.type === 'activity' && taskContains(a.task), a => a.description, true);
  }

  getTaskSuggestions(input: string, currentDateIso: ISODate): Promise<string[]> {
    return this.processPastActivities(input, currentDateIso, a => a.type === 'activity', a => a.task, true);
  }

  getTaskSuggestionsForDescription(desc: string, currentDateIso: ISODate): Promise<string[]> {
    const descContains = this.textContainsOther(desc);
    return this.processPastActivities('', currentDateIso, a => a.type === 'activity' && descContains(a.description), a => a.task, true);
  }

  private async processPastActivities(input: string, currentDateIso: ISODate, filter: (a: ActivityDetails & Partial<Activity>) => boolean, getter: (a: ActivityDetails) => string, includeSettings: boolean): Promise<string[]> {
    const fromDateISO = subtractDuration(currentDateIso, this.settings.getSettings().durationThreshold);
    const unique = [...new Set((await this.sync.getActivitiesBetween(fromDateISO, currentDateIso))
      .concat(...(!includeSettings ? [] : this.settings.getSettings().alwaysShownActivities.filter(getter) as Activity[]))
      .filter(a => filter(a) && getter(a))
      .map(getter),
    )];

    if (!input) return unique;
    return unique.filter(this.textContainsOther(input));
  }

  private textContainsOther(text: string): (other: string) => boolean {
    const textL = text.toLowerCase();
    return (other: string) => other.toLowerCase().includes(textL);
  }

  async getStartSuggestions(currentDateIso: ISODate, compareFunction: (a: Activity) => boolean): Promise<string[]> {
    const activities = await this.sync.getActivitiesForDay(currentDateIso);
    const storageIndex = activities?.findIndex(compareFunction);
    const before = activities
      ?.slice(0, storageIndex)
      ?.filter(ac => ac.type == 'activity' && ac.endTime)
      ?.pop();
    return before ? [before.endTime] : [];
  }

  async getEndSuggestions(currentDateIso: ISODate, compareFunction: (a: Activity) => boolean): Promise<string[]> {
    const activities = await this.sync.getActivitiesForDay(currentDateIso);
    const storageIndex = activities?.findIndex(compareFunction);
    if (!storageIndex) {
      return [];
    }
    const after = activities
      ?.slice(storageIndex + 1)
      ?.filter(ac => ac.type == 'activity' && ac.startTime)
      ?.shift();
    return after ? [after.startTime] : [];
  }

  openDropdown(host: ElementRef<HTMLInputElement>, suggestions: string[], onSelect: (s: string) => void) {
    this.closeDropdown();

    const options: Parameters<typeof createComponent>[1] = {
      environmentInjector: this.envInj,
      elementInjector: Injector.create({
        providers: [{ provide: HOST_ELEMENT, useValue: host }],
      }),
    };
    const comp = createComponent(SuggestionDropdownComponent, options);
    comp.instance.items.set(suggestions);
    comp.instance.select.subscribe((s: string | null) => {
      if (s !== null) {
        onSelect(s);
      }
      this.closeDropdown();
    });

    this.currentCompRef = comp;

    this.appRef.attachView(comp.hostView);
    const domEl = (comp.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domEl);
  }

  closeDropdown() {
    if (!this.currentCompRef) return;
    try {
      this.appRef.detachView(this.currentCompRef.hostView);
      this.currentCompRef.destroy();
    } catch (e) {
      // ignore
    }
    this.currentCompRef = null;
  }
}
