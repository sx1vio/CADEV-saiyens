import { describe, expect, it } from 'vitest';
import { diverse, similar, words } from './diversity';

describe('similar', () => {
  it('reconnaît deux titres sur le même sujet, en français ou en anglais', () => {
    expect(
      similar(words('Apple unveils the new iPhone 18'), words('iPhone 18: Apple unveils it')),
    ).toBe(true);
    expect(similar(words('Apple unveils the new iPhone 18'), words('Rust 2.0 is out'))).toBe(false);
  });
});

describe('diverse', () => {
  const item = (source: string, title: string) => ({ source, title });

  it('limite le nombre d’éléments par source', () => {
    const items = [
      item('a', 'Rust release'),
      item('a', 'Go generics'),
      item('a', 'Zig compiler'),
      item('b', 'Kotlin news'),
    ];
    expect(diverse(items, 10, 2).map((i) => i.title)).toEqual([
      'Rust release',
      'Go generics',
      'Kotlin news',
    ]);
  });

  it('écarte les doublons de sujet et s’arrête à n', () => {
    const items = [
      item('a', 'OpenAI ships GPT model'),
      item('b', 'GPT model ships at OpenAI'),
      item('c', 'Docker 30'),
      item('d', 'Vite 9'),
    ];
    expect(diverse(items, 2).map((i) => i.source)).toEqual(['a', 'c']);
  });
});
