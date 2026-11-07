// --- Core shapes ------------------------------------------------------------

// One active login session as returned by the backend. `browser`/`os` are
// parsed server-side from the User-Agent; null means "unknown device".
// The session's IP address intentionally never leaves the backend.
export interface SessionItem {
  id: string;
  browser: string | null;
  os: string | null;
  created_at: string;
  last_used_at: string;
  // True only on /users/me/sessions for the session making the request;
  // always false in the admin view.
  is_current: boolean;
}

export interface SessionListResponse {
  data: SessionItem[];
  total: number;
  skip: number;
  limit: number;
}

// --- Query params -----------------------------------------------------------

export interface SessionListParams {
  skip?: number;
  limit?: number;
}

// --- Response wrappers ------------------------------------------------------

export interface SessionsRevokedResponse {
  revoked: number;
  message: string;
}
