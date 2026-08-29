// api.js — API client with JWT authentication & security interceptors
import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000/uploads';

export const TOKEN_STORAGE_KEY = 'dz_admin_token';
const API_KEY = import.meta.env.VITE_API_KEY;

const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor: Attach shared API key + JWT Bearer Token (if logged in)
api.interceptors.request.use(
  (config) => {
    if (API_KEY) {
      config.headers['X-API-Key'] = API_KEY;
    }
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized (e.g. expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired or invalid token
      const isAuthRoute = error.config?.url?.includes('/auth/login');
      if (!isAuthRoute) {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('dz:auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// Mador Shopping category curated fallback images (Unsplash high-res packshots)
const CATEGORY_FALLBACKS = {
  'complément alimentaire': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
  'pack complément alimentaire': 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=800&q=80',
  'cosmétique bio et naturel': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
  'pack cosmétique': 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80',
  'outils de travail': 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?auto=format&fit=crop&w=800&q=80',
  'make up': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
  makeup: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=800&q=80',
  parfums: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80',
  fragrance: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80',
  home: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
};

// Builds a full image URL from a stored filename, full URL, or elegant beauty fallback
export function productImage(product) {
  if (!product) return CATEGORY_FALLBACKS.default;
  if (product.image) {
    if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
      return product.image;
    }
    return `${UPLOADS_URL}/${product.image}`;
  }
  const catKey = (product.category || '').toLowerCase().trim();
  return CATEGORY_FALLBACKS[catKey] || CATEGORY_FALLBACKS.default;
}

// ----------------- Public Shopper Endpoints -----------------
export const getProducts = (params = {}) => api.get('/products', { params }).then((r) => r.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data);
export const getRandomProducts = (count = 6) =>
  api.get('/products/random', { params: { count } }).then((r) => r.data);
export const getCategories = () => api.get('/products/categories').then((r) => r.data);
export const createOrder = (payload) => api.post('/orders', payload).then((r) => r.data);

// ----------------- Admin Protected Endpoints -----------------
export const addProduct = (formData) =>
  api
    .post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
export const updateProduct = (id, formData) =>
  api
    .put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data);

export const getOrders = () => api.get('/orders').then((r) => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then((r) => r.data);
export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}/status`, { status }).then((r) => r.data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`).then((r) => r.data);
export const updateOrderLogistics = (id, deliveryAgencyId, trackingTag) =>
  api
    .patch(`/orders/${id}/logistics`, { delivery_agency_id: deliveryAgencyId, tracking_tag: trackingTag })
    .then((r) => r.data);

// ----------------- Delivery Agencies & Remittance Ledger Endpoints -----------------
export const getAgencies = () => api.get('/agencies').then((r) => r.data);
export const addAgency = (name) => api.post('/agencies', { name }).then((r) => r.data);
export const deleteAgency = (id) => api.delete(`/agencies/${id}`).then((r) => r.data);

export const getRemittances = () => api.get('/agencies/remittances').then((r) => r.data);
export const createRemittance = (agencyId, orderIds, amount, note) =>
  api
    .post('/agencies/remittances', { agency_id: agencyId, order_ids: orderIds, amount, note })
    .then((r) => r.data);
export const deleteRemittance = (id) => api.delete(`/agencies/remittances/${id}`).then((r) => r.data);

// ----------------- Delivery (Wilaya / Commune / Pricing) Endpoints -----------------
export const getWilayas = () => api.get('/delivery/wilayas').then((r) => r.data);
export const getCommunes = (wilayaCode) =>
  api.get('/delivery/communes', { params: { wilaya_code: wilayaCode } }).then((r) => r.data);
export const getDeliveryPricing = () => api.get('/delivery/pricing').then((r) => r.data);
export const updateDeliveryPricing = (wilayaCode, homeFee, stopdeskFee) =>
  api
    .put(`/delivery/pricing/${wilayaCode}`, { home_fee: homeFee, stopdesk_fee: stopdeskFee })
    .then((r) => r.data);

// ----------------- Finance (Ad/Sponsor Spend) Endpoints -----------------
export const getAdSpend = () => api.get('/finance/ad-spend').then((r) => r.data);
export const addAdSpend = (startDate, endDate, amount, note) =>
  api
    .post('/finance/ad-spend', { start_date: startDate, end_date: endDate, amount, note })
    .then((r) => r.data);
export const deleteAdSpend = (id) => api.delete(`/finance/ad-spend/${id}`).then((r) => r.data);

// ----------------- Auth Endpoints -----------------
export const adminLogin = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);
export const adminMe = () => api.get('/auth/me').then((r) => r.data);
export const adminChangePassword = (currentPassword, newPassword) =>
  api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data);

export default api;
