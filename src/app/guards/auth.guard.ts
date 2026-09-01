import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, Observable, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

function whenInitialized(authService: AuthService, cb: () => boolean): Observable<boolean> {
  if (authService.isInitialized()) {
    return of(cb());
  }
  return toObservable(authService.isInitialized).pipe(
    filter(initialized => initialized),
    map(() => cb()),
  );
}

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return whenInitialized(authService, () => {
    if (authService.isAuthenticated()) {
      return true;
    }

    // Store the attempted URL for redirecting after login
    sessionStorage.setItem('redirectUrl', state.url);
    router.navigate(['/login']);
    return false;
  });
};

export const adminGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return whenInitialized(authService, () => {
    if (authService.isAdmin()) {
      return true;
    }

    router.navigate(['/']);
    return false;
  });
};

export const publicGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return whenInitialized(authService, () => {
    if (!authService.isAuthenticated()) {
      return true;
    }

    const redirectUrl = sessionStorage.getItem('redirectUrl') || '/';
    sessionStorage.removeItem('redirectUrl');
    router.navigate([redirectUrl]);
    return false;
  });
};
