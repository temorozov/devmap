import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLanguage, I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(I18nService);
  readonly languages: AppLanguage[] = this.i18n.availableLanguages;

  setLanguage(language: AppLanguage) {
    this.i18n.setLanguage(language);
  }
}
