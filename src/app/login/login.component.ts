import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly isLoading = this.authService.isLoading;
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly isTransitioning = signal(false);

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.isTransitioning.set(true);
        window.setTimeout(() => {
          this.router.navigate(['/']);
        }, 700);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.error || 'Login failed. Please try again.'
        );
      },
    });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  protected getPasswordType(): string {
    return this.showPassword() ? 'text' : 'password';
  }
}
