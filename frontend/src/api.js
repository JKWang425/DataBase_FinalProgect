// 簡單的 Axios 實例，可在整個前端共用
import axios from 'axios';

// 使用 Vite env var `VITE_API_URL`（可在 .env 中設定）或回退到 localhost:4000
const backendBase = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:4000'
const api = axios.create({
  baseURL: backendBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 攔截器：每次請求自動將 localStorage 的 token 放到 Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
