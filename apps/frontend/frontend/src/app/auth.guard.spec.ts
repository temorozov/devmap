import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const parseUrl = jest.fn((url: string) => url);
  const hasValidToken = jest.fn();

  beforeEach(() => {
    localStorage.clear();
    parseUrl.mockClear();
    hasValidToken.mockReset();
    hasValidToken.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { parseUrl } },
        { provide: AuthService, useValue: { hasValidToken } },
      ],
    });
  });

  it('redirects unauthenticated users to the landing page', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as unknown as RouterStateSnapshot)
    );

    expect(parseUrl).toHaveBeenCalledWith('/');
    expect(result).toBe('/');
  });

  it('allows authenticated users through', () => {
    hasValidToken.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/dashboard' } as unknown as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });
});
