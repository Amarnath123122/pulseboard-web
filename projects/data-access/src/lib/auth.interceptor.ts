import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

const withToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/** Adds the access token. On a 401 it refreshes once (rotating the refresh token) and retries; else signs out. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const auth = inject(AuthService);
  const isAuthCall = /\/api\/v1\/auth\/(login|register|refresh|logout)$/.test(req.url);
  return next(isAuthCall ? req : withToken(req, session.token())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall || !session.refreshToken()) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap((token) => next(withToken(req, token))),
        catchError((refreshErr) => {
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
