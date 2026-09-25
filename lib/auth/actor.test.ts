import { describe, expect, it } from 'vitest';
import { decodeIdTokenClaims, resolveActorIdentity } from './actor';

describe('resolveActorIdentity', () => {
  it('prefers email over UPN claims', () => {
    expect(
      resolveActorIdentity({
        email: 'user@ukad-group.com',
        preferred_username: 'user@tenant.onmicrosoft.com',
        upn: 'user@ukad-group.com',
      }),
    ).toBe('user@ukad-group.com');
  });

  it('falls back to preferred_username when email is missing', () => {
    expect(
      resolveActorIdentity({
        preferred_username: 'bogdan@ukad-group.com',
        name: 'Bogdan',
      }),
    ).toBe('bogdan@ukad-group.com');
  });

  it('falls back to upn then unique_name', () => {
    expect(resolveActorIdentity({ upn: 'a@b.com' })).toBe('a@b.com');
    expect(resolveActorIdentity({ unique_name: 'c@d.com' })).toBe('c@d.com');
  });

  it('uses name only when it looks like an email', () => {
    expect(resolveActorIdentity({ name: 'Jane Doe' })).toBe('');
    expect(resolveActorIdentity({ name: 'jane@ukad-group.com' })).toBe(
      'jane@ukad-group.com',
    );
  });

  it('returns empty for empty claims', () => {
    expect(resolveActorIdentity(undefined)).toBe('');
    expect(resolveActorIdentity({})).toBe('');
  });
});

describe('decodeIdTokenClaims', () => {
  it('decodes payload claims from a JWT-shaped string', () => {
    const payload = Buffer.from(
      JSON.stringify({ preferred_username: 'x@y.com', name: 'X' }),
    ).toString('base64url');
    const token = `hdr.${payload}.sig`;
    expect(decodeIdTokenClaims(token)?.preferred_username).toBe('x@y.com');
  });

  it('returns undefined for invalid tokens', () => {
    expect(decodeIdTokenClaims(null)).toBeUndefined();
    expect(decodeIdTokenClaims('not-a-jwt')).toBeUndefined();
  });
});
