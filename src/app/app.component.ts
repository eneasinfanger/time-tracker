import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  static appInjector: Injector;

  constructor(injector: Injector) {
    AppComponent.appInjector = injector;
  }
}

export const appInjector = () => AppComponent.appInjector;
