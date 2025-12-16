import { ApplicationRef, createComponent, ElementRef, EnvironmentInjector, inject, Injectable, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { Activity, ActivityDetails, ActivityType, FormattedDate } from '../utils/models';
import { HOST_ELEMENT, SuggestionDropdownComponent } from '../suggestion-dropdown/suggestion-dropdown.component';
import { SettingsHolder } from '../utils/settings';

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private storage = inject(StorageService);
  private appRef = inject(ApplicationRef);
  private envInj = inject(EnvironmentInjector);
  private currentCompRef: any = null;

  getActivitySuggestions(input: string, currentDateIso: FormattedDate, type: ActivityType): string[] {
    return this.processPastActivities(input, currentDateIso, a => a.type === type, a => a.description, type === 'activity');
  }

  getTaskSuggestions(input: string, currentDateIso: FormattedDate): string[] {
    return this.processPastActivities(input, currentDateIso, a => a.type === 'activity', a => a.task, true);
  }

  private processPastActivities(input: string, currentDateIso: FormattedDate, filter: (a: Activity) => boolean, getter: (a: ActivityDetails) => string, includeSettings: boolean): string[] {
    const unique = [...new Set(this.storage.getPastActivities(currentDateIso)
      .filter(a => filter(a) && getter(a))
      .concat(...SettingsHolder.getSettings().alwaysShownActivities.filter(getter) as Activity[])
      .map(getter),
    )];

    if (!input) return unique;
    return unique.filter(d => d.toLowerCase().includes(input.toLowerCase()));
  }

  getStartSuggestions(currentDateIso: FormattedDate, compareFunction: (a: Activity) => boolean): string[] {
    const activities = this.storage.getSortedActivitiesForDate(currentDateIso);
    const storageIndex = activities?.findIndex(compareFunction);
    const before = activities
      ?.slice(0, storageIndex)
      ?.filter(ac => ac.type == 'activity' && ac.endTime)
      ?.pop();
    return before ? [before.endTime] : [];
  }

  getEndSuggestions(currentDateIso: FormattedDate, compareFunction: (a: Activity) => boolean): string[] {
    const activities = this.storage.getSortedActivitiesForDate(currentDateIso);
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
