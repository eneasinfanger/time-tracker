import { Injectable, inject, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { StorageService } from './storage.service';
import { Activity } from '../models';
import { SuggestionDropdownComponent } from '../suggestion-dropdown/suggestion-dropdown.component';

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
  getActivitySuggestions(input: string, currentDateIso: string): string[] {
    const lastWeek = new Date(currentDateIso);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const from = lastWeek.toISOString().split('T')[0] as unknown as any;
    const to = currentDateIso as unknown as any;

    const all: Activity[] = this.storage.getPastActivities(from, to) || [];
    const unique = [...new Set(all
      .filter(a => a.type === 'activity' && a.description)
      .map(a => a.description)
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

  openDropdown(host: HTMLElement, items: string[], onSelect: (s: string) => void) {
    this.closeDropdown();

    const comp = createComponent(SuggestionDropdownComponent, { environmentInjector: this.envInj });
    comp.instance.items = items || [];
    comp.instance.select.subscribe((s: string) => {
      onSelect(s);
      this.closeDropdown();
    });

    this.currentCompRef = comp;

    // attach to body
    this.appRef.attachView(comp.hostView);
    const domEl = (comp.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domEl);

    // position it under the host
    const rect = host.getBoundingClientRect();
    domEl.style.position = 'absolute';
    domEl.style.left = `${rect.left + window.scrollX}px`;
    domEl.style.top = `${rect.bottom + window.scrollY}px`;
    domEl.style.minWidth = `${rect.width}px`;

    const onDocClick = (e: MouseEvent) => {
      if (!domEl.contains(e.target as Node) && e.target !== host) {
        this.closeDropdown();
      }
    };

    setTimeout(() => document.addEventListener('click', onDocClick));
    comp.onDestroy(() => document.removeEventListener('click', onDocClick));
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

  /**
   * Attach suggestion behavior to an input element.
   * suggestionProvider: (value) => string[]
   * getDateIso: () => string
   */
  attachSuggestionsToInput(input: HTMLInputElement, suggestionProvider: (value: string, dateIso: string) => string[], getDateIso: () => string) {
    const handler = (e: Event) => {
      this.closeDropdown();
      const value = (e.target as HTMLInputElement).value;
      const dateIso = getDateIso();
      const items = suggestionProvider(value, dateIso);
      if (items && items.length > 0) {
        this.openDropdown(input, items, (s) => {
          input.value = s;
          input.dispatchEvent(new Event('input'));
          input.dispatchEvent(new Event('change'));
        });
      }
    };

    const debounced = this.debounce(handler, 300);
    input.addEventListener('input', debounced);
    input.addEventListener('focus', debounced);

    const list = this.listeners.get(input) || [];
    list.push({ element: input, type: 'input', handler: debounced });
    list.push({ element: input, type: 'focus', handler: debounced });
    this.listeners.set(input, list);
  }

  detachSuggestionsFromInput(input: HTMLInputElement) {
    const list = this.listeners.get(input) || [];
    list.forEach(l => input.removeEventListener(l.type, l.handler));
    this.listeners.delete(input);
  }

  private debounce(fn: EventListener, wait = 300) {
    let t: any;
    return (e: Event) => {
      clearTimeout(t);
      t = setTimeout(() => fn(e), wait);
    };
  }
}
