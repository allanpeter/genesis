import { describe, expect, it } from 'vitest';
import { listAgentSlugs, loadAgent, mergeWithDbAgent } from '../agent-loader';

describe('listAgentSlugs', () => {
  it('returns at least the 4 built-in slugs', () => {
    const slugs = listAgentSlugs();
    expect(slugs).toContain('product-manager');
    expect(slugs).toContain('tech-lead');
    expect(slugs).toContain('validator');
    expect(slugs).toContain('marketing');
  });
});

describe('loadAgent', () => {
  it('loads product-manager with expected fields', () => {
    const agent = loadAgent('product-manager');
    expect(agent).not.toBeNull();
    expect(agent!.slug).toBe('product-manager');
    expect(agent!.name).toBeTruthy();
    expect(agent!.systemPrompt.length).toBeGreaterThan(50);
  });

  it('returns null for unknown slug', () => {
    expect(loadAgent('nonexistent-agent-xyz')).toBeNull();
  });
});

describe('mergeWithDbAgent', () => {
  const base = loadAgent('product-manager')!;

  it('uses DB name and role when provided', () => {
    const merged = mergeWithDbAgent(base, { name: 'PM Custom', role: 'Custom Role' });
    expect(merged.name).toBe('PM Custom');
    expect(merged.role).toBe('Custom Role');
  });

  it('keeps base values when DB fields are null', () => {
    const merged = mergeWithDbAgent(base, { name: null, role: null });
    expect(merged.name).toBe(base.name);
    expect(merged.role).toBe(base.role);
  });

  it('prepends DB instructions to systemPrompt', () => {
    const merged = mergeWithDbAgent(base, { instructions: 'Foco em B2B.' });
    expect(merged.systemPrompt.startsWith('Foco em B2B.')).toBe(true);
    expect(merged.systemPrompt).toContain(base.systemPrompt);
  });

  it('leaves systemPrompt unchanged when instructions is null', () => {
    const merged = mergeWithDbAgent(base, { instructions: null });
    expect(merged.systemPrompt).toBe(base.systemPrompt);
  });
});
