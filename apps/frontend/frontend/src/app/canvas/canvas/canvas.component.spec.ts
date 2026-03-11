import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CanvasComponent } from './canvas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { TreesService } from '../../trees.service';
import { NodesService } from '../../nodes.service';
import { AuthService } from '../../auth.service';
import { DialogService } from '../../shared/services/dialog.service';
import { of } from 'rxjs';

describe('CanvasComponent', () => {
  let component: CanvasComponent;
  let fixture: ComponentFixture<CanvasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: () => '1' })
          }
        },
        { provide: Router, useValue: {} },
        { provide: TreesService, useValue: { getTree: () => of({}), getSharedTree: () => of({}) } },
        { provide: NodesService, useValue: { getNodesByTree: () => of([]) } },
        { provide: AuthService, useValue: { isGuest$: of(false) } },
        { provide: DialogService, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
