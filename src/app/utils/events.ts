export interface Debouncer {
  debounce(fn: (...args: any) => void, waitMs?: number): (...args: any) => void;

  run(fn: (...args: any) => void, args?: any[], waitMs?: number): void;

  cancel(): void;
}

export class SharedDebouncer implements Debouncer {
  private timeout?: number;

  constructor(private readonly defaultDelayMs: number = 300) {}

  public debounce(fn: (...args: any) => void, waitMs?: number): (...args: any) => void {
    return (...args) => {
      window.clearTimeout(this.timeout);
      this.timeout = window.setTimeout(() => fn(...args), waitMs || this.defaultDelayMs);
    };
  }

  public run(fn: (...args: any) => void, args: any[] = [], waitMs?: number): void {
    this.debounce(fn, waitMs || this.defaultDelayMs)(...args);
  }

  public cancel() {
    window.clearTimeout(this.timeout);
    this.timeout = undefined;
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
