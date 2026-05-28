import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { UserService, UserProfile } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPanelComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  protected readonly users = this.userService.users;
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly selectedUser = signal<UserProfile | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly perPage = signal(10);

  protected readonly editForm = this.fb.group({
    full_name: [''],
    email: [''],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  protected loadUsers(): void {
    this.isLoading.set(true);
    this.userService.listUsers(this.currentPage(), this.perPage()).subscribe({
      next: () => {
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load users');
      },
    });
  }

  protected selectUser(user: UserProfile): void {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      full_name: user.full_name,
      email: user.email,
    });
  }

  protected updateUser(): void {
    if (!this.selectedUser() || this.editForm.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.userService.updateUser(this.selectedUser()!.id, this.editForm.value as Partial<UserProfile>).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('User updated successfully');
        this.selectedUser.set(response.user);
        this.loadUsers();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to update user');
      },
    });
  }

  protected disableUser(userId: number): void {
    if (!confirm('Disable this user?')) return;
    
    this.isLoading.set(true);
    this.userService.disableUser(userId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('User disabled');
        this.loadUsers();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to disable user');
      },
    });
  }

  protected enableUser(userId: number): void {
    this.isLoading.set(true);
    this.userService.enableUser(userId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('User enabled');
        this.loadUsers();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to enable user');
      },
    });
  }

  protected promoteUser(userId: number): void {
    this.isLoading.set(true);
    this.userService.promoteUser(userId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('User promoted to admin');
        this.loadUsers();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to promote user');
      },
    });
  }

  protected demoteUser(userId: number): void {
    this.isLoading.set(true);
    this.userService.demoteUser(userId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('User demoted from admin');
        this.loadUsers();
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to demote user');
      },
    });
  }

  protected closeModal(): void {
    this.selectedUser.set(null);
    this.editForm.reset();
  }

  protected isCurrentUser(userId: number): boolean {
    return this.authService.currentUser()?.id === userId;
  }
}
