import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-start-page',
  templateUrl: './start-page.component.html',
  styleUrls: ['./start-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StartPageComponent {
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);

  async signInWithGoogle() {
    this.loading.set(true);
    try {
      await this.auth.loginWithGoogle();
    } catch (err: unknown) {
      console.error('Google sign-in failed:', err);
    } finally {
      this.loading.set(false);
    }
  }
}
