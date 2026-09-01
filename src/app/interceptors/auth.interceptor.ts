import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip adding auth header if already present
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  // Get token from auth service
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Only add Authorization header if we have a valid token
  if (token && token.trim().length > 0) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  // Request without auth token
  return next(req);
};
