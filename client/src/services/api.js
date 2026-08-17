import axios from 'axios';

const API_URL = '/api';
const MEDIA_URL = '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data)
};

export const sosAPI = {
  createCase: (formData) => api.post('/sos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  getCases: () => api.get('/sos'),
  getCase: (id) => api.get(`/sos/${id}`),
  updateCase: (id, data) => api.put(`/sos/${id}`, data),
  updateLocation: (id, data) => api.put(`/sos/${id}/location`, data)
};

export const contactsAPI = {
  getContacts: () => api.get('/contacts'),
  addContact: (data) => api.post('/contacts', data),
  updateContact: (id, data) => api.put(`/contacts/${id}`, data),
  deleteContact: (id) => api.delete(`/contacts/${id}`)
};

export const adminAPI = {
  getOverview: () => api.get('/admin/stats/overview'),
  getRegistrations: (days = 30) => api.get(`/admin/stats/registrations?days=${days}`),
  getCasesByDay: (days = 30) => api.get(`/admin/stats/cases-by-day?days=${days}`),
  getCasesByUser: () => api.get('/admin/stats/cases-by-user'),
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getCases: (params = {}) => api.get('/admin/cases', { params }),
  getCase: (id) => api.get(`/admin/cases/${id}`),
  updateCase: (id, data) => api.put(`/admin/cases/${id}`, data),
  getAuditLog: (limit = 200) => api.get(`/admin/audit-log?limit=${limit}`)
};

export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${MEDIA_URL}${path}`;
};

export default api;
