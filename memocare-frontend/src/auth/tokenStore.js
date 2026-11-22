// Token handling.
//  - The short-lived ACCESS token lives in memory only (never persisted).
//  - The rotating REFRESH token lives in sessionStorage so a page reload does
//    not log the user out, while closing the tab does. (The backend rotates the
//    refresh token on every use and stores only its hash.)
const REFRESH_KEY = "memocare.refreshToken";

let accessToken = null;

function safeSession() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => safeSession()?.getItem(REFRESH_KEY) ?? null,
  setTokens({ accessToken: access, refreshToken }) {
    accessToken = access ?? null;
    if (refreshToken) safeSession()?.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    accessToken = null;
    safeSession()?.removeItem(REFRESH_KEY);
  },
};
