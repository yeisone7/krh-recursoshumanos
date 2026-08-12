import { describe, expect, it } from 'vitest';
import { selectOnboardingTasks } from './onboardingTaskSelection';

describe('selectOnboardingTasks', () => {
  const predefinedTasks = [{ task_key: 'predefined' }];

  it('uses predefined tasks when a position has no configured template', () => {
    expect(selectOnboardingTasks(null, predefinedTasks)).toBe(predefinedTasks);
    expect(selectOnboardingTasks([], predefinedTasks)).toBe(predefinedTasks);
  });

  it('uses the position template when tasks are configured', () => {
    const positionTasks = [{ task_key: 'position' }];

    expect(selectOnboardingTasks(positionTasks, predefinedTasks)).toBe(positionTasks);
  });
});
