import { inject, Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, User } from '@angular/fire/auth';
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth = inject(Auth);
  public readonly authStateChange = new BehaviorSubject<User | null>(null);
  public readonly accessDenied = new BehaviorSubject<boolean>(false);

  constructor() {
    this.auth.onAuthStateChanged(user => {
      this.authStateChange.next(user);
      this.accessDenied.next(false);
    });
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  logout() {
    return this.auth.signOut();
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  currentUser(): User | null {
    return this.auth.currentUser;
  }

  setAccessDenied(denied: boolean) {
    this.accessDenied.next(denied);
  }
}
