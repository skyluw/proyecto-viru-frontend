import { Routes } from '@angular/router';
import { invitadoGuard, rolGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'admin',
    canActivate: [rolGuard('ADMIN')],
    loadComponent: () => import('./pages/admin/admin-home.page').then((m) => m.AdminHomePage),
  },
  {
    path: 'agricultor',
    canActivate: [rolGuard('FARMER')],
    loadComponent: () =>
      import('./pages/agricultor/agricultor-home.page').then((m) => m.AgricultorHomePage),
  },
  { path: '**', redirectTo: 'login' },
];
