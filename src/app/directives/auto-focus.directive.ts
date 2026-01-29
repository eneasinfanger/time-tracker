import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[dynamicAutoFocus]'
})
export class AutoFocusDirective implements AfterViewInit {
  private readonly host = inject(ElementRef);

  ngAfterViewInit(): void {
    this.host.nativeElement?.focus();
  }
}
