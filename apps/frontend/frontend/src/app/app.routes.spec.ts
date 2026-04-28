import { appRoutes } from './app.routes';
import { LandingComponent } from './landing/landing/landing.component';

describe('appRoutes', () => {
  it('uses the landing page for the root route', () => {
    expect(appRoutes.find(route => route.path === '')?.component).toBe(LandingComponent);
  });

  it('redirects unknown routes to the landing page', () => {
    expect(appRoutes.find(route => route.path === '**')?.redirectTo).toBe('');
  });
});
