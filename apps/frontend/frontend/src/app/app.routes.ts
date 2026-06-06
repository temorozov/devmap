import { Route } from '@angular/router';
import { LoginComponent } from './login/login/login.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { CanvasComponent } from './canvas/canvas/canvas.component';
import { LandingComponent } from './landing/landing/landing.component';
import { ProfileComponent } from './profile/profile/profile.component';
import { ExploreComponent } from './explore/explore.component';
import { authGuard } from './auth.guard';

export const appRoutes: Route[] = [
    { path: '', component: LandingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
    { path: 'explore', component: ExploreComponent },
    { path: 'compare', redirectTo: 'explore', pathMatch: 'full' },
    { path: 'compare/:handleA', redirectTo: 'explore', pathMatch: 'full' },
    { path: 'compare/:handleA/:handleB', redirectTo: 'explore', pathMatch: 'full' },
    { path: 'tree/:id', component: CanvasComponent },
    { path: 'u/:handle', component: ProfileComponent },
    { path: '**', redirectTo: '' }
];
