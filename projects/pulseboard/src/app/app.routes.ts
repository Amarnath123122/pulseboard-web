import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { SessionService } from 'data-access';

const signedIn: CanActivateFn = () =>
  inject(SessionService).signedIn() || inject(Router).createUrlTree(['/sign-in']);

export const routes: Routes = [
  { path: 'sign-in', loadComponent: () => import('./pages/sign-in.page').then((m) => m.SignInPage) },
  { path: 'setup', canActivate: [signedIn], loadComponent: () => import('./pages/setup.page').then((m) => m.SetupPage) },
  { path: 'boards/:id', canActivate: [signedIn], loadComponent: () => import('./pages/board.page').then((m) => m.BoardPage) },
  { path: '', pathMatch: 'full', canActivate: [signedIn], loadComponent: () => import('./pages/board.page').then((m) => m.BoardPage) },
  { path: '**', redirectTo: '' },
];
