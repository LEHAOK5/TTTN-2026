import axios from 'axios';

// Đổi port theo port thực tế mà backend chạy 
const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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