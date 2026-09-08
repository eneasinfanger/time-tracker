import { Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';
import { GridNavContainerDirective } from './grid-nav-container.directive';

@Directive({
  selector: 'input[grid-nav-cell],button[grid-nav-cell]',
  host: {
    '(keydown)': 'onKeyDown($event)',
    '(blur)': 'lastTimeDirection = `left`',
  }
})
export class GridNavCellDirective implements OnInit, OnDestroy {
  public readonly elementRef = inject<ElementRef<HTMLInputElement|HTMLButtonElement>>(ElementRef);
  private readonly container = inject(GridNavContainerDirective, { optional: true })
  protected lastTimeDirection: 'left' | 'right' = 'left';

  ngOnInit() {
    this.container?.registerCell(this);
  }

  ngOnDestroy() {
    this.container?.unregisterCell(this);
  }

  onKeyDown(event: KeyboardEvent) {
    if (!this.container) return;

    const direction = keyMap[event.key];
    if (!direction) return;

    const input = this.elementRef.nativeElement;

    if ((direction === 'left' || direction === 'right') && !this.canNavigateHorizontal(input, direction)) {
      return;
    }

    event.preventDefault();
    this.container.navigate(this, direction);
  }

  private canNavigateHorizontal(input: HTMLInputElement | HTMLButtonElement, direction: 'left' | 'right'): boolean {
    if (input instanceof HTMLButtonElement) {
      return true;
    }
    if (input.type === 'time') {
      if (this.lastTimeDirection !== direction) {
        this.lastTimeDirection = direction;
        return false;
      }
      return true;
    }
    if (input.selectionStart === null || input.selectionEnd === null) {
      return true;
    }
    if (input.selectionStart !== input.selectionEnd) {
      return false;
    }
    if (direction === 'left') {
      return input.selectionStart === 0;
    }
    if (direction === 'right') {
      return input.selectionStart === input.value.length;
    }
    return false;
  }

  focus() {
    this.elementRef.nativeElement.focus();
    if (this.elementRef.nativeElement instanceof HTMLInputElement) {
      this.elementRef.nativeElement.select?.();
    }
  }
}

const keyMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

