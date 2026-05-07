import { ChangeDetectionStrategy, Component, Injector, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteComponent } from './site/site.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  static appInjector: Injector;
  protected readonly themeService = inject(ThemeService);

  constructor(injector: Injector) {
    AppComponent.appInjector = injector;
  }
}

export const appInjector = () => AppComponent.appInjector;
