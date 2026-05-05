import axios, { AxiosHeaders } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('evtag_token');
  const role = localStorage.getItem('evtag_user_role');
  const selectedCompanyId = localStorage.getItem('evtag_selected_company_id');
  const deviceId = localStorage.getItem('evtag_device_id');

  const headers = AxiosHeaders.from(config.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  if (role === 'SUPER_ADMIN' && selectedCompanyId) {
    headers.set('x-company-id', selectedCompanyId);
  } else {
    headers.delete('x-company-id');
  }

  if (deviceId) {
    headers.set('x-device-id', deviceId);
  } else {
    headers.delete('x-device-id');
  }

  config.headers = headers;

  return config;
});
