/**
 * Google OAuth 2.0 with PKCE for desktop apps.
 * No client secret needed - uses code_verifier/code_challenge.
 */
import http from 'http';
import crypto from 'crypto';
import { shell } from 'electron';
import { saveTokens, loadTokens, clearTokens, StoredTokens } from './tokenStore';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface OAuthConfig {
  clientId: string;
  scopes: string[];
}

// Generate a random code_verifier for PKCE
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// SHA256 hash the code_verifier to create code_challenge
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

/**
 * Start the OAuth PKCE flow:
 * 1. Start a local HTTP server on a random port
 * 2. Open the browser for Google sign-in
 * 3. Handle the callback with the auth code
 * 4. Exchange the auth code for tokens
 */
export async function authorize(config: OAuthConfig): Promise<StoredTokens> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return new Promise((resolve, reject) => {
    const server = http.createServer();
    // Listen on port 0 to get a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to start callback server'));
        return;
      }

      const port = address.port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      // Build the authorization URL
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'consent',
      });

      const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

      // Open browser for user to sign in
      shell.openExternal(authUrl);

      // Set a timeout - close server after 5 minutes
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('OAuth timeout - no callback received within 5 minutes'));
      }, 5 * 60 * 1000);

      server.on('request', async (req, res) => {
        try {
          const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
          if (url.pathname !== '/callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body><h2>Authorization failed</h2><p>You can close this tab.</p></body></html>');
            clearTimeout(timeout);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<html><body><h2>Missing authorization code</h2></body></html>');
            clearTimeout(timeout);
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          // Exchange auth code for tokens
          const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier, config.clientId);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Connected!</h2><p>Nexus is now connected to Google Calendar. You can close this tab.</p></body></html>');

          clearTimeout(timeout);
          server.close();
          resolve(tokens);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Error</h2><p>Something went wrong.</p></body></html>');
          clearTimeout(timeout);
          server.close();
          reject(err);
        }
      });
    });
  });
}

async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string,
  clientId: string,
): Promise<StoredTokens> {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokens(tokens);
  return tokens;
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshAccessToken(clientId: string): Promise<StoredTokens | null> {
  const tokens = loadTokens();
  if (!tokens?.refresh_token) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    // If refresh fails, clear tokens (user needs to re-authorize)
    clearTokens();
    return null;
  }

  const data = await response.json() as {
    access_token: string;
    expires_in: number;
  };

  const updated: StoredTokens = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token, // Refresh token doesn't change
    expires_at: Date.now() + data.expires_in * 1000,
  };

  saveTokens(updated);
  return updated;
}

/**
 * Get a valid access token, refreshing if expired.
 */
export async function getValidAccessToken(clientId: string): Promise<string | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  // If token expires within 5 minutes, refresh it
  if (tokens.expires_at - Date.now() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(clientId);
    return refreshed?.access_token || null;
  }

  return tokens.access_token;
}

export function isConnected(): boolean {
  return loadTokens() !== null;
}

export function disconnect(): void {
  clearTokens();
}
