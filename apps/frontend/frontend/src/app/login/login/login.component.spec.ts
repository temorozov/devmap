import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../auth.service';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let router: Router;
  const handleOAuthToken = jest.fn();
  const guestLogin = jest.fn(() => of({}));
  const hasValidToken = jest.fn();

  beforeEach(async () => {
    handleOAuthToken.mockReset();
    guestLogin.mockClear();
    hasValidToken.mockReset();
    hasValidToken.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: { guestLogin, handleOAuthToken, hasValidToken } },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        provideRouter([]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('redirects authenticated users to the dashboard', () => {
    hasValidToken.mockReturnValue(true);

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
