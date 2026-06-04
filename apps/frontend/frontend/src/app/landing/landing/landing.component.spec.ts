import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { LandingComponent } from './landing.component';
import { AuthService } from '../../auth.service';

describe('LandingComponent', () => {
  let fixture: ComponentFixture<LandingComponent>;
  const hasValidToken = jest.fn();

  beforeEach(async () => {
    hasValidToken.mockReset();
    hasValidToken.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [LandingComponent, RouterModule.forRoot([])],
      providers: [{ provide: AuthService, useValue: { hasValidToken } }],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the primary landing content', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.page')).not.toBeNull();
    expect(compiled.textContent).toContain('DevMap');
  });

  it('routes authenticated users to the dashboard from the primary CTA', () => {
    hasValidToken.mockReturnValue(true);
    fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.authEntryRoute).toBe('/dashboard');
  });
});
