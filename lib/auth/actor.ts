/** Claims we may see on Azure AD ID tokens / OIDC profiles. */
export type AzureActorClaims = {
  email?: string | null;
  preferred_username?: string | null;
  upn?: string | null;
  unique_name?: string | null;
  name?: string | null;
};

/**
 * Pick a stable actor identity from Azure AD claims.
 * Many tenants omit `email` in the ID token; UPN usually lives in
 * `preferred_username` (v2) or `upn` (v1).
 */
export function resolveActorIdentity(
  claims: AzureActorClaims | null | undefined,
): string {
  if (!claims) return '';

  const candidates = [
    claims.email,
    claims.upn,
    claims.preferred_username,
    claims.unique_name,
  ];

  for (const raw of candidates) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) return value;
  }

  // Last resort: display name that looks like an email/UPN
  const name = typeof claims.name === 'string' ? claims.name.trim() : '';
  if (name.includes('@')) return name;

  return '';
}

/** Decode JWT payload without verifying (claims already trusted via OAuth). */
export function decodeIdTokenClaims(
  idToken: string | undefined | null,
): AzureActorClaims | undefined {
  if (!idToken || typeof idToken !== 'string') return undefined;
  try {
    const parts = idToken.split('.');
    if (parts.length < 2 || !parts[1]) return undefined;
    const json = Buffer.from(
      parts[1].replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    const parsed = JSON.parse(json) as AzureActorClaims;
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}
