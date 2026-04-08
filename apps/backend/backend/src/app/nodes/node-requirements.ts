export type SkillRequirementStrength = 'recommended' | 'best';

export interface SkillRequirementHint {
  strength: SkillRequirementStrength;
  text: string;
}

export function normalizeRequirements(input: unknown): SkillRequirementHint[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.reduce<SkillRequirementHint[]>((acc, item) => {
    if (!item || typeof item !== 'object') {
      return acc;
    }

    const { strength, text } = item as Record<string, unknown>;
    if ((strength !== 'recommended' && strength !== 'best') || typeof text !== 'string') {
      return acc;
    }

    const normalizedText = text.trim();
    if (!normalizedText) {
      return acc;
    }

    acc.push({
      strength,
      text: normalizedText,
    });

    return acc;
  }, []);
}
