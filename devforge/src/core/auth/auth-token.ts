/**
 * ⚡ DEVFORGE Auth Token & Session Manager
 * Lightweight, zero-dependency token storage and JWT expiration helper.
 */

const ACCESS_TOKEN_KEY = 'devforge_access_token';
const REFRESH_TOKEN_KEY = 'devforge_refresh_token';

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  setSession(accessToken: string, refreshToken?: string): void {
    this.setAccessToken(accessToken);
    if (refreshToken) this.setRefreshToken(refreshToken);
  },

  clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Decodes JWT payload without validating signature (client-side only for exp check).
   */
  isTokenExpired(token: string | null = tokenStorage.getAccessToken()): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      const nowInSeconds = Math.floor(Date.now() / 1000);
      // Give a 15-second buffer
      return payload.exp < nowInSeconds + 15;
    } catch {
      return true;
    }
  }
};
