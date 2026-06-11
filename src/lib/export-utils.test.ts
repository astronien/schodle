import { describe, expect, it } from 'vitest';

describe('export-utils HTML escaping', () => {
  it('does not render raw HTML in employee names', async () => {
    const { printSchedule } = await import('./export-utils');
    const maliciousName = '<img src=x onerror=alert(1)>';
    const html = (printSchedule as unknown as { toString?: () => string });

    // Mock window.open to capture the HTML written
    let captured = '';
    const original = globalThis.window.open;
    globalThis.window.open = ((url?: string | URL, target?: string) => {
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
          fullName: maliciousName,
          positionId: 'p1',
          role: 'employee',
        },
      ],
      [],
      [{ id: 'st1', code: 'M', name: 'เช้า', startTime: '08:00', endTime: '16:00', color: '#000', isVisible: true, isLeave: false }],
      [],
      '<b>Store</b>',
    );

    globalThis.window.open = original;

    // The raw HTML tags should be escaped in the output
    expect(captured).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(captured).toContain('&lt;script&gt;');
    expect(captured).toContain('&lt;b&gt;Store&lt;/b&gt;');
    // But NOT contain unescaped tags
    expect(captured).not.toContain('<img src=x onerror=alert(1)>');
    expect(captured).not.toContain('<b>Store</b>');
    void html; // silence unused
  });
});
