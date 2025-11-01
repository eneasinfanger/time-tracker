import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, InjectionToken, model, output } from '@angular/core';

export const HOST_ELEMENT = new InjectionToken<ElementRef<Element>>('HOST_ELEMENT');

@Component({
  selector: 'suggestion-dropdown',
  imports: [],
  templateUrl: './suggestion-dropdown.component.html',
  styleUrls: ['./suggestion-dropdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.left.px]': 'left',
    '[style.top.px]': 'top',
    '[style.min-width.px]': 'minWidth',
  },
})
export class SuggestionDropdownComponent {
  readonly hostElement = inject(HOST_ELEMENT);
  readonly thisElement = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly items = model<string[]>([]);
  readonly select = output<string | null>();

  selectItem(item: string) {
    this.select.emit(item);
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(e: MouseEvent) {
    const thisElement = this.thisElement.nativeElement;
    if (!thisElement.contains(e.target as Node) && e.target !== thisElement) {
      this.select.emit(null);
    }
  }

  private getHostRect() {
    return this.hostElement.nativeElement.getBoundingClientRect();
  }

  get left(): number {
    return this.getHostRect().left + window.scrollX;
  }

  get top(): number {
    return this.getHostRect().bottom + window.scrollY;
  }

  get minWidth(): number {
    return this.getHostRect().width;
  }
}
