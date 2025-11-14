import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const sessionId = authService.getSessionId();

  if (token) {
    let headers = req.headers.set('Authorization', `Bearer ${token}`);

    // Ajouter le sessionId si disponible
    if (sessionId) {
      headers = headers.set('X-Session-Id', sessionId);
    }

    const clonedReq = req.clone({ headers });
    return next(clonedReq);
  }

  return next(req);
};
