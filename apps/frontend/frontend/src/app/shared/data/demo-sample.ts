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
  { key: 'root', icon: 'edit_note', level: 0, maxLevel: 1, positionX: 1000, positionY: 1500 },
  { key: 'dashboardBasics', parentKey: 'root', icon: 'space_dashboard', level: 0, maxLevel: 1, positionX: 720, positionY: 1300 },
  { key: 'canvasNavigation', parentKey: 'root', icon: 'account_tree', level: 0, maxLevel: 2, positionX: 980, positionY: 1300 },
  { key: 'languageSettings', parentKey: 'root', icon: 'language', level: 0, maxLevel: 1, positionX: 1240, positionY: 1300 },
  { key: 'sharing', parentKey: 'dashboardBasics', icon: 'share', level: 0, maxLevel: 1, positionX: 640, positionY: 1080 },
  { key: 'nodeEditing', parentKey: 'canvasNavigation', icon: 'edit_note', level: 0, maxLevel: 1, positionX: 820, positionY: 1080 },
  { key: 'shiftInteractions', parentKey: 'canvasNavigation', icon: 'select_all', level: 0, maxLevel: 2, positionX: 980, positionY: 980 },
  { key: 'skillLinking', parentKey: 'canvasNavigation', icon: 'device_hub', level: 0, maxLevel: 2, positionX: 1140, positionY: 1080 },
  { key: 'aiGeneration', parentKey: 'canvasNavigation', icon: 'auto_awesome', level: 0, maxLevel: 1, positionX: 1300, positionY: 1080 },
  { key: 'progressTracking', parentKey: 'dashboardBasics', icon: 'insights', level: 0, maxLevel: 1, positionX: 800, positionY: 860 },
  { key: 'workflowTips', parentKey: 'nodeEditing', icon: 'tips_and_updates', level: 0, maxLevel: 1, positionX: 860, positionY: 860 },
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
      rootTitle: 'Open Skill Details',
      rootDescription: 'Right-click a skill node to open its detailed properties panel.',
      dashboardBasicsTitle: 'Dashboard Basics',
      dashboardBasicsDescription: 'On the dashboard, click "New Tree", enter a title, and press "Create". Open any tree by clicking its card, or start with "Open example".',
      canvasNavigationTitle: 'Canvas Navigation',
      canvasNavigationDescription: 'Hold left mouse button and drag the background to move around. Use the mouse wheel to zoom in and out.',
      languageSettingsTitle: 'Language Settings',
      languageSettingsDescription: 'Open the dashboard and choose the interface language in the top-right corner.',
      sharingTitle: 'Sharing & Access',
      sharingDescription: 'On your tree card in the dashboard, click the share icon. The public link is copied to your clipboard, then send it to your teammate.',
      nodeEditingTitle: 'Edit Skill Properties',
      nodeEditingDescription: 'In the details panel, update title, icon, description, level, or max level and save changes.',
      shiftInteractionsTitle: 'Shift Multi-Select',
      shiftInteractionsDescription: 'Hold Shift and left-click to select several skills. Drag one selected skill with left mouse button to move the group. Hold Shift and click empty background to clear selection.',
      skillLinkingTitle: 'Link Skills',
      skillLinkingDescription: 'Create two new skills. Hover the top connector dot on the first skill, hold left mouse button, and drag the link to the second skill.',
      aiGenerationTitle: 'AI Generation',
      aiGenerationDescription: 'Open your own tree (not the demo), click "Generate with AI", enter a short prompt, and press "Generate". This feature is unavailable for guests.',
      progressTrackingTitle: 'Progress Tracking',
      progressTrackingDescription: 'In the tree, left-click a skill to increase its level (Shift + left-click to decrease). Watch total branch progress in the top progress bar.',
      workflowTipsTitle: 'Workflow Tips',
      workflowTipsDescription: 'Start from "Open example" on the dashboard, then create your own tree with "New Tree". Add skills with "Add skill" and edit each skill by right-clicking it.',
    },
    ru: {
      rootTitle: 'Открыть детальное описание навыка',
      rootDescription: 'Нажмите правой кнопкой мыши по навыку, чтобы открыть панель с его подробными параметрами.',
      dashboardBasicsTitle: 'Основы дашборда',
      dashboardBasicsDescription: 'На дашборде нажмите «Новое дерево», введите название и нажмите «Создать». Чтобы открыть ветку, нажмите по карточке дерева или «Открыть пример».',
      canvasNavigationTitle: 'Навигация по канвасу',
      canvasNavigationDescription: 'Чтобы перемещаться по карте, зажмите левую кнопку мыши и перетаскивайте фон. Чтобы приблизить или отдалить карту, используйте колесо мыши.',
      languageSettingsTitle: 'Языковые настройки',
      languageSettingsDescription: 'Зайдите в дашборд и в правом верхнем углу выберите язык интерфейса.',
      sharingTitle: 'Шаринг и доступ',
      sharingDescription: 'На карточке вашего дерева в дашборде нажмите иконку share. Публичная ссылка сразу копируется в буфер обмена, после этого отправьте её.',
      nodeEditingTitle: 'Редактирование параметров навыка',
      nodeEditingDescription: 'В панели параметров измените название, иконку, описание, уровень или макс. уровень и сохраните изменения.',
      shiftInteractionsTitle: 'Взаимодействия с навыками через клавишу Shift',
      shiftInteractionsDescription: 'Зажмите Shift и левой кнопкой мыши выделите несколько навыков. После этого зажмите левую кнопку мыши на любом из выделенных навыков, чтобы переместить всю группу. Чтобы снять выделение, зажмите Shift и нажмите по пустому месту на фоне.',
      skillLinkingTitle: 'Связывание навыков',
      skillLinkingDescription: 'Сначала создайте 2 новых навыка. Затем наведите курсор на точку в верхней части навыка, зажмите левую кнопку мыши и протяните связь ко второму навыку.',
      aiGenerationTitle: 'Генерации с ИИ',
      aiGenerationDescription: 'Откройте своё дерево (не демо), нажмите «Сгенерировать с ИИ», введите тему и нажмите «Сгенерировать». В гостевом режиме функция недоступна.',
      progressTrackingTitle: 'Отслеживание прогресса',
      progressTrackingDescription: 'Внутри дерева кликайте по навыку левой кнопкой, чтобы повышать уровень (Shift + левый клик понижает). Общий прогресс ветки смотрите в процентах в верхней панели.',
      workflowTipsTitle: 'Советы по процессу',
      workflowTipsDescription: 'Начните с «Открыть пример» на дашборде, затем создайте своё дерево через «Новое дерево». Добавляйте навыки кнопкой «Добавить навык» и редактируйте их правым кликом.',
    },
    uk: {
      rootTitle: 'Відкрити детальний опис навички',
      rootDescription: 'Натисніть правою кнопкою миші по навичці, щоб відкрити панель з її детальними параметрами.',
      dashboardBasicsTitle: 'Основи дашборду',
      dashboardBasicsDescription: 'На дашборді натисніть «Нове дерево», введіть назву та натисніть «Створити». Щоб відкрити гілку, натисніть на картку дерева або «Відкрити приклад».',
      canvasNavigationTitle: 'Навігація по канвасу',
      canvasNavigationDescription: 'Щоб переміщатися мапою, затисніть ліву кнопку миші та перетягуйте фон. Щоб збільшити або зменшити масштаб, використовуйте колесо миші.',
      languageSettingsTitle: 'Мовні налаштування',
      languageSettingsDescription: 'Відкрийте дашборд і у верхньому правому куті виберіть мову інтерфейсу.',
      sharingTitle: 'Поширення та доступ',
      sharingDescription: 'На картці вашого дерева в дашборді натисніть іконку share. Публічне посилання одразу копіюється в буфер обміну, після цього надішліть його.',
      nodeEditingTitle: 'Редагування параметрів навички',
      nodeEditingDescription: 'У панелі параметрів змініть назву, іконку, опис, рівень або макс. рівень і збережіть зміни.',
      shiftInteractionsTitle: 'Взаємодії з навичками через Shift',
      shiftInteractionsDescription: 'Затисніть Shift і лівою кнопкою миші виділіть кілька навичок. Потім затисніть ліву кнопку миші на будь-якій виділеній навичці, щоб перемістити всю групу. Щоб зняти виділення, затисніть Shift і натисніть по порожньому місцю на фоні.',
      skillLinkingTitle: 'Звʼязування навичок',
      skillLinkingDescription: 'Спочатку створіть 2 нові навички. Потім наведіть курсор на точку у верхній частині навички, затисніть ліву кнопку миші та протягніть звʼязок до другої навички.',
      aiGenerationTitle: 'Генерація з ШІ',
      aiGenerationDescription: 'Відкрийте своє дерево (не демо), натисніть «Згенерувати з ШІ», введіть тему та натисніть «Згенерувати». У гостьовому режимі функція недоступна.',
      progressTrackingTitle: 'Відстеження прогресу',
      progressTrackingDescription: 'Усередині дерева клікайте по навичці лівою кнопкою, щоб підвищувати рівень (Shift + лівий клік знижує). Загальний прогрес гілки дивіться у відсотках у верхній панелі.',
      workflowTipsTitle: 'Поради по процесу',
      workflowTipsDescription: 'Почніть із «Відкрити приклад» на дашборді, потім створіть власне дерево через «Нове дерево». Додавайте навички кнопкою «Додати навичку» і редагуйте їх правим кліком.',
    },
  };

  return map[language][`${key}${suffix}`];
}
