import { mapToSkill } from './skill-taxonomy';

describe('skill taxonomy', () => {
  it('maps aiogram to the Python backend skill', () => {
    expect(mapToSkill('aiogram')).toEqual({
      canonicalTitle: 'aiogram',
      category: 'backend',
      icon: 'smart_toy',
      prerequisites: ['Python'],
    });
  });
});
