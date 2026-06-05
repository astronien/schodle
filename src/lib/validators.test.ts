import { describe, expect, it } from 'vitest';
import { getDiceBearAvatar, getInitials, isUuid, requireNonEmpty } from './validators';

describe('isUuid', () => {
  it('accepts lowercase UUIDs', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('accepts uppercase UUIDs', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects malformed UUIDs', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-a456')).toBe(false);
    expect(isUuid('123e4567-e89b-12d3-a456-42661417400z')).toBe(false);
    expect(isUuid('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid({})).toBe(false);
    expect(isUuid([])).toBe(false);
  });

  it('acts as a type guard', () => {
    const value: unknown = '123e4567-e89b-12d3-a456-426614174000';
    if (isUuid(value)) {
      // TypeScript narrows to string here
      expect(value.toUpperCase()).toBe(value.toUpperCase());
    } else {
      throw new Error('expected uuid');
    }
  });
});

describe('requireNonEmpty', () => {
  it('returns null for non-empty strings', () => {
    expect(requireNonEmpty('hello', 'ชื่อ')).toBeNull();
    expect(requireNonEmpty('  hello  ', 'ชื่อ')).toBeNull();
  });

  it('returns error message for empty / whitespace strings', () => {
    expect(requireNonEmpty('', 'ชื่อ')).toBe('กรุณากรอกชื่อ');
    expect(requireNonEmpty('   ', 'นามสกุล')).toBe('กรุณากรอกนามสกุล');
    expect(requireNonEmpty('\t\n', 'อีเมล')).toBe('กรุณากรอกอีเมล');
  });
});

describe('getDiceBearAvatar', () => {
  it('encodes the seed', () => {
    expect(getDiceBearAvatar('hello world')).toBe(
      'https://api.dicebear.com/7.x/avataaars/svg?seed=hello%20world'
    );
  });

  it('handles non-ASCII seeds', () => {
    expect(getDiceBearAvatar('สมชาย')).toMatch(/^https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=/);
    expect(decodeURIComponent(getDiceBearAvatar('สมชาย'))).toContain('สมชาย');
  });
});

describe('getInitials', () => {
  it('returns first letter of first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('สมชาย ใจดี')).toBe('สใ');
  });

  it('returns first two letters for single-word names', () => {
    expect(getInitials('Madonna')).toBe('MA');
    expect(getInitials('Mad')).toBe('MA');
  });

  it('returns ? for empty / whitespace names', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
  });

  it('handles many spaces between names', () => {
    expect(getInitials('Alice    Wonderland')).toBe('AW');
  });
});
