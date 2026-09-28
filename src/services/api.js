import axios from 'axios';

// Thay đổi URL này thành URL của Backend khi bên đó chạy (ví dụ http://localhost:5000)
const API_BASE_URL = 'http://localhost:5000/api';

export const ticketService = {
  // Gửi tạo phiếu mới sang backend
  createTicket: async (ticketData) => {
    const res = await axios.post(`${API_BASE_URL}/tickets`, ticketData);
    return res.data;
  },

  // Lấy chi tiết phiếu theo ID khi quét mã QR
  getTicketById: async (id) => {
    const res = await axios.get(`${API_BASE_URL}/tickets/${id}`);
    return res.data;
  },
};