import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('dialogAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(-10px)' }),
        animate('200ms cubic-bezier(0.2, 0.8, 0.2, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 0, transform: 'scale(0.95) translateY(-20px)' }))
      ])
    ]),
    trigger('overlayAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class DialogComponent {
  constructor(public i18n: I18nService) {}

  @Input() message: string = '';
  @Input() title: string = '';
  @Input() isConfirm: boolean = false;
  
  @Output() closeEvent = new EventEmitter<boolean>();
  
  isClosing = false;

  close(result: boolean) {
    if (this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
        this.closeEvent.emit(result);
    }, 200); // Matches leave animation time
  }

  cancel() {
    this.close(false);
  }

  confirm() {
    this.close(true);
  }
  
  @HostListener('document:keydown.escape')
  onEscape() {
      this.cancel();
  }
}
