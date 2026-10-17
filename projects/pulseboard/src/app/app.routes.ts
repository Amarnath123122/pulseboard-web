import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { SessionService } from 'data-access';

const signedIn: CanActivateFn = () =>
  inject(SessionService).signedIn() || inject(Router).createUrlTree(['/sign-in']);

/** Route guard by permission (the API enforces the same permissions; this only keeps the UI honest). */
const can = (permission: string): CanActivateFn => () => {
  const session = inject(SessionService);
  if (!session.signedIn()) return inject(Router).createUrlTree(['/sign-in']);
  return session.can(permission) || inject(Router).createUrlTree(['/']);
};

const signedOut: CanActivateFn = () => !inject(SessionService).signedIn() || inject(Router).createUrlTree(['/']);

export const routes: Routes = [
  { path: 'sign-in', canActivate: [signedOut], loadComponent: () => import('./pages/sign-in.page').then((m) => m.SignInPage), title: 'Sign in · Pulseboard' },
  { path: 'users', canActivate: [can('users:read')], loadComponent: () => import('./pages/users.page').then((m) => m.UsersPage), title: 'Users · Pulseboard' },
  { path: 'setup', canActivate: [signedIn], loadComponent: () => import('./pages/setup.page').then((m) => m.SetupPage), title: 'Setup · Pulseboard' },
  { path: 'metrics', canActivate: [signedIn], loadComponent: () => import('./pages/metrics.page').then((m) => m.MetricsPage), title: 'Metric catalog · Pulseboard' },
  { path: 'boards', canActivate: [signedIn], loadComponent: () => import('./pages/boards.page').then((m) => m.BoardsPage), title: 'My boards · Pulseboard' },
  { path: 'activity', canActivate: [signedIn], loadComponent: () => import('./pages/activity.page').then((m) => m.ActivityPage), title: 'Activity · Pulseboard' },
  { path: 'boards/:id', canActivate: [signedIn], loadComponent: () => import('./pages/board.page').then((m) => m.BoardPage) },
  { path: '', pathMatch: 'full', canActivate: [signedIn], loadComponent: () => import('./pages/board.page').then((m) => m.BoardPage) },
  { path: '**', redirectTo: '' },
];
