// services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor để thêm token vào header
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

// Auth API
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getCurrentUser: () => api.get('/auth/me'),
};

// Branch API
export const branchAPI = {
    getAll: () => api.get('/branches'),
    getById: (id) => api.get(`/branches/${id}`),
};

// Food API
export const foodAPI = {
    getAll: () => api.get('/foods'),
    getByCategory: (categoryId) => api.get(`/foods/category/${categoryId}`),
    getById: (id) => api.get(`/foods/${id}`),
    search: (keyword) => api.get(`/foods/search?keyword=${keyword}`),
};

// Category API
export const categoryAPI = {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
};

// Branch Food API (lấy món theo chi nhánh kèm khuyến mãi)
export const branchFoodAPI = {
    getByBranch: (branchId) => api.get(`/branch-foods/branch/${branchId}`),
    getWithPromotions: (branchId) => api.get(`/branch-foods/branch/${branchId}/with-promotions`),
};

// Order API
export const orderAPI = {
    getAll: () => api.get('/customer/orders'),
    getById: (id) => api.get(`/customer/orders/${id}`),
    create: (orderData) => api.post('/customer/orders', orderData),
    addItems: (orderId, items) => api.post(`/customer/orders/${orderId}/add-items`, items),
    updateStatus: (orderId, status, paymentMethod) =>
        api.put(`/customer/orders/${orderId}/status?status=${status}&paymentMethod=${paymentMethod || 'CASH'}`),
    prepare: (orderId) => api.put(`/customer/orders/${orderId}/prepare`),
    complete: (orderId) => api.put(`/customer/orders/${orderId}/complete`),
    pay: (orderId, paymentMethod) =>
        api.put(`/customer/orders/${orderId}/pay?paymentMethod=${paymentMethod}`),
    cancel: (orderId) => api.put(`/customer/orders/${orderId}/cancel`),
};

// Order Item API (cho bếp)
export const orderItemAPI = {
    getAll: () => api.get('/kitchen/order-items'),
    getById: (id) => api.get(`/kitchen/order-items/${id}`),
    updateStatus: (id, status) => api.put(`/kitchen/order-items/${id}`, { status }),
};

// Bill API
export const billAPI = {
    getAll: () => api.get('/employee/bills'),
    getById: (id) => api.get(`/employee/bills/${id}`),
    create: (billData) => api.post('/employee/bills', billData),
    export: (id) => api.get(`/employee/bills/${id}/export`, { responseType: 'blob' }),
};

export const roomAPI = {
    getByBranch: (branchId) => api.get(`/rooms/branch/${branchId}`),
    getAvailable: (branchId) => api.get(`/rooms/available/${branchId}`),
    getById: (id) => api.get(`/rooms/${id}`),
    updateStatus: (id, status) => api.put(`/rooms/${id}/status?status=${status}`),
};

// Table API
export const tableAPI = {
    getAll: () => api.get('/tables'),
    getByBranchAndArea: (branchId, area) => api.get(`/tables/branch/${branchId}/area/${area}`),
    getAreasByBranch: (branchId) => api.get(`/tables/branch/${branchId}/areas`),
    getById: (id) => api.get(`/tables/${id}`),
    occupy: (id) => api.put(`/tables/${id}/occupy`),
    free: (id) => api.put(`/tables/${id}/free`),
};

export const kitchenAPI = {
    // ĐÚNG: backend có /api/kitchen/queue
    getQueue: () => api.get('/kitchen/queue'),

    // ĐÚNG: backend có /api/kitchen/order-items/{id}/status
    updateItemStatus: (id, status) => api.put(`/kitchen/order-items/${id}/status?status=${status}`),

    // THÊM: lấy danh sách order items (dùng queue thay vì order-items)
    getOrderItems: () => api.get('/kitchen/queue'),  // Dùng queue endpoint
};
export default api;