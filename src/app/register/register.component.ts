import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { IconComponent } from '../icon/icon.component';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (!value) {
    return null;
  }

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumeric = /[0-9]/.test(value);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
  const isLengthValid = value.length >= 8;

  const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && isLengthValid;

  if (!passwordValid) {
    return { passwordStrength: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IconComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
    confirmPassword: ['', Validators.required],
  }, {
    validators: this.passwordMatchValidator
  });

  protected readonly isLoading = this.authService.isLoading;
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  private passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    
    if (password && confirmPassword && password !== confirmPassword) {
      form.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    const { username, email, fullName, password } = this.registerForm.value;
    this.authService.register(username, email, password, fullName).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.errorMessage.set(
          error.error?.error || 'Registration failed. Please try again.'
        );
      },
    });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update(show => !show);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update(show => !show);
  }

  protected getPasswordType(isConfirm: boolean = false): string {
    const showPwd = isConfirm ? this.showConfirmPassword() : this.showPassword();
    return showPwd ? 'text' : 'password';
  }

  protected getPasswordStrengthStatus(): { level: 'weak' | 'medium' | 'strong'; color: string } {
    const password = this.registerForm.get('password')?.value;
    if (!password) return { level: 'weak', color: 'gray' };

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumeric = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const strength = [hasUpperCase, hasLowerCase, hasNumeric, hasSpecialChar].filter(Boolean).length;

    if (strength <= 2) return { level: 'weak', color: 'red' };
    if (strength <= 3) return { level: 'medium', color: 'yellow' };
    return { level: 'strong', color: 'green' };
  }
}
