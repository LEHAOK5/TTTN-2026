import axios from 'axios';

// Đổi port theo port thực tế mà backend chạy 
const API_BASE_URL = 'http://10.50.195.212:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
};

export const appointmentApi = {
  getAllAppointments: async () => {
    const response = await apiClient.get('/appointments');
    return response.data;
  },

  createAppointment: async (appointmentData) => {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  },

  updateAppointment: async (id, data) => {
    const response = await apiClient.patch(`/appointments/${id}`, data);
    return response.data;
  },
};

export const ticketApi = {
  // Lấy danh sách máy cho Dashboard
  getAllTickets: async () => {
    const response = await apiClient.get('/tickets');
    return response.data;
  },

  // Tạo phiếu tiếp nhận mới & nhận mã QR
  createTicket: async (ticketData) => {
    const response = await apiClient.post('/tickets', ticketData);
    return response.data;
  },

  verifyTicketToken: async ({ token, id }) => {
    const verifyPath = import.meta.env.VITE_TICKET_VERIFY_PATH || '/tickets/verify-token';
    const verifyMethod = (import.meta.env.VITE_TICKET_VERIFY_METHOD || 'GET').toUpperCase();
    const params = { token, id };
    const response = verifyMethod === 'POST'
      ? await apiClient.post(verifyPath, params)
      : await apiClient.get(verifyPath, { params });
    return response.data;
  },

  submitTicketDetails: async (ticketData) => {
    const submitPath = import.meta.env.VITE_TICKET_SUBMIT_PATH || '/tickets/submit';
    const response = await apiClient.post(submitPath, ticketData);
    return response.data;
  },

  // Tra cứu tiến độ khi quét mã QR
  getTicketById: async (id) => {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  },

  // Kỹ thuật viên đổi trạng thái / cập nhật ghi chú
  updateTicketStatus: async (id, data) => {
    const response = await apiClient.patch(`/tickets/${id}`, data);
    return response.data;
  },
};