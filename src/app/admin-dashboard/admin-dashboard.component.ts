import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../services/user.service';
import { AdminService, AdminStats, AdminActivity } from '../services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly adminService = inject(AdminService);

  readonly stats = signal<AdminStats | null>(null);
  readonly activities = signal<AdminActivity[]>([]);
  readonly loading = signal(true);
  readonly activitiesLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedTab = signal<'overview' | 'users' | 'activities'>('overview');
  readonly page = signal(1);
  readonly perPage = signal(50);

  readonly totalMinutesFormatted = computed(() => {
    const mins = this.stats()?.total_minutes ?? 0;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return `${hours}h ${remaining}m`;
  });

  ngOnInit(): void {
    this.loadStats();
    this.loadActivities();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getAdminStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load admin statistics');
        this.loading.set(false);
      }
    });
  }

  loadActivities(): void {
    this.activitiesLoading.set(true);
    this.adminService.getAllActivities(this.page(), this.perPage()).subscribe({
      next: (data) => {
        this.activities.set(data.activities);
        this.activitiesLoading.set(false);
      },
      error: () => {
        this.activitiesLoading.set(false);
        this.error.set('Failed to load activities');
      }
    });
  }

  selectTab(tab: 'overview' | 'users' | 'activities'): void {
    this.selectedTab.set(tab);
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    }
    return hours > 0 ? `${hours}h` : `${mins}m`;
  }
}
