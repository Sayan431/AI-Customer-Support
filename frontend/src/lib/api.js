// ── API client ──────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getTokens() {
  try {
    return JSON.parse(localStorage.getItem('signal_auth') || 'null');
  } catch {
    return null;
  }
}

function setTokens(tokens) {
  if (tokens) localStorage.setItem('signal_auth', JSON.stringify(tokens));
  else localStorage.removeItem('signal_auth');
}

let refreshPromise = null;

async function request(path, { method = 'GET', body, form, auth = true, retry = true } = {}) {
  const headers = {};
  let payload = body;

  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = new URLSearchParams(body).toString();
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (auth) {
    const tokens = getTokens();
    if (tokens?.access_token) headers['Authorization'] = `Bearer ${tokens.access_token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });

  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, form, auth, retry: false });
  }

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || res.statusText || 'Request failed';
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function tryRefresh() {
  const tokens = getTokens();
  if (!tokens?.refresh_token) return false;
  if (!refreshPromise) {
    refreshPromise = request('/auth/refresh', {
      method: 'POST',
      body: { refresh_token: tokens.refresh_token },
      auth: false,
      retry: false,
    })
      .then((data) => { setTokens(data); return true; })
      .catch(() => { setTokens(null); return false; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export const api = {
  setTokens,
  getTokens,

  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', form: true, body: { username: email, password }, auth: false }),
  me: () => request('/auth/me'),

  // Tickets
  listTickets: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return request(`/tickets${qs ? `?${qs}` : ''}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (payload) => request('/tickets', { method: 'POST', body: payload }),
  updateTicket: (id, payload) => request(`/tickets/${id}`, { method: 'PATCH', body: payload }),
  addMessage: (id, payload) => request(`/tickets/${id}/messages`, { method: 'POST', body: payload }),
  assignTicket: (id, agentId) => request(`/tickets/${id}/assign?agent_id=${agentId}`, { method: 'POST' }),

  // AI
  summarizeTicket: (ticket_id) => request('/ai/summarize', { method: 'POST', body: { ticket_id } }),
  autoResponse: (ticket_id, tone, include_solution = true) =>
    request('/ai/auto-response', { method: 'POST', body: { ticket_id, tone, include_solution } }),
  bulkSummarize: (ticket_ids) => request('/ai/bulk-summarize', { method: 'POST', body: ticket_ids }),

  // Chatbot
  sendChatMessage: (message, conversation_id) =>
    request('/chatbot/message', { method: 'POST', body: { message, conversation_id: conversation_id || null } }),
  listConversations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/chatbot/conversations${qs ? `?${qs}` : ''}`);
  },
  getConversation: (id) => request(`/chatbot/conversations/${id}`),
  deleteConversation: (id) => request(`/chatbot/conversations/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboard: (days = 30) => request(`/analytics/dashboard?days=${days}`),
};

export class ApiError extends Error {}
