import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBaseUrl } from './api-base-url';

export interface AdminStats {
  date: string;
  user_stats: Array<{
    user_id: number;
    username: string;
    total_activities: number;
    completed_activities: number;
    total_minutes: number;
  }>;
  total_users_active: number;
  total_activities: number;
  total_minutes: number;
}

export interface AllActivitiesResponse {
  activities: AdminActivity[];
  total: number;
  pages: number;
  current_page: number;
}

export interface AdminActivity {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  task_name: string;
  description: string | null;
  category: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${getApiBaseUrl()}/activities`;

  getAllActivities(page: number = 1, perPage: number = 50, userId?: number): Observable<AllActivitiesResponse> {
    let url = `${this.apiUrl}/admin/all-activities?page=${page}&per_page=${perPage}`;
    if (userId) {
      url += `&user_id=${userId}`;
    }
    return this.http.get<AllActivitiesResponse>(url);
  }

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.apiUrl}/admin/stats`);
  }

  getAggregated(period: 'day' | 'week' | 'month', date?: string) {
    let url = `${this.apiUrl}/admin/aggregate?period=${period}`;
    if (date) {
      url += `&date=${date}`;
    }
    return this.http.get<{ period: string; anchor: string; data: Array<{ label: string; total_minutes: number }> }>(url);
  }
}
