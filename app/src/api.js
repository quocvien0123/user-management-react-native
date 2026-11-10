import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Nếu tự dò địa chỉ không được (vd. dùng tunnel), điền tay IP máy tính chạy backend:
// const MANUAL_API_URL = 'http://192.168.1.10:5000';
const MANUAL_API_URL = '';

function detectHost() {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  }
  // Khi chạy bằng Expo Go, hostUri có dạng "192.168.1.10:8081" -> lấy IP máy tính
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  const host = hostUri.split(':')[0];
  if (host) return host;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

export const API_URL = MANUAL_API_URL || `http://${detectHost()}:5000`;

let token = null;
export const setToken = (t) => {
  token = t;
};

export function imageUrl(hinhanh) {
  if (!hinhanh) return null;
  if (/^(https?:|data:|file:|blob:)/.test(hinhanh)) return hinhanh;
  return API_URL + hinhanh;
}

async function request(path, { method = 'GET', json } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }

  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body });
  } catch (e) {
    throw new Error(`Không kết nối được server (${API_URL}). Kiểm tra backend đã chạy chưa.`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Lỗi ${res.status}`);
  return data;
}

// fields: { email, hoten, matkhau }, hinhanh: chuỗi base64 "data:image/jpeg;base64,..." (hoặc undefined = giữ nguyên)
function buildBody(fields, hinhanh) {
  const body = { email: fields.email, hoten: fields.hoten };
  if (fields.matkhau) body.matkhau = fields.matkhau;
  if (hinhanh !== undefined) body.hinhanh = hinhanh;
  return body;
}

export const api = {
  login: (email, matkhau) => request('/api/auth/login', { method: 'POST', json: { email, matkhau } }),
  getUsers: ({ q = '', sort = '', order = 'desc', page = 1, limit = 8 } = {}) =>
    request(`/api/users?q=${encodeURIComponent(q)}&sort=${sort}&order=${order}&page=${page}&limit=${limit}`),
  getUser: (id) => request(`/api/users/${id}`),
  // Hồ sơ của chính mình (dành cho mọi người dùng, kể cả không phải admin)
  getMe: () => request('/api/auth/me'),
  updateMe: (body) => request('/api/auth/me', { method: 'PUT', json: body }),
  createUser: (fields, hinhanh) => request('/api/users', { method: 'POST', json: buildBody(fields, hinhanh) }),
  updateUser: (id, fields, hinhanh) => request(`/api/users/${id}`, { method: 'PUT', json: buildBody(fields, hinhanh) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  exportUsers: () => request('/api/users/export'),
  getStats: () => request('/api/users/stats'),
  // users: [{ email, matkhau, hoten, hinhanh }] -> { created, failed, errors: [{ row, email, message }] }
  importUsers: (users) => request('/api/users/import', { method: 'POST', json: { users } }),
};
