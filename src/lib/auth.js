const BASE = '';

async function post(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

async function get(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function del(url, token) {
  const res = await fetch(BASE + url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

async function patch(url, body, token) {
  const res = await fetch(BASE + url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler');
  return data;
}

export const apiSetupRequired  = ()              => get('/api/setup').then(d => d?.setupRequired ?? false);
export const apiSetup          = (u, p)          => post('/api/setup', { username: u, password: p });
export const apiLogin          = (u, p)          => post('/api/login', { username: u, password: p });
export const apiMe             = (t)             => get('/api/me', t);
export const apiChangePassword = (t, p)          => post('/api/me/password', { password: p }, t);
export const apiGetUsers       = (t)             => get('/api/users', t);
export const apiCreateUser     = (t, d)          => post('/api/users', d, t);
export const apiUpdateUser     = (t, id, d)      => patch(`/api/users/${id}`, d, t);
export const apiDeleteUser     = (t, id)         => del(`/api/users/${id}`, t);
export const apiInviteUser     = (t, id)         => post(`/api/users/${id}/invite`, {}, t);
export const apiResetPassword  = (t, id)         => post(`/api/users/${id}/reset-password`, {}, t);
export const apiGetSmtp        = (t)             => get('/api/config/smtp', t);
export const apiSaveSmtp       = (t, d)          => post('/api/config/smtp', d, t);
export const apiTestSmtp       = (t, to)         => post('/api/config/smtp/test', { to }, t);
export const apiRedeemInvite   = (token, p)      => post(`/invite/${token}`, { password: p });

export const getToken  = ()  => sessionStorage.getItem('auth_token');
export const saveToken = (t) => sessionStorage.setItem('auth_token', t);
export const clearToken = () => sessionStorage.removeItem('auth_token');
