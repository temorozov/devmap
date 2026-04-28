import { Route } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { CanvasComponent } from './canvas/canvas/canvas.component';
import { LandingComponent } from './landing/landing/landing.component';
import { authGuard } from './auth.guard';

export const appRoutes: Route[] = [
    { path: '', component: LandingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'tree/:id', component: CanvasComponent }, // Shared read-only view, or authenticated view handled in component
    { path: '**', redirectTo: '' }
];
