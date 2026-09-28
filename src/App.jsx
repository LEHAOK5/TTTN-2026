import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Monitor, QrCode, Search, Printer, CheckCircle2, 
  AlertCircle, Wrench, ArrowRight, Camera, 
  ListFilter, LayoutDashboard, PlusCircle, X 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [tickets, setTickets] = useState([
    {
      id: 'TICKET-104921',
      customerName: 'Nguyễn Văn Hùng',
      phone: '0901234567',
      serviceType: 'Phần cứng',
      deviceName: 'PC Gaming MSI i5 13400F',
      issueDescription: 'Bật nguồn quạt quay nhưng không lên hình, báo đèn đỏ CPU',
      status: 'fixing',
      createdAt: '28/09/2026 09:15',
      technicianNote: 'Đã vệ sinh socket, test thử với nguồn khác, đang đo nguồn cấp VRM.',
    },
    {
      id: 'TICKET-209481',
      customerName: 'Trần Thị Thu Thảo',
      phone: '0988776655',
      serviceType: 'Phần mềm',
      deviceName: 'Laptop Dell XPS 13',
      issueDescription: 'Lỗi màn hình xanh (BSOD) khi mở Photoshop, nghi virus',
      status: 'checking',
      createdAt: '28/09/2026 10:30',
      technicianNote: 'Đang kiểm tra dump file và quét mã độc hệ thống.',
    },
    {
      id: 'TICKET-301928',
      customerName: 'Lê Hoàng Nam',
      phone: '0934112233',
      serviceType: 'Phần cứng',
      deviceName: 'VGA RTX 3060 Asus',
      issueDescription: 'Cháy 1 chân nguồn phụ, quạt tản nhiệt bị gãy',
      status: 'completed',
      createdAt: '27/09/2026 14:00',
      technicianNote: 'Đã thay jack cấp nguồn 8-pin và thay quạt tản nhiệt mới. Test Furmark ổn định.',
    }
  ]);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    serviceType: 'Phần cứng',
    deviceName: '',
    issueDescription: '',
  });

  const [currentCreatedTicket, setCurrentCreatedTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [scannerError, setScannerError] = useState('');

  // Xử lý quét Camera QR an toàn không crash
  useEffect(() => {
    let scanner = null;
    if (activeTab === 'scan') {
      const timer = setTimeout(() => {
        const element = document.getElementById('reader');
        if (element) {
          scanner = new Html5QrcodeScanner(
            'reader',
            { fps: 10, qrbox: { width: 220, height: 220 } },
            false
          );

          scanner.render(
            (decodedText) => {
              const cleanId = decodedText.trim();
              const found = tickets.find((t) => t.id.toLowerCase() === cleanId.toLowerCase());
              if (found) {
                if (scanner) {
                  scanner.clear().catch(() => {});
                }
                setSelectedTicket(found);
                setActiveTab('detail');
              } else {
                setScannerError(`Không tìm thấy thiết bị có mã: ${cleanId}`);
              }
            },
            () => {}
          );
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(() => {});
        }
      };
    }
  }, [activeTab, tickets]);

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!formData.phone.match(/^[0-9]{10,11}$/)) {
      alert('Vui lòng nhập đúng định dạng số điện thoại (10 - 11 số)!');
      return;
    }

    const newTicket = {
      ...formData,
      id: 'TICKET-' + Math.floor(100000 + Math.random() * 900000),
      status: 'received',
      createdAt: new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
      technicianNote: 'Thiết bị mới tiếp nhận tại quầy kỹ thuật.',
    };

    setTickets([newTicket, ...tickets]);
    setCurrentCreatedTicket(newTicket);
  };

  const handleUpdateStatus = (ticketId, newStatus, newNote) => {
    setTickets(tickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: newStatus,
          technicianNote: newNote !== undefined ? newNote : t.technicianNote,
        };
      }
      return t;
    }));

    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket(prev => ({
        ...prev,
        status: newStatus,
        technicianNote: newNote !== undefined ? newNote : prev.technicianNote,
      }));
    }
  };

  const steps = [
    { key: 'received', label: '1. Tiếp nhận máy' },
    { key: 'checking', label: '2. Chẩn đoán lỗi' },
    { key: 'fixing', label: '3. Đang xử lý' },
    { key: 'completed', label: '4. Đã hoàn tất' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold">Đã tiếp nhận</span>;
      case 'checking':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">Đang kiểm tra</span>;
      case 'fixing':
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold">Đang sửa chữa</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold">Hoàn thành</span>;
      default:
        return null;
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchKeyword = t.customerName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
                         t.phone.includes(filterKeyword) ||
                         t.id.toLowerCase().includes(filterKeyword.toLowerCase()) ||
                         t.deviceName.toLowerCase().includes(filterKeyword.toLowerCase());
    return matchStatus && matchKeyword;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Thanh Điều Hướng */}
        <header className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Hệ Thống Tiếp Nhận Sửa Chữa Thiết Bị</h1>
              <p className="text-xs text-slate-500">Quản lý và tra cứu tiến độ qua mã QR dán vỏ máy</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs md:text-sm font-semibold">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Bảng Quản Lý
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Tạo Phiếu Mới
            </button>
            <button
              onClick={() => { setActiveTab('scan'); setScannerError(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                activeTab === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" /> Quét Mã QR
            </button>
          </div>
        </header>

        {/* TAB 1: BẢNG ĐIỀU KHIỂN QUẢN LÝ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold">Tổng máy tiếp nhận</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{tickets.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-amber-600 font-semibold">Đang kiểm tra</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">
                  {tickets.filter(t => t.status === 'checking').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-blue-600 font-semibold">Đang sửa chữa</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {tickets.filter(t => t.status === 'fixing').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-emerald-600 font-semibold">Đã hoàn thành</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {tickets.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, mã phiếu..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <ListFilter className="w-4 h-4 text-slate-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="received">Tiếp nhận</option>
                  <option value="checking">Đang kiểm tra</option>
                  <option value="fixing">Đang sửa</option>
                  <option value="completed">Đã xong</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Mã Phiếu</th>
                      <th className="p-3">Khách Hàng</th>
                      <th className="p-3">Thiết Bị</th>
                      <th className="p-3">Dịch Vụ</th>
                      <th className="p-3">Trạng Thái</th>
                      <th className="p-3">Ngày Nhận</th>
                      <th className="p-3 text-right">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-blue-600">{t.id}</td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{t.customerName}</p>
                          <p className="text-xs text-slate-400">{t.phone}</p>
                        </td>
                        <td className="p-3 text-slate-700">{t.deviceName}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            t.serviceType === 'Phần cứng' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {t.serviceType}
                          </span>
                        </td>
                        <td className="p-3">{getStatusBadge(t.status)}</td>
                        <td className="p-3 text-xs text-slate-500">{t.createdAt}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => { setSelectedTicket(t); setActiveTab('detail'); }}
                            className="bg-slate-100 hover:bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                          >
                            Xem & Sửa
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-6 text-center text-slate-400">
                          Không tìm thấy máy nào phù hợp.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TẠO PHIẾU VÀ XEM TEM QR */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                Phiếu Tiếp Nhận Máy
              </h2>

              <form onSubmit={handleCreateTicket} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên khách hàng</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="tel"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Dịch vụ</label>
                    <select
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                    >
                      <option value="Phần cứng">Phần cứng</option>
                      <option value="Phần mềm">Phần mềm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tên máy / Model</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Dell XPS, PC i5..."
                      value={formData.deviceName}
                      onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tình trạng lỗi cụ thể</label>
                  <textarea
                    rows="3"
                    required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Không lên nguồn, treo màn hình xanh, quạt kêu to..."
                    value={formData.issueDescription}
                    onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <QrCode className="w-5 h-5" />
                  Tạo Phiếu & Xuất Mã QR
                </button>
              </form>
            </div>

            {/* Khung hiển thị tem QR dán case */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              {currentCreatedTicket ? (
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm mb-3">
                    <CheckCircle2 className="w-5 h-5" /> Tạo phiếu thành công!
                  </div>

                  <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-4 rounded-xl w-full max-w-xs flex flex-col items-center text-center shadow-sm">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      PHIẾU TIẾP NHẬN SỬA CHỮA
                    </div>
                    <div className="text-base font-black text-blue-700 font-mono my-1">
                      {currentCreatedTicket.id}
                    </div>

                    <div className="p-2 bg-white border border-slate-300 rounded-lg shadow-sm">
                      <QRCodeSVG
                        value={currentCreatedTicket.id}
                        size={140}
                        level="H"
                      />
                    </div>

                    <div className="text-xs text-left w-full space-y-1 mt-2 text-slate-700">
                      <p><span className="font-semibold text-slate-500">Khách hàng:</span> {currentCreatedTicket.customerName}</p>
                      <p><span className="font-semibold text-slate-500">Thiết bị:</span> {currentCreatedTicket.deviceName}</p>
                      <p><span className="font-semibold text-slate-500">Dịch vụ:</span> {currentCreatedTicket.serviceType}</p>
                      <p><span className="font-semibold text-slate-500">Ngày nhận:</span> {currentCreatedTicket.createdAt}</p>
                    </div>
                  </div>

                  <div className="w-full mt-4 flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Printer className="w-4 h-4" /> In Tem Dán Máy
                    </button>
                    <button
                      onClick={() => { setSelectedTicket(currentCreatedTicket); setActiveTab('detail'); }}
                      className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition"
                    >
                      Xem Tiến Độ <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <QrCode className="w-16 h-16 mx-auto mb-3 stroke-1 text-slate-300" />
                  <p className="text-sm">Nhập thông tin bên cạnh để xuất mã QR dán lên thiết bị.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: QUÉT MÃ QR BẰNG CAMERA */}
        {activeTab === 'scan' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-md mx-auto text-center space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Quét Mã QR Bằng Camera
            </h2>
            <p className="text-xs text-slate-500">Đưa camera vào tem QR dán trên case máy tính để mở tiến độ</p>

            <div id="reader" className="overflow-hidden rounded-xl border border-slate-300"></div>

            {scannerError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4" /> {scannerError}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CHI TIẾT & CẬP NHẬT TRẠNG THÁI */}
        {activeTab === 'detail' && selectedTicket && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm">
                    {selectedTicket.id}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedTicket.deviceName}</h3>
                <p className="text-xs text-slate-500">Khách: {selectedTicket.customerName} - {selectedTicket.phone}</p>
              </div>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="self-start md:self-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" /> Đóng
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Tiến Độ Sửa Chữa (Nhấp để chuyển)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {steps.map((st, idx) => {
                  const currentIdx = steps.findIndex(s => s.key === selectedTicket.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={st.key}
                      onClick={() => handleUpdateStatus(selectedTicket.id, st.key)}
                      className={`p-3 rounded-xl border text-center transition ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                          : isDone
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs">{st.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 className="text-xs font-bold uppercase text-slate-600 mb-1">Mô tả lỗi từ khách hàng:</h5>
                <p className="text-sm text-slate-800">{selectedTicket.issueDescription}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h5 className="text-xs font-bold uppercase text-blue-900 mb-1">
                  Nhật ký xử lý kỹ thuật:
                </h5>
                <textarea
                  rows="2"
                  className="w-full text-sm bg-white border border-blue-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                  value={selectedTicket.technicianNote}
                  onChange={(e) => handleUpdateStatus(selectedTicket.id, selectedTicket.status, e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}