import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { authGuard, adminGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [publicGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [authGuard, adminGuard] },
  { path: '', canActivate: [authGuard], loadComponent: () => import('./site/site.component').then(m => m.SiteComponent) },
  { path: 'admin', canActivate: [authGuard, adminGuard], loadComponent: () => import('./admin-panel/admin-panel.component').then(m => m.AdminPanelComponent) },
  { path: 'dashboard', canActivate: [authGuard, adminGuard], loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent) },
  { path: '**', redirectTo: '' }
];


