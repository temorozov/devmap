import { getDemoSampleNodes } from './demo-sample';
import { AppLanguage } from '../services/i18n.service';

describe('demo sample tree', () => {
  const languages: AppLanguage[] = ['en', 'ru', 'uk'];

  it.each(languages)('has complete translated onboarding nodes for %s', (language) => {
    const nodes = getDemoSampleNodes(language);

    expect(nodes).toHaveLength(8);
    expect(nodes.every((node) => node.title && node.description)).toBe(true);
    expect(nodes.find((node) => node.id === 'demo-root')).toBeTruthy();
    expect(nodes.every((node) => !node.parentId || nodes.some((parent) => parent.id === node.parentId))).toBe(true);
  });
});
