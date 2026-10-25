import { describe, expect, it } from 'vitest';
import { parseSkillMd } from './skills';

describe('parseSkillMd', () => {
  it("lit le nom et la description d'une ligne", () => {
    expect(
      parseSkillMd('---\nname: pdf\ndescription: "Lire des PDF"\nlicense: x\n---\n# Corps'),
    ).toEqual({
      name: 'pdf',
      description: 'Lire des PDF',
    });
  });
  it('lit une description sur plusieurs lignes', () => {
    expect(
      parseSkillMd('---\nname: a\ndescription: >\n  premier\n  second\n---\n').description,
    ).toBe('premier second');
  });
  it('renvoie un objet vide sans en-tête', () => {
    expect(parseSkillMd('# Rien')).toEqual({});
  });
});
