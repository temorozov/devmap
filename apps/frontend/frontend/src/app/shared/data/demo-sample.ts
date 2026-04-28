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
  { key: 'root', icon: 'touch_app', level: 0, maxLevel: 1, positionX: 1000, positionY: 1500 },
  { key: 'moveMap', parentKey: 'root', icon: 'open_with', level: 0, maxLevel: 1, positionX: 760, positionY: 1300 },
  { key: 'openDetails', parentKey: 'root', icon: 'edit_note', level: 0, maxLevel: 1, positionX: 1000, positionY: 1280 },
  { key: 'changeProgress', parentKey: 'root', icon: 'trending_up', level: 0, maxLevel: 2, positionX: 1240, positionY: 1300 },
  { key: 'addSkill', parentKey: 'openDetails', icon: 'add_circle', level: 0, maxLevel: 1, positionX: 880, positionY: 1060 },
  { key: 'connectSkills', parentKey: 'addSkill', icon: 'device_hub', level: 0, maxLevel: 1, positionX: 1060, positionY: 900 },
  { key: 'multiSelect', parentKey: 'changeProgress', icon: 'select_all', level: 0, maxLevel: 1, positionX: 1220, positionY: 1060 },
  { key: 'createOwnTree', parentKey: 'root', icon: 'rocket_launch', level: 0, maxLevel: 1, positionX: 1000, positionY: 1740 },
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
      rootTitle: 'Start Here',
      rootDescription: 'This demo is a safe playground. Try the controls here, then create your own tree from the dashboard.',
      moveMapTitle: 'Move Around',
      moveMapDescription: 'Drag the empty background to move the map. Use the mouse wheel to zoom in and out.',
      openDetailsTitle: 'Open Details',
      openDetailsDescription: 'Right-click any skill to open the details panel. There you can read the description and edit the skill.',
      changeProgressTitle: 'Change Progress',
      changeProgressDescription: 'Left-click a skill to increase its level. Hold Shift and left-click to decrease it.',
      addSkillTitle: 'Add a Skill',
      addSkillDescription: 'Click "Add skill" in the top bar. In this demo, new skills are only added locally for practice.',
      connectSkillsTitle: 'Connect Skills',
      connectSkillsDescription: 'Drag from the connector dot on one skill to another skill to create a parent-child link.',
      multiSelectTitle: 'Move Several Skills',
      multiSelectDescription: 'Hold Shift and click a few skills to select them. Drag one selected skill to move the whole group.',
      createOwnTreeTitle: 'Create Your Tree',
      createOwnTreeDescription: 'Go back to the dashboard, click "New Tree", enter a title, and start building your real roadmap.',
    },
    ru: {
      rootTitle: 'Начните здесь',
      rootDescription: 'Это безопасное демо. Попробуйте управление здесь, а потом создайте своё дерево на дашборде.',
      moveMapTitle: 'Двигать карту',
      moveMapDescription: 'Зажмите пустой фон и перетаскивайте карту. Колесом мыши приближайте и отдаляйте.',
      openDetailsTitle: 'Открыть детали',
      openDetailsDescription: 'Нажмите правой кнопкой по любому навыку, чтобы открыть панель деталей. Там можно читать описание и редактировать навык.',
      changeProgressTitle: 'Менять прогресс',
      changeProgressDescription: 'Левый клик по навыку повышает уровень. Shift + левый клик понижает уровень.',
      addSkillTitle: 'Добавить навык',
      addSkillDescription: 'Нажмите «Добавить навык» в верхней панели. В демо новые навыки добавляются только локально для тренировки.',
      connectSkillsTitle: 'Связать навыки',
      connectSkillsDescription: 'Потяните связь от точки-коннектора на одном навыке к другому, чтобы сделать связь родитель-потомок.',
      multiSelectTitle: 'Двигать несколько навыков',
      multiSelectDescription: 'Зажмите Shift и кликните несколько навыков. Потом перетащите один выбранный навык, чтобы сдвинуть всю группу.',
      createOwnTreeTitle: 'Создать своё дерево',
      createOwnTreeDescription: 'Вернитесь на дашборд, нажмите «Новое дерево», введите название и начните собирать свою карту.',
    },
    uk: {
      rootTitle: 'Почніть тут',
      rootDescription: 'Це безпечне демо. Спробуйте керування тут, а потім створіть своє дерево на дашборді.',
      moveMapTitle: 'Рухати карту',
      moveMapDescription: 'Затисніть порожній фон і перетягуйте карту. Колесом миші збільшуйте або зменшуйте масштаб.',
      openDetailsTitle: 'Відкрити деталі',
      openDetailsDescription: 'Натисніть правою кнопкою по будь-якій навичці, щоб відкрити панель деталей. Там можна читати опис і редагувати навичку.',
      changeProgressTitle: 'Змінювати прогрес',
      changeProgressDescription: 'Лівий клік по навичці підвищує рівень. Shift + лівий клік знижує рівень.',
      addSkillTitle: 'Додати навичку',
      addSkillDescription: 'Натисніть «Додати навичку» у верхній панелі. У демо нові навички додаються тільки локально для тренування.',
      connectSkillsTitle: 'Звʼязати навички',
      connectSkillsDescription: 'Протягніть звʼязок від точки-конектора на одній навичці до іншої, щоб зробити звʼязок батько-нащадок.',
      multiSelectTitle: 'Рухати кілька навичок',
      multiSelectDescription: 'Затисніть Shift і клікніть кілька навичок. Потім перетягніть одну вибрану навичку, щоб зсунути всю групу.',
      createOwnTreeTitle: 'Створити своє дерево',
      createOwnTreeDescription: 'Поверніться на дашборд, натисніть «Нове дерево», введіть назву й почніть збирати свою карту.',
    },
  };

  return map[language][`${key}${suffix}`];
}
