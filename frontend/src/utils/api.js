import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh-token', { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (mobile) => api.post('/auth/forgot-password', { mobile }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const associateAPI = {
  getAll: (params) => api.get('/associates', { params }),
  getOne: (id) => api.get(`/associates/${id}`),
  create: (data) => api.post('/associates', data),
  update: (id, data) => api.put(`/associates/${id}`, data),
  resetPassword: (id, data) => api.put(`/associates/${id}/reset-password`, data),
  getDownlineTree: (id) => api.get(id ? `/associates/${id}/downline/tree` : '/associates/downline/tree'),
  getDownlineFlat: (id, params) => api.get(id ? `/associates/${id}/downline` : '/associates/downline', { params }),
};

export const projectAPI = {
  getAll:  (params) => api.get('/projects', { params }),
  getOne:  (id)     => api.get(`/projects/${id}`),
  create:  (data)   => api.post('/projects', data),
  update:  (id, d)  => api.put(`/projects/${id}`, d),
  remove:  (id)     => api.delete(`/projects/${id}`),
};

export const plotAPI = {
  getAll:        (params) => api.get('/plots', { params }),
  getOne:        (id)     => api.get(`/plots/${id}`),
  getSummary:    (params) => api.get('/plots/summary', { params }),
  getFilterOpts: (params) => api.get('/plots/filter-options', { params }),
  create:        (data)   => api.post('/plots', data),
  bulkCreate:    (data)   => api.post('/plots/bulk', data),
  update:        (id, d)  => api.put(`/plots/${id}`, d),
  changeStatus:  (id, d)  => api.patch(`/plots/${id}/status`, d),
  remove:        (id)     => api.delete(`/plots/${id}`),
};

export const customerAPI = {
  getAll:          (params)              => api.get('/customers', { params }),
  getOne:          (id)                  => api.get(`/customers/${id}`),
  create:          (data)                => api.post('/customers', data),
  update:          (id, data)            => api.put(`/customers/${id}`, data),
  cancel:          (id)                  => api.post(`/customers/${id}/cancel`),
  getPayments:     (customerId)          => api.get(`/customers/${customerId}/payments`),
  addPayment:      (customerId, data)    => api.post(`/customers/${customerId}/payments`, data),
  updatePayment:   (customerId, payId, d)=> api.patch(`/customers/${customerId}/payments/${payId}`, d),
  getMonthlyBiz:   (params)              => api.get('/customers/monthly-business', { params }),
};

export const payoutAPI = {
  getAll:         (params)   => api.get('/payouts', { params }),
  getOne:         (id)       => api.get(`/payouts/${id}`),
  create:         (data)     => api.post('/payouts', data),
  approve:        (id)       => api.put(`/payouts/${id}/approve`),
  cancel:         (id, data) => api.put(`/payouts/${id}/cancel`, data),
  recordTransfer: (id, data) => api.post(`/payouts/${id}/bank-transfer`, data),
  getEarnings:    ()         => api.get('/payouts/earnings'),
  preview:        (params)   => api.get('/payouts/preview', { params }),
  getTransfers:   (params)   => api.get('/payouts/transfers', { params }),
};

export const pdfAPI = {
  payoutStatement: (payoutId) =>
    api.get(`/pdf/payout/${payoutId}/statement`, { responseType: 'blob' }),
  bookingReceipt: (customerId) =>
    api.get(`/pdf/booking/${customerId}/receipt`, { responseType: 'blob' }),
  welcomeLetter: (associateId) =>
    api.get(associateId ? `/pdf/welcome-letter/${associateId}` : '/pdf/welcome-letter', { responseType: 'blob' }),
};
