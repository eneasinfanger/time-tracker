export interface Debouncer {
  debounce(fn: (...args: any) => void, waitMs?: number): (...args: any) => void;

  run(fn: (...args: any) => void, args?: any[], waitMs?: number): void;

  cancel(): void;
}

export class SharedDebouncer implements Debouncer {
  private timeout?: number;

  public debounce(fn: (...args: any) => void, waitMs: number = 300): (...args: any) => void {
    return (...args) => {
      window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => fn(...args), waitMs);
    };
  }

  public run(fn: (...args: any) => void, args: any[] = [], waitMs: number = 300): void {
    this.debounce(fn, waitMs)(...args);
  }

  public cancel() {
    window.clearTimeout(this.timeout);
  }
}

export function debounce(fn: EventListener, waitMs: number = 300): EventListener {
  let t: any;
  return (e) => {
    window.clearTimeout(t);
    t = window.setTimeout(() => fn(e), waitMs);
  };
}

export function dispatchEvents(target: EventTarget, ...events: (Event | string)[]) {
  events.forEach(event => {
    target.dispatchEvent(typeof event === 'string' ? new Event(event) : event);
  });
}
