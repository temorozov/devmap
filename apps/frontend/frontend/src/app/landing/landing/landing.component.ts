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
  skillIntroPanelTitle: string;
  skillIntroTitleLabel: string;
  skillIntroTitle: string;
  skillIntroSubtitle: string;
  skillIntroNodeTitle: string;
  skillIntroStatus: string;
  skillIntroDescriptionLabel: string;
  skillIntroDescription: string;
  skillIntroIconLabel: string;
  skillIntroIconText: string;
  skillIntroLevelLabel: string;
  skillIntroLevelText: string;
  skillIntroHints: Array<{
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
    eyebrow: 'A playable map for any learning goal',
    title: 'Learn through a skill tree',
    subtitle: 'Turn a broad topic into connected skills, read what each skill means, raise its level after practice, and always see what branch to work on next.',
    primaryCta: 'Open my skill tree',
    secondaryCta: 'Try the demo map',
    login: 'Log in',
    howTitle: 'Use it like a game skill tree',
    howSubtitle: 'A field stops being one giant list. It becomes a map of skills with dependencies, levels, and a next move.',
    steps: [
      {
        icon: 'explore',
        title: 'Open a topic as a map',
        text: 'Frontend, math, language, music, fitness, or any path where skills build on each other.',
      },
      {
        icon: 'article',
        title: 'Read the skill before you practice',
        text: 'Each node has a description, icon, status, current level, and max level in the details panel.',
      },
      {
        icon: 'trending_up',
        title: 'Level it after real progress',
        text: 'Click a skill to level up. Shift-click to lower it when you need to revisit the basics.',
      },
    ],
    skillIntroPanelTitle: 'Node Properties',
    skillIntroTitleLabel: 'Title',
    skillIntroTitle: 'What a skill looks like inside the tree',
    skillIntroSubtitle: 'The tree is not just a diagram. Every circle is a skill card you can inspect, style, and level like an ability in a game.',
    skillIntroNodeTitle: 'CSS Layout',
    skillIntroStatus: 'In progress',
    skillIntroDescriptionLabel: 'Description',
    skillIntroDescription: 'Practice Flexbox, Grid, spacing, and responsive layouts until you can build a stable page without guessing.',
    skillIntroIconLabel: 'Icon',
    skillIntroIconText: 'Choose a visual marker such as code, book, idea, art, game, or fitness.',
    skillIntroLevelLabel: 'Level',
    skillIntroLevelText: 'Level 2 / Max Level 4',
    skillIntroHints: [
      {
        icon: 'ads_click',
        title: 'Click = level up',
        text: 'Use it after a practice session, lesson, or small project.',
      },
      {
        icon: 'keyboard_command_key',
        title: 'Shift-click = level down',
        text: 'Lower the level if the skill still needs review.',
      },
      {
        icon: 'edit_note',
        title: 'Right-click = details',
        text: 'Open Node Properties to edit the title, description, icon, level, and max level.',
      },
    ],
    featuresTitle: 'Why it feels easier',
    features: [
      {
        icon: 'auto_awesome',
        title: 'A starting map when you need one',
        text: 'AI can draft the first branches, then you keep only what matches your real path.',
      },
      {
        icon: 'device_hub',
        title: 'Prerequisites stay visible',
        text: 'Connections show which basics support harder skills, so the next step is easier to choose.',
      },
      {
        icon: 'share',
        title: 'A roadmap you can actually use',
        text: 'Move nodes, connect branches, update descriptions, and keep the map aligned with practice.',
      },
      {
        icon: 'local_fire_department',
        title: 'Progress has a shape',
        text: 'Levels, branch mastery, statuses, and active days make improvement visible.',
      },
    ],
    finalTitle: 'Pick one topic and start leveling it',
    finalText: 'Begin with the demo map or open your own tree. The useful part is not the perfect plan. It is seeing the next skill and updating it after practice.',
    finalCta: 'Open my skill tree',
    visualBadge: 'Demo route',
    visualTitle: 'Frontend Skill Tree',
    visualMeta: 'Level 2 / 4 on active branch',
  },
  ru: {
    eyebrow: 'Игровая карта для любой цели в обучении',
    title: 'Учись через skill tree',
    subtitle: 'Преврати большую тему в связанные навыки, читай описание каждого навыка, повышай уровень после практики и всегда видь следующую ветку для работы.',
    primaryCta: 'Открыть skill tree',
    secondaryCta: 'Попробовать демо',
    login: 'Войти',
    howTitle: 'Работает как дерево навыков в игре',
    howSubtitle: 'Сфера перестаёт быть огромным списком. Она становится картой навыков с зависимостями, уровнями и понятным следующим ходом.',
    steps: [
      {
        icon: 'explore',
        title: 'Открой тему как карту',
        text: 'Frontend, математика, язык, музыка, фитнес или любой путь, где навыки строятся друг на друге.',
      },
      {
        icon: 'article',
        title: 'Смотри навык перед практикой',
        text: 'У каждого узла есть описание, иконка, статус, текущий уровень и максимальный уровень в панели деталей.',
      },
      {
        icon: 'trending_up',
        title: 'Прокачивай после реального прогресса',
        text: 'Клик по навыку повышает уровень. Shift-клик понижает, если нужно вернуться к базе.',
      },
    ],
    skillIntroPanelTitle: 'Свойства узла',
    skillIntroTitleLabel: 'Название',
    skillIntroTitle: 'Как выглядит навык внутри дерева',
    skillIntroSubtitle: 'Дерево не просто схема. Каждый круг — это карточка навыка, которую можно открыть, оформить и прокачивать как способность в игре.',
    skillIntroNodeTitle: 'CSS Layout',
    skillIntroStatus: 'В процессе',
    skillIntroDescriptionLabel: 'Описание',
    skillIntroDescription: 'Практикуй Flexbox, Grid, отступы и адаптивные layout, пока не сможешь собирать стабильную страницу без угадывания.',
    skillIntroIconLabel: 'Иконка',
    skillIntroIconText: 'Выбери визуальную метку: code, book, idea, art, game или fitness.',
    skillIntroLevelLabel: 'Уровень',
    skillIntroLevelText: 'Уровень 2 / Макс. уровень 4',
    skillIntroHints: [
      {
        icon: 'ads_click',
        title: 'Клик = повысить уровень',
        text: 'Используй после практики, урока или небольшого проекта.',
      },
      {
        icon: 'keyboard_command_key',
        title: 'Shift-клик = понизить',
        text: 'Опусти уровень, если навык ещё нужно повторить.',
      },
      {
        icon: 'edit_note',
        title: 'Правый клик = детали',
        text: 'Открой «Свойства узла», чтобы менять название, описание, иконку, уровень и макс. уровень.',
      },
    ],
    featuresTitle: 'Почему так проще',
    features: [
      {
        icon: 'auto_awesome',
        title: 'Стартовая карта, когда она нужна',
        text: 'ИИ может набросать первые ветки, а ты оставишь только то, что подходит твоему пути.',
      },
      {
        icon: 'device_hub',
        title: 'Зависимости остаются видимыми',
        text: 'Связи показывают, какие основы держат сложные навыки, поэтому проще выбрать следующий шаг.',
      },
      {
        icon: 'share',
        title: 'Roadmap, которым можно пользоваться',
        text: 'Двигай узлы, связывай ветки, обновляй описания и держи карту рядом с реальной практикой.',
      },
      {
        icon: 'local_fire_department',
        title: 'У прогресса есть форма',
        text: 'Уровни, прогресс ветки, статусы и активные дни делают развитие видимым.',
      },
    ],
    finalTitle: 'Выбери тему и начни её прокачивать',
    finalText: 'Начни с демо-карты или открой своё дерево. Главное не идеальный план, а понятный следующий навык и обновление уровня после практики.',
    finalCta: 'Открыть skill tree',
    visualBadge: 'Демо-маршрут',
    visualTitle: 'Frontend Skill Tree',
    visualMeta: 'Уровень 2 / 4 в активной ветке',
  },
  uk: {
    eyebrow: 'Ігрова мапа для будь-якої навчальної цілі',
    title: 'Навчайся через skill tree',
    subtitle: 'Перетвори велику тему на повʼязані навички, читай опис кожної навички, підвищуй рівень після практики й завжди бач наступну гілку для роботи.',
    primaryCta: 'Відкрити skill tree',
    secondaryCta: 'Спробувати демо',
    login: 'Увійти',
    howTitle: 'Працює як дерево навичок у грі',
    howSubtitle: 'Сфера перестає бути величезним списком. Вона стає мапою навичок із залежностями, рівнями й зрозумілим наступним ходом.',
    steps: [
      {
        icon: 'explore',
        title: 'Відкрий тему як мапу',
        text: 'Frontend, математика, мова, музика, фітнес або будь-який шлях, де навички будуються одна на одній.',
      },
      {
        icon: 'article',
        title: 'Дивись навичку перед практикою',
        text: 'Кожен вузол має опис, іконку, статус, поточний рівень і максимальний рівень у панелі деталей.',
      },
      {
        icon: 'trending_up',
        title: 'Прокачуй після реального прогресу',
        text: 'Клік по навичці підвищує рівень. Shift-клік знижує, якщо треба повернутися до бази.',
      },
    ],
    skillIntroPanelTitle: 'Властивості вузла',
    skillIntroTitleLabel: 'Назва',
    skillIntroTitle: 'Як виглядає навичка всередині дерева',
    skillIntroSubtitle: 'Дерево не просто схема. Кожне коло — це картка навички, яку можна відкрити, оформити й прокачувати як здібність у грі.',
    skillIntroNodeTitle: 'CSS Layout',
    skillIntroStatus: 'У процесі',
    skillIntroDescriptionLabel: 'Опис',
    skillIntroDescription: 'Практикуй Flexbox, Grid, відступи й адаптивні layout, доки не зможеш збирати стабільну сторінку без вгадування.',
    skillIntroIconLabel: 'Іконка',
    skillIntroIconText: 'Обери візуальну мітку: code, book, idea, art, game або fitness.',
    skillIntroLevelLabel: 'Рівень',
    skillIntroLevelText: 'Рівень 2 / Макс. рівень 4',
    skillIntroHints: [
      {
        icon: 'ads_click',
        title: 'Клік = підвищити рівень',
        text: 'Використовуй після практики, уроку або невеликого проєкту.',
      },
      {
        icon: 'keyboard_command_key',
        title: 'Shift-клік = знизити',
        text: 'Опусти рівень, якщо навичку ще треба повторити.',
      },
      {
        icon: 'edit_note',
        title: 'Правий клік = деталі',
        text: 'Відкрий «Властивості вузла», щоб змінити назву, опис, іконку, рівень і макс. рівень.',
      },
    ],
    featuresTitle: 'Чому так простіше',
    features: [
      {
        icon: 'auto_awesome',
        title: 'Стартова мапа, коли вона потрібна',
        text: 'ШІ може накидати перші гілки, а ти залишиш тільки те, що підходить твоєму шляху.',
      },
      {
        icon: 'device_hub',
        title: 'Залежності залишаються видимими',
        text: 'Звʼязки показують, які основи тримають складні навички, тому простіше вибрати наступний крок.',
      },
      {
        icon: 'share',
        title: 'Roadmap, яким можна користуватись',
        text: 'Рухай вузли, зʼєднуй гілки, оновлюй описи й тримай мапу поруч із реальною практикою.',
      },
      {
        icon: 'local_fire_department',
        title: 'У прогресу є форма',
        text: 'Рівні, прогрес гілки, статуси й активні дні роблять розвиток видимим.',
      },
    ],
    finalTitle: 'Обери тему й почни її прокачувати',
    finalText: 'Почни з демо-мапи або відкрий своє дерево. Головне не ідеальний план, а зрозуміла наступна навичка й оновлення рівня після практики.',
    finalCta: 'Відкрити skill tree',
    visualBadge: 'Демо-маршрут',
    visualTitle: 'Frontend Skill Tree',
    visualMeta: 'Рівень 2 / 4 в активній гілці',
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
