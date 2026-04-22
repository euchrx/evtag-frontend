import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('evtag_token');
  const role = localStorage.getItem('evtag_user_role');
  const selectedCompanyId = localStorage.getItem('evtag_selected_company_id');

  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (role === 'SUPER_ADMIN' && selectedCompanyId) {
    config.headers['x-company-id'] = selectedCompanyId;
  }

  return config;
});