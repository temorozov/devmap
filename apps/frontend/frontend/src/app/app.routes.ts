import { Route } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { RegisterComponent } from './register/register/register.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { CanvasComponent } from './canvas/canvas/canvas.component';
import { ConfirmEmailComponent } from './confirm-email/confirm-email/confirm-email.component';
import { authGuard } from './auth.guard';

export const appRoutes: Route[] = [
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'tree/:id', component: CanvasComponent }, // Shared read-only view, or authenticated view handled in component
    { path: 'confirm-email', component: ConfirmEmailComponent },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' }
];
