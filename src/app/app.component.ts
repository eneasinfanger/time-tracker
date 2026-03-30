import { ChangeDetectionStrategy, Component, Injector, inject, signal } from '@angular/core';
import { SiteComponent } from './site/site.component';
import { StartPageComponent } from './start-page/start-page.component';
import { AuthService } from './services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [SiteComponent, StartPageComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  static appInjector: Injector;

  private readonly auth = inject(AuthService);
  readonly isLoggedIn = signal<boolean>(this.auth.isLoggedIn());
  readonly isAuthorized = signal<boolean>(true);

  constructor(injector: Injector) {
    AppComponent.appInjector = injector;
    this.auth.authStateChange.subscribe(user => {
      const loggedIn = !!user;
      this.isLoggedIn.set(loggedIn);
      this.isAuthorized.set(true);
    });

    this.auth.accessDenied.subscribe(denied => {
      if (denied) {
        this.isAuthorized.set(false);
      }
    });
  }

  logout() {
    void this.auth.logout();
  }
}

export const appInjector = () => AppComponent.appInjector;
