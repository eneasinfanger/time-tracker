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

const tokenKey = 'tt_auth_token';
const userKey = 'tt_current_user';

const oneHourInMs = 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${ env.apiBaseUrl }/auth`;

  // Signals
  private currentUserSignal = signal<User | null>(null);
  private tokenSignal = signal<string | null>(null);
  private isLoadingSignal = signal(false);
  private isInitializedSignal = signal(false);

  // Computed
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.is_admin ?? false);
  readonly isLoading = computed(() => this.isLoadingSignal());
  readonly isInitialized = computed(() => this.isInitializedSignal());

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
    this.checkTokenValidity();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem(tokenKey);
    const user = localStorage.getItem(userKey);

    if (token && user) {
      this.tokenSignal.set(token);
      this.currentUserSignal.set(JSON.parse(user));
    }
  }

  private checkTokenValidity() {
    const token = this.getToken();
    const expires = !token ? null : this.tryParseTokenExpiry(token);
    if (token === null || expires === null) {
      this.clearStorage();
      console.log("No token set.");
      this.isInitializedSignal.set(true);
    } else if (Date.now() > expires) {
      console.error('Token has expired.');
      this.clearStorage();
      this.isInitializedSignal.set(true);
    } else if (Date.now() + oneHourInMs > expires) {
      this.refreshToken(token).subscribe({
        next: () => this.isInitializedSignal.set(true),
        error: (e) => {
          console.error('Failed to refresh token:', e);
          this.clearStorage();
          this.isInitializedSignal.set(true);
        },
      });
    } else {
      this.verifyToken(token).subscribe({
        next: () => this.isInitializedSignal.set(true),
        error: (e) => {
          console.error('Token verification failed:', e);
          this.clearStorage();
          this.isInitializedSignal.set(true);
        },
      });
    }
  }

  private tryParseTokenExpiry(token: string): number | null {
    try {
      return JSON.parse(atob(token.split('.')[1])).exp * 1000;
    } catch (e) {
      console.error('Failed to parse token expiry:', e);
      return null;
    }
  }

  private saveToStorage(token: string, user: User): void {
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(userKey, JSON.stringify(user));
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
  }

  private clearStorage(): void {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  register(username: string, email: string, password: string, fullName?: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${ this.apiUrl }/register`, {
      username,
      email,
      password,
      full_name: fullName,
    }).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  login(username: string, password: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${ this.apiUrl }/login`, {
      username,
      password,
    }, this.getAuthSkipHeader()).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  logout(): void {
    this.clearStorage();
  }

  verifyToken(token: string): Observable<{ valid: boolean; user: User }> {
    this.isLoadingSignal.set(true);
    return this.http.post<{
      valid: boolean;
      user: User
    }>(`${ this.apiUrl }/verify-token`, { token }, this.getAuthSkipHeader()).pipe(
      tap(response => {
        if (!response.valid) {
          throw new Error('Token not valid.');
        }
        this.saveToStorage(token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  refreshToken(token: string): Observable<AuthResponse> {
    this.isLoadingSignal.set(true);
    return this.http.post<AuthResponse>(`${ this.apiUrl }/refresh-token`, { token }, this.getAuthSkipHeader()).pipe(
      tap(response => {
        this.saveToStorage(response.token, response.user);
      }),
      finalize(() => this.isLoadingSignal.set(false)),
    );
  }

  private getAuthSkipHeader(): { headers: { [key: string]: string } } {
    return { headers: { 'Authorization': 'Skip' } };
  }

  getToken(): string | null {
    return this.tokenSignal();
  }
}
