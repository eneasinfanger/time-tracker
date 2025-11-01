import { effect, Signal, signal, WritableSignal } from '@angular/core';
import { appInjector } from '../app.component';

export const wrapInSignal: <T>(item: T) => WritableSignal<T> = item => signal(item);

export const unwrapSignal: <T>(item: Signal<T>) => T = item => item();

export interface SignalPropInitializer<T> {
  set<P extends keyof T>(signal: WritableSignal<T[P]>, prop: P): SignalPropInitializer<T>;
}

export function initUsing<T>(source: WritableSignal<T>): SignalPropInitializer<T> {
  return {
    set<P extends keyof T>(signal: WritableSignal<T[P]>, prop: P): SignalPropInitializer<T> {
      signal.set(source()[prop]);
      effect(() => {
        console.log(`effect from ${ signal() }`);
        source.update(s => ({ ...s, [prop]: signal() }));
      }, { injector: appInjector() });
      return this;
    },
  };
}
