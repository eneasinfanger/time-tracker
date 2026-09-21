import { ApplicationRef, createComponent, ElementRef, EnvironmentInjector, inject, Injectable, Injector } from '@angular/core';
import { HOST_ELEMENT, SuggestionDropdownComponent } from '../suggestion-dropdown/suggestion-dropdown.component';
import { SelectableSuggestion } from '../utils/models';

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
  private appRef = inject(ApplicationRef);
  private envInj = inject(EnvironmentInjector);
  private currentCompRef: any = null;

  openDropdown<D>(host: ElementRef<HTMLInputElement>, suggestions: SelectableSuggestion<D>[], onSelect: (s: SelectableSuggestion<D>) => void) {
    this.closeDropdown();

    const options: Parameters<typeof createComponent>[1] = {
      environmentInjector: this.envInj,
      elementInjector: Injector.create({
        providers: [{ provide: HOST_ELEMENT, useValue: host }],
      }),
    };
    const comp = createComponent(SuggestionDropdownComponent<D>, options);
    comp.instance.items.set(suggestions);
    comp.instance.select.subscribe(s => {
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
