import { ApplicationRef, createComponent, ElementRef, EnvironmentInjector, inject, Injectable, Injector } from '@angular/core';
import { StorageService } from './storage.service';
import { Activity, FormattedDate } from '../utils/models';
import { HOST_ELEMENT, SuggestionDropdownComponent } from '../suggestion-dropdown/suggestion-dropdown.component';
import { formatDate } from '../utils/dates';

type Listener = { element: HTMLElement, type: string, handler: EventListenerOrEventListenerObject };

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private storage = inject(StorageService);
  private appRef = inject(ApplicationRef);
  private envInj = inject(EnvironmentInjector);
  private currentCompRef: any = null;

  private listeners = new Map<HTMLElement, Listener[]>();

  /**
   * Return unique activity descriptions from the last week (or filtered by input).
   */
  getActivitySuggestions(input: string, currentDateIso: FormattedDate): string[] {
    const lastWeek = new Date(currentDateIso);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const all: Activity[] = this.storage.getPastActivities(formatDate(lastWeek), currentDateIso) || [];
    const unique = [...new Set(all
      .filter(a => a.type === 'activity' && a.description)
      .map(a => a.description),
    )];

    if (!input) return unique;
    return unique.filter(d => d.toLowerCase().includes(input.toLowerCase()));
  }

  /**
   * Return last end time for the provided date as an array (to match original API)
   */
  getTimeSuggestions(currentDateIso: string): string[] {
    const end = this.storage.getLastEndTime(currentDateIso as unknown as any);
    return end ? [end] : [];
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
      if (s !== null) { onSelect(s); }
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
