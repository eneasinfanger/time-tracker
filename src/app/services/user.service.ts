import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getApiBaseUrl } from './api-base-url';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${getApiBaseUrl()}/users`;
  private readonly http = inject(HttpClient);
  
  private usersSignal = signal<UserProfile[]>([]);
  readonly users = computed(() => this.usersSignal());

  getUser(userId: number): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/${userId}`);
  }

  updateUser(userId: number, data: Partial<UserProfile>): Observable<{ message: string; user: UserProfile }> {
    return this.http.put<{ message: string; user: UserProfile }>(`${this.apiUrl}/${userId}`, data);
  }

  changePassword(userId: number, oldPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/change-password`, {
      old_password: oldPassword,
      new_password: newPassword
    });
  }

  listUsers(page = 1, perPage = 10): Observable<{ users: UserProfile[]; total: number; pages: number }> {
    const params = { page: page.toString(), per_page: perPage.toString() };
    return this.http.get<{ users: UserProfile[]; total: number; pages: number }>(`${this.apiUrl}`, {
      params
    }).pipe(
      tap(response => this.usersSignal.set(response.users))
    );
  }

  disableUser(userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/disable`, {});
  }

  enableUser(userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/enable`, {});
  }

  promoteUser(userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/promote`, {});
  }

  demoteUser(userId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/demote`, {});
  }
}
