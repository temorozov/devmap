import { formatUnlocksSummary, getNodeStatus, getNodeStatusLabelKey, getNodeUiModel } from './skill-node-ui';

describe('skill-node-ui', () => {
  it('computes not-started, in-progress, and completed states from level and max level', () => {
    expect(getNodeStatus({ level: 0, maxLevel: 3 }, 3)).toBe('not-started');
    expect(getNodeStatus({ level: 2, maxLevel: 3 }, 3)).toBe('in-progress');
    expect(getNodeStatus({ level: 3, maxLevel: 3 }, 3)).toBe('completed');
  });

  it('formats unlock summaries with overflow count', () => {
    expect(
      formatUnlocksSummary([
        { title: 'React Basics' },
        { title: 'API Requests' },
        { title: 'Testing' },
      ])
    ).toBe('React Basics, API Requests +1 more');
  });

  it('builds a node ui model with progress and localized status key', () => {
    expect(getNodeUiModel({ level: 1, maxLevel: 4 }, 3)).toEqual({
      status: 'in-progress',
      statusLabelKey: 'canvas.statusInProgress',
      level: 1,
      maxLevel: 4,
      progressPercent: 25,
    });
    expect(getNodeStatusLabelKey('completed')).toBe('canvas.statusCompleted');
  });
});
