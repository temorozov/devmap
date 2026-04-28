import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { I18nService, AppLanguage } from '../../shared/services/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { DEMO_TREE_ID } from '../../shared/data/demo-sample';

interface LandingCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
  login: string;
  howTitle: string;
  howSubtitle: string;
  steps: Array<{
    icon: string;
    title: string;
    text: string;
  }>;
  featuresTitle: string;
  features: Array<{
    icon: string;
    title: string;
    text: string;
  }>;
  finalTitle: string;
  finalText: string;
  finalCta: string;
  visualBadge: string;
  visualTitle: string;
  visualMeta: string;
}

const landingCopy: Record<AppLanguage, LandingCopy> = {
  en: {
    eyebrow: 'A simple roadmap for a new field',
    title: 'Start learning without getting lost',
    subtitle: 'Skill Tree turns a confusing topic into a clear game map with small steps, levels, and visible progress.',
    primaryCta: 'Build my roadmap',
    secondaryCta: 'Try the demo map',
    login: 'Log in',
    howTitle: 'When roadmaps feel too hard',
    howSubtitle: 'You do not need to understand the whole field on day one. Start with the next unlocked skill.',
    steps: [
      {
        icon: 'edit_note',
        title: 'Say what you want to learn',
        text: 'Choose a field: coding, design, math, language, music, or anything else.',
      },
      {
        icon: 'account_tree',
        title: 'Get a simple route',
        text: 'Break the field into small skills and see what depends on what.',
      },
      {
        icon: 'trending_up',
        title: 'Turn progress into a game',
        text: 'Level up skills after practice and watch your map open branch by branch.',
      },
    ],
    featuresTitle: 'Why it feels easier',
    features: [
      {
        icon: 'auto_awesome',
        title: 'No blank page',
        text: 'AI can draft the first roadmap when you do not know where to begin.',
      },
      {
        icon: 'device_hub',
        title: 'Clear prerequisites',
        text: 'See which basics unlock harder skills, without giant lists.',
      },
      {
        icon: 'share',
        title: 'Interactive, not static',
        text: 'Move, connect, edit, and grow the map as your plan changes.',
      },
      {
        icon: 'local_fire_department',
        title: 'Visible motivation',
        text: 'Levels, progress, and active days make learning feel alive.',
      },
    ],
    finalTitle: 'Pick one field and start',
    finalText: 'Your roadmap can be small at first. The map grows with you.',
    finalCta: 'Create my roadmap',
    visualBadge: 'Demo route',
    visualTitle: 'Frontend Basics',
    visualMeta: '42% branch mastery',
  },
  ru: {
    eyebrow: 'Простой roadmap для новой сферы',
    title: 'Начни учиться без хаоса',
    subtitle: 'Skill Tree превращает сложную тему в понятную игровую карту: маленькие шаги, уровни и видимый прогресс.',
    primaryCta: 'Собрать roadmap',
    secondaryCta: 'Попробовать демо',
    login: 'Войти',
    howTitle: 'Когда обычные роадмапы пугают',
    howSubtitle: 'Не нужно понимать всю сферу в первый день. Начни со следующего открытого навыка.',
    steps: [
      {
        icon: 'edit_note',
        title: 'Скажи, что хочешь изучить',
        text: 'Кодинг, дизайн, математика, язык, музыка или любая новая сфера.',
      },
      {
        icon: 'account_tree',
        title: 'Получи простой маршрут',
        text: 'Разбей сферу на маленькие навыки и увидь, что за чем идёт.',
      },
      {
        icon: 'trending_up',
        title: 'Играй в свой прогресс',
        text: 'Прокачивай навыки после практики и открывай карту ветка за веткой.',
      },
    ],
    featuresTitle: 'Почему так проще',
    features: [
      {
        icon: 'auto_awesome',
        title: 'Нет пустого листа',
        text: 'ИИ может собрать первый roadmap, если непонятно, с чего начать.',
      },
      {
        icon: 'device_hub',
        title: 'Понятные зависимости',
        text: 'Видно, какие основы открывают сложные навыки, без огромных списков.',
      },
      {
        icon: 'share',
        title: 'Интерактив вместо PDF',
        text: 'Двигай, связывай, редактируй и улучшай карту по ходу обучения.',
      },
      {
        icon: 'local_fire_department',
        title: 'Мотивация видна',
        text: 'Уровни, прогресс и активные дни делают развитие живым.',
      },
    ],
    finalTitle: 'Выбери сферу и начни',
    finalText: 'Roadmap может быть маленьким. Карта будет расти вместе с тобой.',
    finalCta: 'Создать roadmap',
    visualBadge: 'Демо-маршрут',
    visualTitle: 'Frontend Basics',
    visualMeta: '42% прогресса ветки',
  },
  uk: {
    eyebrow: 'Простий roadmap для нової сфери',
    title: 'Почни навчатися без хаосу',
    subtitle: 'Skill Tree перетворює складну тему на зрозумілу ігрову мапу: маленькі кроки, рівні й видимий прогрес.',
    primaryCta: 'Зібрати roadmap',
    secondaryCta: 'Спробувати демо',
    login: 'Увійти',
    howTitle: 'Коли звичайні роадмапи лякають',
    howSubtitle: 'Не потрібно розуміти всю сферу в перший день. Почни з наступної відкритої навички.',
    steps: [
      {
        icon: 'edit_note',
        title: 'Скажи, що хочеш вивчити',
        text: 'Кодинг, дизайн, математика, мова, музика або будь-яка нова сфера.',
      },
      {
        icon: 'account_tree',
        title: 'Отримай простий маршрут',
        text: 'Розбий сферу на маленькі навички й побач, що за чим іде.',
      },
      {
        icon: 'trending_up',
        title: 'Грай у свій прогрес',
        text: 'Прокачуй навички після практики й відкривай мапу гілка за гілкою.',
      },
    ],
    featuresTitle: 'Чому так простіше',
    features: [
      {
        icon: 'auto_awesome',
        title: 'Немає порожнього аркуша',
        text: 'ШІ може зібрати перший roadmap, якщо незрозуміло, з чого почати.',
      },
      {
        icon: 'device_hub',
        title: 'Зрозумілі залежності',
        text: 'Видно, які основи відкривають складні навички, без величезних списків.',
      },
      {
        icon: 'share',
        title: 'Інтерактив замість PDF',
        text: 'Рухай, зʼєднуй, редагуй і покращуй мапу під час навчання.',
      },
      {
        icon: 'local_fire_department',
        title: 'Мотивацію видно',
        text: 'Рівні, прогрес і активні дні роблять розвиток живим.',
      },
    ],
    finalTitle: 'Обери сферу й почни',
    finalText: 'Roadmap може бути маленьким. Мапа ростиме разом із тобою.',
    finalCta: 'Створити roadmap',
    visualBadge: 'Демо-маршрут',
    visualTitle: 'Frontend Basics',
    visualMeta: '42% прогресу гілки',
  },
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  readonly i18n = inject(I18nService);
  readonly authService = inject(AuthService);
  readonly demoTreeUrl = `/tree/${DEMO_TREE_ID}`;

  get copy(): LandingCopy {
    return landingCopy[this.i18n.currentLanguage()];
  }

  get authEntryRoute(): string {
    return this.authService.hasValidToken() ? '/dashboard' : '/login';
  }
}
