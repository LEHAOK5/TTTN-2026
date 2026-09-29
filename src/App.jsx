import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Monitor, QrCode, Search, Printer, CheckCircle2, 
  AlertCircle, Wrench, ArrowRight, Camera, 
  ListFilter, LayoutDashboard, PlusCircle, X,
  Lock, LogIn, LogOut, Phone, ShieldCheck
} from 'lucide-react';

export default function App() {
  // Trạng thái đăng nhập nhân viên
  const [currentUser, setCurrentUser] = useState(null); // null nếu là khách, có object nếu là nhân viên
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Tab điều hướng: 'lookup' (mặc định cho khách) | 'dashboard' | 'create' | 'scan' | 'detail'
  const [activeTab, setActiveTab] = useState('lookup');

  // Kiểu tra cứu của khách: 'phone' hoặc 'ticketId'
  const [lookupType, setLookupType] = useState('phone');
  const [lookupInput, setLookupInput] = useState('');
  const [customerTickets, setCustomerTickets] = useState([]);
  const [lookupSearched, setLookupSearched] = useState(false);

  // Dữ liệu mẫu hệ thống
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
      technicianNote: 'Đã vệ sinh socket, test nguồn khác, đang kiểm tra VRM.',
    },
    {
      id: 'TICKET-209481',
      customerName: 'Trần Thị Thu Thảo',
      phone: '0988776655',
      serviceType: 'Phần mềm',
      deviceName: 'Laptop Dell XPS 13',
      issueDescription: 'Lỗi màn hình xanh (BSOD) khi mở phần mềm đồ họa',
      status: 'checking',
      createdAt: '28/09/2026 10:30',
      technicianNote: 'Đang trích xuất file dump để kiểm tra xung đột driver.',
    },
    {
      id: 'TICKET-301928',
      customerName: 'Nguyễn Văn Hùng',
      phone: '0901234567',
      serviceType: 'Phần cứng',
      deviceName: 'Màn hình LG 27 inch 144Hz',
      issueDescription: 'Chập chờn cổng DisplayPort, nguồn bật lúc lên lúc không',
      status: 'completed',
      createdAt: '27/09/2026 14:00',
      technicianNote: 'Đã thay thế cổng DisplayPort mới, test 24h hoạt động ổn định.',
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

  // Xử lý quét Camera QR
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

  // Xử lý đăng nhập nội bộ (Demo: admin / 123456)
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.username === 'admin' && loginForm.password === '123456') {
      setCurrentUser({ name: 'Kỹ Thuật Viên Trực Quầy', role: 'admin' });
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      setLoginError('');
      setActiveTab('dashboard');
    } else {
      setLoginError('Sai tài khoản hoặc mật khẩu! (Thử: admin / 123456)');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('lookup');
  };

  // Tra cứu dành cho khách hàng
  const handleCustomerLookup = (e) => {
    e.preventDefault();
    setLookupSearched(true);
    const query = lookupInput.trim().toLowerCase();

    if (lookupType === 'phone') {
      const matched = tickets.filter(t => t.phone.trim().includes(query));
      setCustomerTickets(matched);
    } else {
      const matched = tickets.filter(t => t.id.toLowerCase() === query);
      setCustomerTickets(matched);
    }
  };

  // Tạo phiếu mới
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
      technicianNote: 'Thiết bị mới tiếp nhận tại quầy tiếp đón.',
    };

    setTickets([newTicket, ...tickets]);
    setCurrentCreatedTicket(newTicket);
  };

  // Cập nhật trạng thái
  const handleUpdateStatus = (ticketId, newStatus, newNote) => {
    if (!currentUser) return; // Chỉ nhân viên mới có quyền cập nhật

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
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-semibold">Đang xử lý</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-semibold">Sẵn sàng giao</span>;
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
    <div className="app-root min-h-screen text-slate-800 p-3 md:p-6">
      <div className="app-shell max-w-6xl mx-auto space-y-6">

        {/* Thanh Header Điều Hướng */}
        <header className="app-header bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="app-brand flex items-center gap-3">
            <div className="app-brand-icon p-2.5 bg-blue-600 text-white rounded-xl shadow">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Cổng Tiếp Nhận & Tra Cứu Bảo Hành Thiết Bị</h1>
              <p className="text-xs text-slate-500">Tra cứu tiến độ qua mã QR / SĐT & Quản lý điều phối sửa chữa</p>
            </div>
          </div>

          <div className="app-header-controls flex items-center gap-2">
            {/* Chuyển các tab theo quyền */}
            <div className="app-navigation flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs md:text-sm font-semibold">
              <button
                onClick={() => setActiveTab('lookup')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'lookup' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-4 h-4" /> <span className="app-nav-label">Khách tra cứu</span>
              </button>

              <button
                onClick={() => { setActiveTab('scan'); setScannerError(''); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'scan' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" /> <span className="app-nav-label">Quét QR</span>
              </button>

              {/* Chỉ kỹ thuật viên đã đăng nhập mới thấy Tab Quản lý & Tạo phiếu */}
              {currentUser && (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                      activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> <span className="app-nav-label">Dashboard</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                      activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> <span className="app-nav-label">Tạo phiếu</span>
                  </button>
                </>
              )}
            </div>

            {/* Nút Đăng nhập / Đăng xuất Kỹ thuật viên */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded hidden md:inline-block">
                  KTV: {currentUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" /> Đăng Nhập KTV
              </button>
            )}
          </div>
        </header>

        {/* MODAL ĐĂNG NHẬP NỘI BỘ */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative border border-slate-200">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Đăng Nhập Kỹ Thuật Viên</h3>
                <p className="text-xs text-slate-500 mt-1">Dành riêng cho nhân viên tiếp nhận & sửa chữa</p>
              </div>

              {loginError && (
                <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tài khoản</label>
                  <input
                    type="text"
                    required
                    placeholder="Tài khoản (admin)"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    placeholder="Mật khẩu (123456)"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition mt-2 flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" /> Đăng Nhập
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 1. TAB KHÁCH HÀNG TRA CỨU TIẾN ĐỘ (HỖ TRỢ THEO SĐT HOẶC MÃ PHIẾU) */}
        {activeTab === 'lookup' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Tra Cứu Tình Trạng Thiết Bị</h2>
              <p className="text-xs text-slate-500 mb-5">Nhập số điện thoại để xem toàn bộ máy đang sửa, hoặc nhập chính xác mã phiếu</p>

              {/* Nút chọn kiểu tra cứu */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
                <button
                  onClick={() => { setLookupType('phone'); setCustomerTickets([]); setLookupSearched(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
                    lookupType === 'phone' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Tra cứu theo Số Điện Thoại
                </button>
                <button
                  onClick={() => { setLookupType('ticketId'); setCustomerTickets([]); setLookupSearched(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${
                    lookupType === 'ticketId' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" /> Tra cứu theo Mã Phiếu
                </button>
              </div>

              {/* Form tìm kiếm */}
              <form onSubmit={handleCustomerLookup} className="flex gap-2 max-w-lg mx-auto">
                <input
                  type="text"
                  required
                  placeholder={lookupType === 'phone' ? 'Ví dụ: 0901234567' : 'Ví dụ: TICKET-104921'}
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 transition"
                >
                  <Search className="w-4 h-4" /> Tra Cứu
                </button>
              </form>
            </div>

            {/* Kết quả danh sách máy tìm thấy của khách */}
            {lookupSearched && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700">
                  Kết quả tra cứu ({customerTickets.length} thiết bị):
                </h3>

                {customerTickets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customerTickets.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition cursor-pointer flex flex-col justify-between"
                        onClick={() => { setSelectedTicket(item); setActiveTab('detail'); }}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {item.id}
                            </span>
                            {getStatusBadge(item.status)}
                          </div>
                          <h4 className="font-bold text-slate-800 text-base">{item.deviceName}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">Lỗi: {item.issueDescription}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span>Ngày nhận: {item.createdAt}</span>
                          <span className="text-blue-600 font-semibold flex items-center gap-1">
                            Xem tiến độ <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Không tìm thấy thiết bị nào khớp với thông tin bạn nhập.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. TAB QUÉT CAMERA QR */}
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

        {/* 3. TAB DASHBOARD DÀNH RIÊNG CHO KỸ THUẬT VIÊN */}
        {activeTab === 'dashboard' && currentUser && (
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
                <p className="text-xs text-emerald-600 font-semibold">Đã xong</p>
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
                            Xử lý
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. TAB TẠO PHIẾU TIẾP NHẬN & TEM IN QR */}
        {activeTab === 'create' && currentUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" />
                Lập Phiếu Tiếp Nhận Máy
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
                      placeholder="Dell Latitude, PC i7..."
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
                    placeholder="Máy bật không lên nguồn, sập nguồn liên tục..."
                    value={formData.issueDescription}
                    onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <QrCode className="w-5 h-5" /> Tạo Phiếu & Xuất Mã QR
                </button>
              </form>
            </div>

            {/* Tem dán mã QR */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
              {currentCreatedTicket ? (
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm mb-3">
                    <CheckCircle2 className="w-5 h-5" /> Tạo phiếu thành công!
                  </div>

                  <div className="border-2 border-dashed border-slate-400 bg-slate-50 p-4 rounded-xl w-full max-w-xs flex flex-col items-center text-center shadow-sm">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      TEM BẢO HÀNH & SỬA CHỮA
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
                      <p><span className="font-semibold text-slate-500">Khách:</span> {currentCreatedTicket.customerName}</p>
                      <p><span className="font-semibold text-slate-500">Thiết bị:</span> {currentCreatedTicket.deviceName}</p>
                      <p><span className="font-semibold text-slate-500">Ngày lập:</span> {currentCreatedTicket.createdAt}</p>
                    </div>
                  </div>

                  <div className="w-full mt-4 flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Printer className="w-4 h-4" /> In Tem Dán
                    </button>
                    <button
                      onClick={() => { setSelectedTicket(currentCreatedTicket); setActiveTab('detail'); }}
                      className="flex-1 border border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition"
                    >
                      Chi Tiết <ArrowRight className="w-4 h-4" />
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

        {/* 5. TAB XEM TIẾN ĐỘ CHI TIẾT CỦA 1 MÁY */}
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
                onClick={() => setActiveTab(currentUser ? 'dashboard' : 'lookup')}
                className="self-start md:self-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg"
              >
                <X className="w-3.5 h-3.5" /> Đóng
              </button>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                Tiến Độ Sửa Chữa {currentUser ? '(Kỹ thuật viên nhấp để cập nhật)' : ''}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {steps.map((st, idx) => {
                  const currentIdx = steps.findIndex(s => s.key === selectedTicket.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={st.key}
                      disabled={!currentUser} // Khách chỉ được xem, không được bấm đổi
                      onClick={() => handleUpdateStatus(selectedTicket.id, st.key)}
                      className={`p-3 rounded-xl border text-center transition ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                          : isDone
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      } ${currentUser ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                    >
                      <div className="text-xs">{st.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 className="text-xs font-bold uppercase text-slate-600 mb-1">Mô tả sự cố từ khách:</h5>
                <p className="text-sm text-slate-800">{selectedTicket.issueDescription}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <h5 className="text-xs font-bold uppercase text-blue-900 mb-1">
                  Nhật ký kỹ thuật viên:
                </h5>
                {currentUser ? (
                  <textarea
                    rows="2"
                    className="w-full text-sm bg-white border border-blue-300 rounded p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                    value={selectedTicket.technicianNote}
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, selectedTicket.status, e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-slate-800">{selectedTicket.technicianNote}</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}