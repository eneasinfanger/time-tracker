import { computed, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import { env } from '../../environments/env';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${env.apiBaseUrl}/auth`;

  // Signals
  private currentUserSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);
  private isLoadingSignal = signal(false);

  // Computed
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.is_admin ?? false);
  readonly isLoading = computed(() => this.isLoadingSignal());

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('current_user');

    if (token && user) {
      this.tokenSignal.set(token);
      this.currentUserSignal.set(JSON.parse(user));
    }
  }

  private saveToStorage(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
  }

  private clearStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  register(username: string, email: string, password: string, fullName?: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
      username,
      email,
      password,
      full_name: fullName
    }).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false))
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
      username,
      password
    }).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false))
    );
  }

  logout(): void {
    this.clearStorage();
  }

  verifyToken(token: string): Observable<{ valid: boolean; user: User }> {
    return this.http.post<{ valid: boolean; user: User }>(`${this.apiUrl}/verify-token`, { token });
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh-token`, { token }).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      })
    );
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
