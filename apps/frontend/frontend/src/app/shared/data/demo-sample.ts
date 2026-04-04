import { AppLanguage } from '../services/i18n.service';

export interface SampleNodeTemplate {
  key: string;
  parentKey?: string;
  icon: string;
  level: number;
  maxLevel: number;
  positionX: number;
  positionY: number;
}

export const DEMO_TREE_ID = 'demo-site-functionality';

export const demoSampleTemplates: SampleNodeTemplate[] = [
  { key: 'root', icon: 'explore', level: 1, maxLevel: 3, positionX: 1000, positionY: 1500 },
  { key: 'dashboardBasics', parentKey: 'root', icon: 'space_dashboard', level: 2, maxLevel: 3, positionX: 720, positionY: 1300 },
  { key: 'canvasNavigation', parentKey: 'root', icon: 'account_tree', level: 2, maxLevel: 3, positionX: 980, positionY: 1300 },
  { key: 'languageSettings', parentKey: 'root', icon: 'language', level: 1, maxLevel: 3, positionX: 1240, positionY: 1300 },
  { key: 'sharing', parentKey: 'dashboardBasics', icon: 'share', level: 1, maxLevel: 3, positionX: 640, positionY: 1080 },
  { key: 'nodeEditing', parentKey: 'canvasNavigation', icon: 'edit_note', level: 1, maxLevel: 3, positionX: 900, positionY: 1080 },
  { key: 'aiGeneration', parentKey: 'canvasNavigation', icon: 'auto_awesome', level: 1, maxLevel: 3, positionX: 1160, positionY: 1080 },
  { key: 'progressTracking', parentKey: 'dashboardBasics', icon: 'insights', level: 0, maxLevel: 3, positionX: 800, positionY: 860 },
  { key: 'workflowTips', parentKey: 'nodeEditing', icon: 'tips_and_updates', level: 0, maxLevel: 3, positionX: 1000, positionY: 860 },
];

const sampleTitles: Record<AppLanguage, string> = {
  en: 'Website Functionality Tour',
  ru: 'Изучение функциональности сайта',
  uk: 'Вивчення функціональності сайту',
};

export function getDemoSampleTitle(language: AppLanguage): string {
  return sampleTitles[language];
}

export function getDemoSampleNodes(language: AppLanguage) {
  return demoSampleTemplates.map((template) => ({
    id: `demo-${template.key}`,
    treeId: DEMO_TREE_ID,
    parentId: template.parentKey ? `demo-${template.parentKey}` : undefined,
    title: getNodeTranslation(language, template.key, 'Title'),
    description: getNodeTranslation(language, template.key, 'Description'),
    icon: template.icon,
    positionX: template.positionX,
    positionY: template.positionY,
    progress: (template.level / template.maxLevel) * 100,
    level: template.level,
    maxLevel: template.maxLevel,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }));
}

function getNodeTranslation(language: AppLanguage, key: string, suffix: 'Title' | 'Description') {
  const map: Record<AppLanguage, Record<string, string>> = {
    en: {
      rootTitle: 'Site Functionality',
      rootDescription: 'Main branch for quickly learning the product and where key actions live.',
      dashboardBasicsTitle: 'Dashboard Basics',
      dashboardBasicsDescription: 'Create trees, open examples, and manage your learning workspace.',
      canvasNavigationTitle: 'Canvas Navigation',
      canvasNavigationDescription: 'Move around the map, zoom, and center your work area fast.',
      languageSettingsTitle: 'Language Settings',
      languageSettingsDescription: 'Switch interface language and check localized UI labels.',
      sharingTitle: 'Sharing & Access',
      sharingDescription: 'Copy public links and share a read-only version of your tree.',
      nodeEditingTitle: 'Node Editing',
      nodeEditingDescription: 'Add skills, edit details, connect nodes, and tune levels.',
      aiGenerationTitle: 'AI Generation',
      aiGenerationDescription: 'Generate draft branches from prompts to speed up planning.',
      progressTrackingTitle: 'Progress Tracking',
      progressTrackingDescription: 'Use levels and activity signals to monitor real progress.',
      workflowTipsTitle: 'Workflow Tips',
      workflowTipsDescription: 'Build habits: start from examples, iterate, then make your own tree.',
    },
    ru: {
      rootTitle: 'Функциональность сайта',
      rootDescription: 'Главная ветка для быстрого освоения продукта и ключевых действий.',
      dashboardBasicsTitle: 'Основы дашборда',
      dashboardBasicsDescription: 'Создавайте деревья, открывайте пример и управляйте рабочим пространством.',
      canvasNavigationTitle: 'Навигация по канвасу',
      canvasNavigationDescription: 'Перемещение по карте, зум и быстрое центрирование области работы.',
      languageSettingsTitle: 'Языковые настройки',
      languageSettingsDescription: 'Переключайте язык интерфейса и проверяйте локализацию UI.',
      sharingTitle: 'Шаринг и доступ',
      sharingDescription: 'Копируйте публичные ссылки и делитесь деревом в read-only режиме.',
      nodeEditingTitle: 'Редактирование узлов',
      nodeEditingDescription: 'Добавляйте навыки, правьте детали, связывайте узлы и настраивайте уровни.',
      aiGenerationTitle: 'Генерация с ИИ',
      aiGenerationDescription: 'Генерируйте черновые ветки по промптам для быстрого старта.',
      progressTrackingTitle: 'Отслеживание прогресса',
      progressTrackingDescription: 'Следите за реальным прогрессом через уровни и активность.',
      workflowTipsTitle: 'Советы по процессу',
      workflowTipsDescription: 'Начинайте с примера, улучшайте структуру и переходите к своему дереву.',
    },
    uk: {
      rootTitle: 'Функціональність сайту',
      rootDescription: 'Головна гілка для швидкого освоєння продукту та ключових дій.',
      dashboardBasicsTitle: 'Основи дашборду',
      dashboardBasicsDescription: 'Створюйте дерева, відкривайте приклад і керуйте робочим простором.',
      canvasNavigationTitle: 'Навігація по канвасу',
      canvasNavigationDescription: 'Переміщення по мапі, масштабування та швидке центрування робочої області.',
      languageSettingsTitle: 'Мовні налаштування',
      languageSettingsDescription: 'Перемикайте мову інтерфейсу та перевіряйте локалізовані підписи UI.',
      sharingTitle: 'Поширення та доступ',
      sharingDescription: 'Копіюйте публічні посилання та діліться деревом у read-only режимі.',
      nodeEditingTitle: 'Редагування вузлів',
      nodeEditingDescription: 'Додавайте навички, редагуйте деталі, зʼєднуйте вузли та налаштовуйте рівні.',
      aiGenerationTitle: 'Генерація ШІ',
      aiGenerationDescription: 'Генеруйте чернетки гілок за промптами для швидкого старту.',
      progressTrackingTitle: 'Відстеження прогресу',
      progressTrackingDescription: 'Відстежуйте реальний прогрес через рівні та активність.',
      workflowTipsTitle: 'Поради по процесу',
      workflowTipsDescription: 'Починайте з прикладу, покращуйте структуру і переходьте до власного дерева.',
    },
  };

  return map[language][`${key}${suffix}`];
}
