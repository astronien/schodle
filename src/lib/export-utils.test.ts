import { describe, expect, it } from 'vitest';

describe('export-utils HTML escaping', () => {
  it('does not render raw HTML in employee names', async () => {
    const { printSchedule } = await import('./export-utils');

    // Mock window.open to capture the HTML written
    let captured = '';
    globalThis.window.open = (() => {
      const w = {
        document: {
          write: (s: string) => {
            captured += s;
          },
          close: () => {},
        },
      };
      return w as unknown as Window;
    }) as typeof window.open;

    printSchedule(
      new Date('2026-06-15'),
      [
        {
          id: '1',
          employeeCode: '<script>',
          fullName: '<img src=x onerror=alert(1)>',
          positionId: 'p1',
          role: 'employee',
        },
      ],
      [],
      [{ id: 'st1', code: 'M', name: 'เช้า', startTime: '08:00', endTime: '16:00', color: '#000', isVisible: true, isLeave: false, requiresApproval: false, requiresReason: false, requiresEvidence: false }],
      [],
      '<b>Store</b>',
    );

    globalThis.window.open = (() => null) as typeof window.open;

    // The raw HTML tags should be escaped in the output
    expect(captured).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(captured).toContain('&lt;script&gt;');
    expect(captured).toContain('&lt;b&gt;Store&lt;/b&gt;');
    // But NOT contain unescaped tags
    expect(captured).not.toContain('<img src=x onerror=alert(1)>');
    expect(captured).not.toContain('<b>Store</b>');
  });
});
