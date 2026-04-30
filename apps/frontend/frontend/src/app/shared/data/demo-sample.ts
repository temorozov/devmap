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
      moveMapDescription: 'Drag the empty background to move the map. Pinch on a phone or use the mouse wheel to zoom.',
      openDetailsTitle: 'Open Details',
      openDetailsDescription: 'Tap any skill on a phone, or right-click on desktop, to open details and edit the skill.',
      changeProgressTitle: 'Change Progress',
      changeProgressDescription: 'Use the level controls in the details panel. On desktop, click a skill to level up and Shift-click to level down.',
      addSkillTitle: 'Add a Skill',
      addSkillDescription: 'Click "Add skill" in the top bar. In this demo, new skills are only added locally for practice.',
      connectSkillsTitle: 'Connect Skills',
      connectSkillsDescription: 'Drag from the small top connector on one skill to another skill to create a parent-child link.',
      multiSelectTitle: 'Move Several Skills',
      multiSelectDescription: 'On desktop, hold Shift and click a few skills to select them. Drag one selected skill to move the group.',
      createOwnTreeTitle: 'Create Your Tree',
      createOwnTreeDescription: 'Go back to the dashboard, click "New Tree", enter a title, and start building your real roadmap.',
    },
    ru: {
      rootTitle: 'Начните здесь',
      rootDescription: 'Это безопасное демо. Попробуйте управление здесь, а потом создайте своё дерево на дашборде.',
      moveMapTitle: 'Двигать карту',
      moveMapDescription: 'Зажмите пустой фон и перетаскивайте карту. На телефоне меняйте масштаб двумя пальцами, на desktop — колесом мыши.',
      openDetailsTitle: 'Открыть детали',
      openDetailsDescription: 'На телефоне нажмите на любой навык, а на desktop — правой кнопкой. Откроется панель деталей и редактирования.',
      changeProgressTitle: 'Менять прогресс',
      changeProgressDescription: 'Меняйте уровень кнопками в панели деталей. На desktop левый клик повышает уровень, Shift + клик понижает.',
      addSkillTitle: 'Добавить навык',
      addSkillDescription: 'Нажмите «Добавить навык» в верхней панели. В демо новые навыки добавляются только локально для тренировки.',
      connectSkillsTitle: 'Связать навыки',
      connectSkillsDescription: 'Потяните связь от маленькой верхней точки на одном навыке к другому, чтобы сделать связь родитель-потомок.',
      multiSelectTitle: 'Двигать несколько навыков',
      multiSelectDescription: 'На desktop зажмите Shift и кликните несколько навыков. Потом перетащите один выбранный навык, чтобы сдвинуть группу.',
      createOwnTreeTitle: 'Создать своё дерево',
      createOwnTreeDescription: 'Вернитесь на дашборд, нажмите «Новое дерево», введите название и начните собирать свою карту.',
    },
    uk: {
      rootTitle: 'Почніть тут',
      rootDescription: 'Це безпечне демо. Спробуйте керування тут, а потім створіть своє дерево на дашборді.',
      moveMapTitle: 'Рухати карту',
      moveMapDescription: 'Затисніть порожній фон і перетягуйте карту. На телефоні масштабуйте двома пальцями, на desktop — колесом миші.',
      openDetailsTitle: 'Відкрити деталі',
      openDetailsDescription: 'На телефоні натисніть будь-яку навичку, а на desktop — правою кнопкою. Відкриється панель деталей і редагування.',
      changeProgressTitle: 'Змінювати прогрес',
      changeProgressDescription: 'Змінюйте рівень кнопками в панелі деталей. На desktop лівий клік підвищує рівень, Shift + клік знижує.',
      addSkillTitle: 'Додати навичку',
      addSkillDescription: 'Натисніть «Додати навичку» у верхній панелі. У демо нові навички додаються тільки локально для тренування.',
      connectSkillsTitle: 'Звʼязати навички',
      connectSkillsDescription: 'Протягніть звʼязок від маленької верхньої точки на одній навичці до іншої, щоб зробити звʼязок батько-нащадок.',
      multiSelectTitle: 'Рухати кілька навичок',
      multiSelectDescription: 'На desktop затисніть Shift і клікніть кілька навичок. Потім перетягніть одну вибрану навичку, щоб зсунути групу.',
      createOwnTreeTitle: 'Створити своє дерево',
      createOwnTreeDescription: 'Поверніться на дашборд, натисніть «Нове дерево», введіть назву й почніть збирати свою карту.',
    },
  };

  return map[language][`${key}${suffix}`];
}
