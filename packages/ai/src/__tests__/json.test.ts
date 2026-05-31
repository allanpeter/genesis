import { describe, expect, it } from 'vitest';
import { extractJson } from '../json';

describe('extractJson', () => {
  it('parses bare JSON object', () => {
    const result = extractJson<{ a: number }>('{"a":1}');
    expect(result).toEqual({ a: 1 });
  });

  it('parses JSON wrapped in fenced code block', () => {
    const raw = '```json\n{"vision":"test"}\n```';
    expect(extractJson<{ vision: string }>(raw)).toEqual({ vision: 'test' });
  });

  it('parses JSON with surrounding prose', () => {
    const raw = 'Here is the result: {"key":"value"} Done.';
    expect(extractJson<{ key: string }>(raw)).toEqual({ key: 'value' });
  });

  it('removes trailing commas before closing brace', () => {
    const raw = '{"a":1,"b":2,}';
    expect(extractJson<{ a: number; b: number }>(raw)).toEqual({ a: 1, b: 2 });
  });

  it('removes trailing commas before closing bracket', () => {
    const raw = '{"items":[1,2,3,]}';
    expect(extractJson<{ items: number[] }>(raw)).toEqual({ items: [1, 2, 3] });
  });

  it('throws on input with no JSON', () => {
    expect(() => extractJson('no json here')).toThrow();
  });
});
