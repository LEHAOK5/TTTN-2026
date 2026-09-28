import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Monitor, CheckCircle, Printer, Wrench } from 'lucide-react';

export default function App() {
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    deviceType: 'Phần cứng',
    deviceName: '',
    issueDescription: '',
  });

  const [createdTicket, setCreatedTicket] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Tạo mã phiếu tạm thời (khi nối API backend sẽ lấy mã từ database trả về)
    const ticketId = 'TICKET-' + Date.now().toString().slice(-6);
    setCreatedTicket({
      ...formData,
      id: ticketId,
      createdAt: new Date().toLocaleString('vi-VN'),
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-2">
            <Monitor className="w-8 h-8 text-blue-600" />
            Hệ Thống Tiếp Nhận Sửa Chữa Máy Tính
          </h1>
          <p className="text-slate-500 mt-1">Tạo phiếu tiếp nhận thiết bị và sinh mã QR tra cứu</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form tiếp nhận */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-700 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-500" />
              Thông Tin Tiếp Nhận
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nguyễn Văn A"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Loại dịch vụ</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.deviceType}
                    onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  >
                    <option value="Phần cứng">Phần cứng</option>
                    <option value="Phần mềm">Phần mềm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Model / Tên máy</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dell XPS, PC Gaming..."
                    value={formData.deviceName}
                    onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Mô tả tình trạng lỗi</label>
                <textarea
                  rows="3"
                  required
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Không lên nguồn, lỗi Windows, màn hình xanh..."
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <QrCode className="w-5 h-5" />
                Tạo Phiếu Tiếp Nhận & QR Code
              </button>
            </form>
          </div>

          {/* Khu vực hiển thị mã QR */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
            {createdTicket ? (
              <div className="w-full flex flex-col items-center space-y-4">
                <div className="flex items-center gap-2 text-green-600 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Đã tạo phiếu thành công!
                </div>

                <div className="p-4 bg-white border-2 border-slate-800 rounded-xl shadow-inner">
                  <QRCodeSVG
                    value={`https://repair.example.com/status/${createdTicket.id}`}
                    size={170}
                  />
                </div>

                <div className="text-left w-full bg-slate-50 p-3.5 rounded-lg text-sm space-y-1.5 border border-slate-200">
                  <p><strong className="text-slate-700">Mã phiếu:</strong> <span className="text-blue-600 font-mono font-bold">{createdTicket.id}</span></p>
                  <p><strong className="text-slate-700">Khách hàng:</strong> {createdTicket.customerName} ({createdTicket.phone})</p>
                  <p><strong className="text-slate-700">Thiết bị:</strong> {createdTicket.deviceName} ({createdTicket.deviceType})</p>
                  <p><strong className="text-slate-700">Tình trạng:</strong> {createdTicket.issueDescription}</p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  In Phiếu Dán Lên Máy
                </button>
              </div>
            ) : (
              <div className="text-slate-400 flex flex-col items-center p-6">
                <QrCode className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
                <p className="text-sm">Nhập thông tin bên cạnh và bấm "Tạo Phiếu" để xuất mã QR dán lên thiết bị.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}