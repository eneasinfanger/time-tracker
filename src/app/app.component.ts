import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { SiteComponent } from './site/site.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [SiteComponent, RouterOutlet],
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
