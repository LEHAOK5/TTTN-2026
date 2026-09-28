import axios from 'axios';

// Đổi URL này sang URL thật của Backend khi bên đó bàn giao (ví dụ: http://localhost:5000/api)
const API_BASE_URL = 'http://localhost:5000/api';

// Cấu hình axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const ticketApi = {
  // Lấy danh sách phiếu (hỗ trợ lọc trạng thái và tìm kiếm)
  getAllTickets: async (params) => {
    // Khi có API thật: return (await apiClient.get('/tickets', { params })).data;
    return null;
  },

  // Tạo phiếu mới
  createTicket: async (ticketData) => {
    // Khi có API thật: return (await apiClient.post('/tickets', ticketData)).data;
    return null;
  },

  // Lấy chi tiết phiếu theo ID
  getTicketById: async (id) => {
    // Khi có API thật: return (await apiClient.get(`/tickets/${id}`)).data;
    return null;
  },

  // Cập nhật trạng thái hoặc ghi chú sửa chữa
  updateTicketStatus: async (id, updateData) => {
    // Khi có API thật: return (await apiClient.patch(`/tickets/${id}`, updateData)).data;
    return null;
  }
};