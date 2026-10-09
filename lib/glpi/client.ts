/**
 * GLPI high-level API client (OAuth password grant).
 */

export class GlpiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'GlpiApiError';
  }
}

interface TokenState {
  accessToken: string;
  expiresAt: number;
}

let tokenState: TokenState | null = null;
let tokenPromise: Promise<string> | null = null;

function requireGlpiEnv(): {
  url: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
} {
  const url = process.env.GLPI_URL?.replace(/\/$/, '');
  const clientId = process.env.GLPI_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GLPI_OAUTH_CLIENT_SECRET;
  const username = process.env.GLPI_USERNAME;
  const password = process.env.GLPI_PASSWORD;

  if (!url || !clientId || !clientSecret || !username || !password) {
    throw new GlpiApiError(
      'GLPI OAuth is not configured (GLPI_URL, GLPI_OAUTH_CLIENT_ID, GLPI_OAUTH_CLIENT_SECRET, GLPI_USERNAME, GLPI_PASSWORD)',
      503,
    );
  }

  return { url, clientId, clientSecret, username, password };
}

async function fetchAccessToken(): Promise<string> {
  const { url, clientId, clientSecret, username, password } = requireGlpiEnv();

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
    scope: 'api',
  });

  const response = await fetch(`${url}/api.php/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new GlpiApiError(
      `GLPI OAuth token request failed (${response.status})`,
      503,
      text,
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new GlpiApiError('GLPI OAuth response missing access_token', 503);
  }

  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  // Refresh 60s early
  tokenState = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
  };

  return data.access_token;
}

export async function getGlpiAccessToken(): Promise<string> {
  if (tokenState && tokenState.expiresAt > Date.now()) {
    return tokenState.accessToken;
  }

  if (!tokenPromise) {
    tokenPromise = fetchAccessToken().finally(() => {
      tokenPromise = null;
    });
  }

  return tokenPromise;
}

/** Invalidate cached token (e.g. after 401). */
export function clearGlpiAccessToken(): void {
  tokenState = null;
}

export function getGlpiApiBase(): string {
  const { url } = requireGlpiEnv();
  return `${url}/api.php/v2.3`;
}

export interface GlpiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Retry once after clearing token on 401 */
  retryOnUnauthorized?: boolean;
}

function buildUrl(
  path: string,
  query?: GlpiRequestOptions['query'],
): string {
  const base = getGlpiApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalized}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function glpiFetch<T = unknown>(
  path: string,
  options: GlpiRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    retryOnUnauthorized = true,
  } = options;

  const token = await getGlpiAccessToken();
  const url = buildUrl(path, query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  let requestBody: string | undefined;
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: requestBody,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    clearGlpiAccessToken();
    return glpiFetch<T>(path, { ...options, retryOnUnauthorized: false });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    const title =
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'title' in parsed &&
      typeof (parsed as { title: unknown }).title === 'string'
        ? (parsed as { title: string }).title
        : `GLPI request failed (${response.status})`;

    const statusCode =
      response.status >= 500 ? 502 : response.status === 404 ? 404 : 400;

    throw new GlpiApiError(title, statusCode, parsed);
  }

  return parsed as T;
}
