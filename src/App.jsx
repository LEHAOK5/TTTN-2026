import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { appointmentApi, authApi, ticketApi } from './services/api';
import { 
  Monitor, QrCode, Search, Printer, CheckCircle2, 
  AlertCircle, Wrench, ArrowRight, Camera, 
  ListFilter, LayoutDashboard, PlusCircle, X,
  Lock, LogIn, LogOut, Phone, ShieldCheck, CalendarDays, Clock3
} from 'lucide-react';

const serviceTypes = [
  'Phần cứng',
  'Phần mềm',
  'Vệ sinh / Bảo trì',
  'Nâng cấp thiết bị',
  'Cứu dữ liệu',
  'Cài đặt / Cấu hình',
  'Mạng / Kết nối',
];

const appointmentTimes = ['08:30', '10:00', '13:30', '15:00', '16:30'];

const normalizeAppointment = (appointment) => ({
  ...appointment,
  id: appointment.id || appointment.appointmentId || appointment.AppointmentID,
  customerName: appointment.customerName || appointment.CustomerName,
  phone: appointment.phone || appointment.Phone,
  serviceType: appointment.serviceType || appointment.ServiceType,
  deviceName: appointment.deviceName || appointment.DeviceName,
  date: appointment.date || appointment.Date,
  time: appointment.time || appointment.Time,
  issueDescription: appointment.issueDescription || appointment.IssueDescription,
  status: (appointment.status || appointment.Status || 'pending').toLowerCase(),
});

const normalizeTicket = (ticket) => ({
  ...ticket,
  id: ticket.id || ticket.ID || ticket.ticketId || ticket.TicketID || '',
  customerName: ticket.customerName || ticket.CustomerName || '',
  phone: ticket.phone || ticket.Phone || '',
  serviceType: ticket.serviceType || ticket.ServiceType || '',
  deviceName: ticket.deviceName || ticket.DeviceName || '',
  issueDescription: ticket.issueDescription || ticket.IssueDescription || '',
  status: String(ticket.status || ticket.Status || 'received').toLowerCase(),
  createdAt: ticket.createdAt || ticket.CreatedAt || '',
  technicianNote: ticket.technicianNote || ticket.TechnicianNote || '',
});

const isNotFoundError = (error) => (
  error?.response?.status === 404 || /status code 404/i.test(error?.message || '')
);

const getFriendlyErrorMessage = (error, fallback) => {
  if (!error?.response) {
    if (error?.isAxiosError) return 'Không kết nối được với hệ thống. Vui lòng thử lại.';
    return error?.message || fallback;
  }

  const status = error.response.status;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn chưa được phép thực hiện thao tác này.';
  if (status === 400 || status === 422) return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
  if (status >= 500) return 'Hệ thống đang bận. Vui lòng thử lại sau.';
  return fallback;
};

const unwrapTicketList = (response) => {
  const payload = response?.data ?? response;
  const list = Array.isArray(payload)
    ? payload
    : payload?.tickets || payload?.items || payload?.data?.tickets || payload?.data;
  if (!Array.isArray(list)) {
    throw new Error('Chưa tải được danh sách phiếu. Vui lòng thử lại sau.');
  }
  return list.map(normalizeTicket);
};

const getTicketAccessFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return { token: params.get('token') || '', id: params.get('id') || '' };
};

const unwrapTicketResponse = (response) => {
  const ticket = response?.ticket || response?.data?.ticket || response?.data || response || {};
  return {
    ...ticket,
    id: ticket.id || ticket.ID || ticket.ticketId || ticket.TicketID,
    token: ticket.token || ticket.Token || ticket.accessToken || ticket.access_token,
  };
};

const getLocalDateValue = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null');
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [ticketAccess, setTicketAccess] = useState(getTicketAccessFromUrl);
  const [ticketVerificationStatus, setTicketVerificationStatus] = useState(() => {
    const access = getTicketAccessFromUrl();
    return access.token || access.id ? 'checking' : 'idle';
  });
  const [ticketVerificationError, setTicketVerificationError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    const access = getTicketAccessFromUrl();
    return access.token || access.id ? 'repairForm' : 'lookup';
  });

  const [lookupType, setLookupType] = useState('phone');
  const [lookupInput, setLookupInput] = useState('');
  const [customerTickets, setCustomerTickets] = useState([]);
  const [lookupSearched, setLookupSearched] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketLoadError, setTicketLoadError] = useState('');
  const [ticketActionError, setTicketActionError] = useState('');
  const [updatingTicketId, setUpdatingTicketId] = useState(null);

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    serviceType: 'Phần cứng',
    deviceName: '',
    issueDescription: '',
  });

  const [appointments, setAppointments] = useState([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [appointmentError, setAppointmentError] = useState('');
  const [appointmentForm, setAppointmentForm] = useState({
    customerName: '',
    phone: '',
    serviceType: serviceTypes[0],
    deviceName: '',
    date: '',
    time: '',
    issueDescription: '',
  });
  const [submittedAppointment, setSubmittedAppointment] = useState(null);

  const [currentCreatedTicket, setCurrentCreatedTicket] = useState(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreationError, setTicketCreationError] = useState('');
  const [isStartingCustomerTicket, setIsStartingCustomerTicket] = useState(false);
  const [customerTicketError, setCustomerTicketError] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSubmissionError, setTicketSubmissionError] = useState('');
  const [submittedRepairTicket, setSubmittedRepairTicket] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [scannerError, setScannerError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const loadTickets = async () => {
      setIsLoadingTickets(true);
      setTicketLoadError('');
      try {
        const response = await ticketApi.getAllTickets();
        if (isCurrent) setTickets(unwrapTicketList(response));
      } catch (error) {
        if (isCurrent) {
          if (isNotFoundError(error)) {
            setTickets([]);
            setTicketLoadError('');
            return;
          }
          setTicketLoadError(getFriendlyErrorMessage(error, 'Chưa tải được danh sách phiếu. Vui lòng thử lại sau.'));
        }
      } finally {
        if (isCurrent) setIsLoadingTickets(false);
      }
    };

    loadTickets();
    return () => { isCurrent = false; };
  }, [currentUser]);

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
            async (decodedText) => {
              const cleanId = decodedText.trim();
              if (scanner) scanner.clear().catch(() => {});

              try {
                const scannedUrl = new URL(cleanId);
                const access = {
                  token: scannedUrl.searchParams.get('token') || '',
                  id: scannedUrl.searchParams.get('id') || '',
                };
                if (access.token || access.id) {
                  setTicketAccess(access);
                  setTicketVerificationStatus('checking');
                  window.history.pushState({}, '', `${window.location.pathname}${scannedUrl.search}`);
                  setActiveTab('repairForm');
                  return;
                }
              } catch {
                // QR may contain a plain ticket ID instead of a URL.
              }

              try {
                const response = await ticketApi.getTicketById(cleanId);
                const ticket = normalizeTicket(unwrapTicketResponse(response));
                if (!ticket.id) throw new Error('Không tìm thấy phiếu này.');
                setSelectedTicket(ticket);
                setActiveTab('detail');
              } catch (error) {
                setScannerError(getFriendlyErrorMessage(error, `Không tìm thấy phiếu có mã ${cleanId}.`));
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
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'dashboard' || !currentUser) return undefined;

    let isCurrent = true;
    const loadAppointments = async () => {
      setIsLoadingAppointments(true);
      setAppointmentError('');
      try {
        const response = await appointmentApi.getAllAppointments();
        const appointmentList = Array.isArray(response)
          ? response
          : response.appointments || response.data?.appointments || response.data;
        if (!Array.isArray(appointmentList)) {
          throw new Error('Chưa tải được danh sách lịch hẹn. Vui lòng thử lại sau.');
        }
        if (isCurrent) setAppointments(appointmentList.map(normalizeAppointment));
      } catch (error) {
        if (isCurrent) {
          if (error.response?.status === 404) {
            setAppointments([]);
            return;
          }
          setAppointmentError(getFriendlyErrorMessage(error, 'Chưa tải được lịch hẹn. Vui lòng thử lại sau.'));
        }
      } finally {
        if (isCurrent) setIsLoadingAppointments(false);
      }
    };

    loadAppointments();
    return () => { isCurrent = false; };
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeTab !== 'repairForm') return undefined;

    let isCurrent = true;
    const verifyToken = async () => {
      setTicketVerificationStatus('checking');
      setTicketVerificationError('');
      try {
        const response = await ticketApi.verifyTicketToken({
          token: ticketAccess.token,
          id: ticketAccess.id,
        });
        const result = response?.data || response || {};
        const ticketData = result.ticket || result.data?.ticket || result.data || result;
        const valid = result.valid ?? result.isValid ?? result.Valid ?? result.IsValid ??
          ticketData.valid ?? ticketData.isValid ?? ticketData.Valid ?? ticketData.IsValid;
        const status = String(result.status || result.Status || ticketData.status || ticketData.Status || '').toLowerCase();

        if (valid === false || result.success === false || result.Success === false ||
          ['invalid', 'expired', 'revoked', 'used'].includes(status)) {
          throw new Error('Mã QR không hợp lệ hoặc đã hết hạn.');
        }

        if (isCurrent) {
          setTicketVerificationStatus('valid');
          setFormData((currentForm) => ({
            ...currentForm,
            customerName: ticketData.customerName || ticketData.CustomerName || currentForm.customerName,
            phone: ticketData.phone || ticketData.Phone || currentForm.phone,
            serviceType: ticketData.serviceType || ticketData.ServiceType || currentForm.serviceType,
            deviceName: ticketData.deviceName || ticketData.DeviceName || currentForm.deviceName,
            issueDescription: ticketData.issueDescription || ticketData.IssueDescription || currentForm.issueDescription,
          }));
        }
      } catch (error) {
        if (isCurrent) {
          setTicketVerificationStatus('invalid');
          setTicketVerificationError(getFriendlyErrorMessage(error, 'Không xác nhận được mã QR. Vui lòng quét lại.'));
        }
      }
    };

    verifyToken();
    return () => { isCurrent = false; };
  }, [activeTab, ticketAccess.token, ticketAccess.id]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const response = await authApi.login(loginForm);
      const authData = response.data || response;
      const token = authData.token || authData.accessToken || authData.access_token ||
        authData.jwt || authData.access?.token;
      const userData = authData.user || authData.employee || response.user || response.employee || authData;
      const accountId = userData.id || userData.AccountID;
      const username = userData.username || userData.Username;
      if (!token && !accountId && !username) {
        throw new Error('Thông tin đăng nhập chưa hợp lệ. Vui lòng thử lại.');
      }

      const user = {
        id: accountId,
        name: userData.name || userData.fullName || userData.FullName || username || loginForm.username,
        role: userData.role || userData.Role || 'technician',
      };

      if (token) {
        localStorage.setItem('authToken', token);
      } else {
        localStorage.removeItem('authToken');
      }
      localStorage.setItem('authUser', JSON.stringify(user));
      setCurrentUser(user);
      setShowLoginModal(false);
      setLoginForm({ username: '', password: '' });
      setActiveTab('dashboard');
    } catch (error) {
      setLoginError(getFriendlyErrorMessage(error, 'Đăng nhập chưa thành công. Vui lòng kiểm tra lại thông tin.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setCurrentUser(null);
    setActiveTab('lookup');
  };

  const handleCustomerLookup = async (e) => {
    e.preventDefault();
    setLookupSearched(true);
    setIsLoadingTickets(true);
    setTicketLoadError('');
    try {
      const serverTickets = unwrapTicketList(await ticketApi.getAllTickets());
      setTickets(serverTickets);
      const query = lookupInput.trim().toLowerCase();
      const matched = lookupType === 'phone'
        ? serverTickets.filter((ticket) => ticket.phone.trim().includes(query))
        : serverTickets.filter((ticket) => ticket.id.toLowerCase() === query);
      setCustomerTickets(matched);
    } catch (error) {
      setCustomerTickets([]);
      if (isNotFoundError(error)) {
        setTickets([]);
        setTicketLoadError('');
        return;
      }
      setTicketLoadError(getFriendlyErrorMessage(error, 'Chưa tải được danh sách phiếu. Vui lòng thử lại sau.'));
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const createTicketDraft = async () => {
    const response = await ticketApi.createTicket({ status: 'draft' });
    const ticketData = unwrapTicketResponse(response);
    if (!ticketData.id && !ticketData.token) {
      throw new Error('Chưa tạo được mã phiếu. Vui lòng thử lại sau.');
    }
    return ticketData;
  };

  const createTicketFormUrl = (ticketData) => {
    const params = new URLSearchParams();
    if (ticketData.token) params.set('token', ticketData.token);
    if (ticketData.id) params.set('id', ticketData.id);
    const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');
    return `${publicAppUrl}/?${params.toString()}`;
  };

  const handleStartCustomerTicket = async () => {
    setIsStartingCustomerTicket(true);
    setCustomerTicketError('');
    try {
      const ticketData = await createTicketDraft();
      setCurrentCreatedTicket({
        ...ticketData,
        createdAt: ticketData.createdAt || ticketData.CreatedAt || new Date().toLocaleString('vi-VN'),
        qrUrl: createTicketFormUrl(ticketData),
      });
      setActiveTab('customerQr');
    } catch (error) {
      setCustomerTicketError(getFriendlyErrorMessage(error, 'Chưa tạo được phiếu sửa chữa. Vui lòng thử lại sau.'));
    } finally {
      setIsStartingCustomerTicket(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setIsCreatingTicket(true);
    setTicketCreationError('');
    setCurrentCreatedTicket(null);

    try {
      const ticketData = await createTicketDraft();

      setCurrentCreatedTicket({
        ...ticketData,
        createdAt: ticketData.createdAt || ticketData.CreatedAt || new Date().toLocaleString('vi-VN'),
        qrUrl: createTicketFormUrl(ticketData),
      });
    } catch (error) {
      setTicketCreationError(getFriendlyErrorMessage(error, 'Chưa tạo được phiếu. Vui lòng thử lại sau.'));
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleSubmitRepairDetails = async (e) => {
    e.preventDefault();
    if (!formData.phone.match(/^[0-9]{10,11}$/)) {
      setTicketSubmissionError('Vui lòng nhập đúng số điện thoại gồm 10 hoặc 11 chữ số.');
      return;
    }
    if (!ticketAccess.token && !ticketAccess.id) {
      setTicketSubmissionError('Mã QR chưa đầy đủ. Vui lòng quét lại mã trên phiếu.');
      return;
    }

    setIsSubmittingTicket(true);
    setTicketSubmissionError('');
    try {
      const response = await ticketApi.submitTicketDetails({
        ...formData,
        token: ticketAccess.token || undefined,
        id: ticketAccess.id || undefined,
      });
      const savedTicket = unwrapTicketResponse(response);
      const submittedTicket = normalizeTicket({
        ...formData,
        ...savedTicket,
        id: savedTicket.id || ticketAccess.id,
      });
      setSubmittedRepairTicket(submittedTicket);
      setTickets((currentTickets) => [
        submittedTicket,
        ...currentTickets.filter((ticket) => ticket.id !== submittedTicket.id),
      ]);
      setActiveTab('repairSubmitted');
      window.history.replaceState({}, '', window.location.pathname);
      setTicketAccess({ token: '', id: '' });
    } catch (error) {
      setTicketSubmissionError(getFriendlyErrorMessage(error, 'Chưa gửi được thông tin sửa chữa. Vui lòng thử lại.'));
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (appointmentForm.date === getLocalDateValue()) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (appointmentForm.time <= currentTime) {
        alert('Vui lòng chọn khung giờ còn lại trong ngày hoặc chọn ngày khác.');
        return;
      }
    }

    setIsSubmittingAppointment(true);
    setAppointmentError('');
    try {
      const response = await appointmentApi.createAppointment(appointmentForm);
      const appointmentData = response.appointment || response.data?.appointment || response.data || response;
      const appointment = normalizeAppointment({ ...appointmentForm, ...appointmentData });

      setAppointments((currentAppointments) => [appointment, ...currentAppointments]);
      setSubmittedAppointment(appointment);
    } catch (error) {
      setAppointmentError(getFriendlyErrorMessage(error, 'Chưa gửi được yêu cầu đặt lịch. Vui lòng thử lại.'));
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  const handleAppointmentStatusChange = async (appointmentId, status) => {
    setUpdatingAppointmentId(appointmentId);
    setAppointmentError('');
    try {
      await appointmentApi.updateAppointment(appointmentId, { status });
      setAppointments((currentAppointments) => currentAppointments.map((appointment) => (
        appointment.id === appointmentId ? { ...appointment, status } : appointment
      )));
    } catch (error) {
      setAppointmentError(getFriendlyErrorMessage(error, 'Chưa cập nhật được lịch hẹn. Vui lòng thử lại.'));
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus, newNote) => {
    if (!currentUser) return;

    setUpdatingTicketId(ticketId);
    setTicketActionError('');
    try {
      const updateData = { status: newStatus };
      if (newNote !== undefined) updateData.technicianNote = newNote;
      await ticketApi.updateTicketStatus(ticketId, updateData);

      setTickets((currentTickets) => currentTickets.map((ticket) => (
        ticket.id === ticketId
          ? { ...ticket, status: newStatus, technicianNote: newNote ?? ticket.technicianNote }
          : ticket
      )));
      setSelectedTicket((currentTicket) => currentTicket?.id === ticketId
        ? { ...currentTicket, status: newStatus, technicianNote: newNote ?? currentTicket.technicianNote }
        : currentTicket);
    } catch (error) {
      setTicketActionError(getFriendlyErrorMessage(error, 'Chưa cập nhật được phiếu. Vui lòng thử lại.'));
    } finally {
      setUpdatingTicketId(null);
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
        return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">Đã tiếp nhận</span>;
      case 'checking':
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">Đang kiểm tra</span>;
      case 'fixing':
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">Đang xử lý</span>;
      case 'completed':
        return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">Sẵn sàng giao</span>;
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
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-5xl space-y-6">

        {/* Header */}
        <header className="bg-white p-4 md:px-6 md:py-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-500/20">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">Cổng Tiếp Nhận & Tra Cứu Bảo Hành Thiết Bị</h1>
              <p className="text-xs text-slate-500 mt-0.5">Tra cứu tiến độ qua mã QR / SĐT & Quản lý điều phối sửa chữa</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs md:text-sm font-medium">
              <button
                onClick={() => setActiveTab('lookup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'lookup' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-4 h-4" /> <span>Khách tra cứu</span>
              </button>

              <button
                onClick={() => { setActiveTab('scan'); setScannerError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'scan' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" /> <span>Quét QR</span>
              </button>

              {currentUser && (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" /> <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === 'create' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" /> <span>Tạo phiếu</span>
                  </button>
                </>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hidden md:inline-block">
                  KTV: {currentUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setLoginError(''); setShowLoginModal(true); }}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" /> Đăng Nhập KTV
              </button>
            )}
          </div>
        </header>

        {/* Modal Đăng nhập KTV */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative border border-slate-100">
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Đăng Nhập Kỹ Thuật Viên</h3>
                <p className="text-xs text-slate-500 mt-0.5">Dành riêng cho nhân viên tiếp nhận & sửa chữa</p>
              </div>

              {loginError && (
                <div className="mb-4 p-2.5 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
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
                    placeholder="Nhập tên tài khoản"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Mật khẩu</label>
                  <input
                    type="password"
                    required
                    placeholder="Nhập mật khẩu"
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition mt-2 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
                >
                  <LogIn className="w-4 h-4" /> {isLoggingIn ? 'Đang xác thực...' : 'Đăng Nhập'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 1. Tab Khách Tra Cứu */}
        {activeTab === 'lookup' && (
          <div className="space-y-6">
            <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-slate-200/80 text-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Tra Cứu Tình Trạng Thiết Bị</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                Nhập số điện thoại để xem toàn bộ máy đang sửa, hoặc nhập chính xác mã phiếu
              </p>

              {/* Nút Tab chuyển kiểu tra cứu */}
              <div className="inline-flex bg-slate-100/90 p-1 rounded-xl mb-6 text-xs md:text-sm font-medium">
                <button
                  onClick={() => { setLookupType('phone'); setCustomerTickets([]); setLookupSearched(false); }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${
                    lookupType === 'phone' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-4 h-4" /> Tra cứu theo Số Điện Thoại
                </button>
                <button
                  onClick={() => { setLookupType('ticketId'); setCustomerTickets([]); setLookupSearched(false); }}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${
                    lookupType === 'ticketId' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> Tra cứu theo Mã Phiếu
                </button>
              </div>

              {/* Thanh tìm kiếm */}
              <form onSubmit={handleCustomerLookup} className="flex gap-2.5 max-w-xl mx-auto">
                <input
                  type="text"
                  required
                  placeholder={lookupType === 'phone' ? 'Ví dụ: 0901234567' : 'Nhập mã phiếu do hệ thống cấp'}
                  className="flex-1 text-sm border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition"
                  value={lookupInput}
                  onChange={(e) => setLookupInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isLoadingTickets}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition shadow-sm shadow-blue-500/20"
                >
                  <Search className="w-4 h-4" /> {isLoadingTickets ? 'Đang tải...' : 'Tra Cứu'}
                </button>
              </form>

              {ticketLoadError && !/404/i.test(ticketLoadError) && (
                <div className="max-w-xl mx-auto mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ticketLoadError}
                </div>
              )}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-sm text-slate-500 mb-3">Chưa có phiếu sửa chữa?</p>
                {customerTicketError && (
                  <div className="max-w-xl mx-auto mb-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {customerTicketError}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartCustomerTicket}
                    disabled={isStartingCustomerTicket}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                  >
                    <Wrench className="w-4 h-4" /> {isStartingCustomerTicket ? 'Đang tạo phiếu...' : 'Tạo phiếu sửa chữa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSubmittedAppointment(null); setAppointmentError(''); setActiveTab('appointment'); }}
                    className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                  >
                    <CalendarDays className="w-4 h-4" /> Đặt lịch hẹn
                  </button>
                </div>
              </div>
            </div>

            {/* Danh sách kết quả */}
            {lookupSearched && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 px-1">
                  Kết quả tra cứu ({customerTickets.length} thiết bị):
                </h3>

                {isLoadingTickets ? (
                  <p className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">Đang tải dữ liệu từ hệ thống...</p>
                ) : customerTickets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customerTickets.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                        onClick={() => { setSelectedTicket(item); setActiveTab('detail'); }}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                              {item.id}
                            </span>
                            {getStatusBadge(item.status)}
                          </div>
                          <h4 className="font-bold text-slate-800 text-base">{item.deviceName}</h4>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">Lỗi: {item.issueDescription}</p>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span>Ngày nhận: {item.createdAt}</span>
                          <span className="text-blue-600 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Xem tiến độ <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2.5 text-slate-300" />
                    <p className="text-sm font-medium">Không tìm thấy thiết bị nào khớp với thông tin bạn vừa nhập.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'customerQr' && currentCreatedTicket && (
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-xl mx-auto text-center">
            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              className="block mb-5 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180 inline mr-1" /> Quay lại trang chủ
            </button>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <h2 className="text-xl font-bold text-slate-900">Phiếu đã khởi tạo</h2>
            <p className="mt-2 text-sm text-slate-500">Quét mã QR bằng điện thoại để mở form điền thông tin sửa chữa.</p>

            <div className="inline-flex my-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <QRCodeSVG value={currentCreatedTicket.qrUrl} size={208} level="H" />
            </div>

            <div className="max-w-md mx-auto mb-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-sm space-y-2">
              <p><span className="text-slate-500">Mã phiếu:</span> <strong className="font-mono text-blue-700">{currentCreatedTicket.id || currentCreatedTicket.token}</strong></p>
              <p><span className="text-slate-500">Khởi tạo:</span> <strong>{currentCreatedTicket.createdAt}</strong></p>
            </div>

            {/(localhost|127\.0\.0\.1)/.test(currentCreatedTicket.qrUrl) && (
              <p className="max-w-md mx-auto mb-4 text-xs text-amber-700">
                QR đang chứa localhost nên điện thoại không mở được. Cấu hình VITE_PUBLIC_APP_URL bằng địa chỉ LAN của frontend.
              </p>
            )}

            <div className="flex flex-col sm:flex-row justify-center gap-2.5">
              <a
                href={currentCreatedTicket.qrUrl}
                className="inline-flex items-center justify-center gap-2 border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-5 py-2.5 rounded-xl text-sm transition"
              >
                Mở form điền
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition"
              >
                <Printer className="w-4 h-4" /> In mã QR
              </button>
            </div>
          </section>
        )}

        {activeTab === 'appointment' && (
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setActiveTab('lookup')}
              className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Quay lại tra cứu
            </button>

            {submittedAppointment ? (
              <div className="py-5 text-center">
                <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900">Đã gửi yêu cầu đặt lịch</h2>
                <p className="text-sm text-slate-500 mt-2">Nhân viên sẽ liên hệ qua số điện thoại để xác nhận lịch hẹn.</p>
                <div className="max-w-md mx-auto mt-6 rounded-xl bg-slate-50 border border-slate-200 p-5 text-left space-y-2 text-sm">
                  <p><span className="text-slate-500">Mã hẹn:</span> <strong className="font-mono text-blue-700">{submittedAppointment.id}</strong></p>
                  <p><span className="text-slate-500">Thời gian:</span> <strong>{submittedAppointment.time}, {new Date(`${submittedAppointment.date}T12:00:00`).toLocaleDateString('vi-VN')}</strong></p>
                  <p><span className="text-slate-500">Dịch vụ:</span> <strong>{submittedAppointment.serviceType}</strong></p>
                  <p><span className="text-slate-500">Trạng thái:</span> <strong className="text-amber-700">Chờ xác nhận</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedAppointment(null);
                    setAppointmentForm({ customerName: '', phone: '', serviceType: serviceTypes[0], deviceName: '', date: '', time: '', issueDescription: '' });
                  }}
                  className="mt-6 border border-slate-300 hover:border-blue-500 hover:text-blue-600 font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                >
                  Đặt lịch khác
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-blue-600" /> Đặt lịch sửa chữa
                  </h2>
                  <p className="text-sm text-slate-500 mt-2">Gửi thông tin thiết bị và chọn thời gian bạn muốn mang máy đến.</p>
                </div>

                <form onSubmit={handleBookAppointment} className="space-y-4">
                  {appointmentError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {appointmentError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tên khách hàng</label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        placeholder="Nguyễn Văn A"
                        value={appointmentForm.customerName}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, customerName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Số điện thoại</label>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10,11}"
                        title="Nhập số điện thoại gồm 10 hoặc 11 chữ số"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        placeholder="0912345678"
                        value={appointmentForm.phone}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Dịch vụ cần hỗ trợ</label>
                      <select
                        required
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition"
                        value={appointmentForm.serviceType}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, serviceType: e.target.value })}
                      >
                        {serviceTypes.map((serviceType) => <option key={serviceType} value={serviceType}>{serviceType}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Thiết bị / Model</label>
                      <input
                        type="text"
                        required
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        placeholder="Laptop Dell, PC gaming..."
                        value={appointmentForm.deviceName}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, deviceName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Ngày hẹn</label>
                      <input
                        type="date"
                        required
                        min={getLocalDateValue()}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                        value={appointmentForm.date}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Khung giờ</label>
                      <select
                        required
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition"
                        value={appointmentForm.time}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                      >
                        <option value="">Chọn khung giờ</option>
                        {appointmentTimes.map((time) => <option key={time} value={time}>{time}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Mô tả tình trạng thiết bị</label>
                    <textarea
                      rows="3"
                      required
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                      placeholder="Mô tả ngắn lỗi hoặc nhu cầu sửa chữa..."
                      value={appointmentForm.issueDescription}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, issueDescription: e.target.value })}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAppointment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm shadow-blue-500/20"
                  >
                    <CalendarDays className="w-5 h-5" /> {isSubmittingAppointment ? 'Đang gửi...' : 'Gửi yêu cầu đặt lịch'}
                  </button>
                </form>
              </>
            )}
          </section>
        )}

        {/* 2. Tab Quét Camera QR */}
        {activeTab === 'scan' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-lg mx-auto text-center space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" /> Quét Mã QR Bằng Camera
            </h2>
            <p className="text-xs text-slate-500">Đưa camera vào tem QR dán trên thiết bị để mở tiến độ trực tiếp</p>

            <div id="reader" className="overflow-hidden rounded-xl border border-slate-200"></div>

            {scannerError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {scannerError}
              </div>
            )}
          </div>
        )}

        {/* 3. Tab Dashboard */}
        {activeTab === 'dashboard' && currentUser && (
          <div className="space-y-4">
            {ticketLoadError && !/404/i.test(ticketLoadError) && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ticketLoadError}
              </div>
            )}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" /> Lịch hẹn sửa chữa
                </h2>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full w-fit">
                  {appointments.filter((appointment) => appointment.status === 'pending').length} chờ xác nhận
                </span>
              </div>
              {appointmentError && (
                <div className="m-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {appointmentError}
                </div>
              )}
              {isLoadingAppointments ? (
                <p className="p-6 text-sm text-slate-500">Đang tải lịch hẹn...</p>
              ) : appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-slate-50/80 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-3.5">Lịch hẹn</th>
                        <th className="p-3.5">Khách hàng</th>
                        <th className="p-3.5">Thiết bị / Dịch vụ</th>
                        <th className="p-3.5">Tình trạng</th>
                        <th className="p-3.5">Xác nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {appointments.map((appointment) => (
                        <tr key={appointment.id} className="align-top">
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{new Date(`${appointment.date}T12:00:00`).toLocaleDateString('vi-VN')}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock3 className="w-3.5 h-3.5" /> {appointment.time}</div>
                            <div className="font-mono text-[11px] text-blue-600 mt-1">{appointment.id || 'Chưa có mã'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{appointment.customerName}</div>
                            <div className="text-xs text-slate-500 mt-1">{appointment.phone}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-800">{appointment.deviceName}</div>
                            <div className="text-xs text-slate-500 mt-1">{appointment.serviceType}</div>
                          </td>
                          <td className="p-3.5 max-w-xs text-xs text-slate-600">{appointment.issueDescription}</td>
                          <td className="p-3.5">
                            <select
                              value={appointment.status}
                              onChange={(e) => handleAppointmentStatusChange(appointment.id, e.target.value)}
                              disabled={updatingAppointmentId === appointment.id}
                              className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium bg-white focus:border-blue-500 outline-none"
                            >
                              <option value="pending">Chờ xác nhận</option>
                              <option value="confirmed">Đã xác nhận</option>
                              <option value="cancelled">Đã hủy</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-6 text-sm text-slate-500">Chưa có yêu cầu đặt lịch nào.</p>
              )}
            </section>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng máy tiếp nhận</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-2">{tickets.length}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Đang kiểm tra</p>
                <p className="text-3xl font-extrabold text-amber-600 mt-2">
                  {tickets.filter(t => t.status === 'checking').length}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Đang sửa chữa</p>
                <p className="text-3xl font-extrabold text-blue-600 mt-2">
                  {tickets.filter(t => t.status === 'fixing').length}
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Đã xong</p>
                <p className="text-3xl font-extrabold text-emerald-600 mt-2">
                  {tickets.filter(t => t.status === 'completed').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, mã phiếu..."
                  className="w-full pl-10 pr-3.5 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <ListFilter className="w-4 h-4 text-slate-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="received">Tiếp nhận</option>
                  <option value="checking">Đang kiểm tra</option>
                  <option value="fixing">Đang sửa</option>
                  <option value="completed">Đã xong</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Mã Phiếu</th>
                      <th className="p-3.5">Khách Hàng</th>
                      <th className="p-3.5">Thiết Bị</th>
                      <th className="p-3.5">Dịch Vụ</th>
                      <th className="p-3.5">Trạng Thái</th>
                      <th className="p-3.5">Ngày Nhận</th>
                      <th className="p-3.5 text-right">Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-sm text-slate-500">
                          {isLoadingTickets ? 'Đang tải phiếu từ hệ thống...' : 'Chưa có phiếu sửa chữa nào.'}
                        </td>
                      </tr>
                    ) : filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="p-3.5 font-mono font-bold text-blue-600">{t.id}</td>
                        <td className="p-3.5">
                          <p className="font-semibold text-slate-800">{t.customerName}</p>
                          <p className="text-xs text-slate-400">{t.phone}</p>
                        </td>
                        <td className="p-3.5 text-slate-700">{t.deviceName}</td>
                        <td className="p-3.5">
                          <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                            t.serviceType === 'Phần cứng' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {t.serviceType}
                          </span>
                        </td>
                        <td className="p-3.5">{getStatusBadge(t.status)}</td>
                        <td className="p-3.5 text-xs text-slate-500">{t.createdAt}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => { setSelectedTicket(t); setActiveTab('detail'); }}
                            className="bg-slate-100 hover:bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
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

        {/* 4. Tab Tạo Phiếu */}
        {activeTab === 'create' && currentUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" /> Khởi tạo phiếu tiếp nhận
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Tạo phiếu nháp trên hệ thống. Khách quét mã QR để mở form và bổ sung thông tin thiết bị.
              </p>

              {ticketCreationError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ticketCreationError}
                </div>
              )}

              <form onSubmit={handleCreateTicket}>
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm shadow-blue-500/20"
                >
                  <QrCode className="w-5 h-5" /> {isCreatingTicket ? 'Đang tạo phiếu...' : 'Tạo phiếu & sinh mã QR'}
                </button>
              </form>
            </div>

            {/* Khung Tem QR */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-center justify-center">
              {currentCreatedTicket ? (
                <div className="w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm mb-4">
                    <CheckCircle2 className="w-5 h-5" /> Tạo phiếu thành công!
                  </div>

                  <div className="border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 rounded-2xl w-full max-w-xs flex flex-col items-center text-center shadow-sm">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                      TEM BẢO HÀNH & SỬA CHỮA
                    </div>
                    <div className="text-lg font-black text-blue-700 font-mono my-1.5">
                      {currentCreatedTicket.id || currentCreatedTicket.token}
                    </div>

                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <QRCodeSVG
                        value={currentCreatedTicket.qrUrl}
                        size={150}
                        level="H"
                      />
                    </div>

                    <div className="text-xs text-left w-full space-y-1.5 mt-3 text-slate-700">
                      {currentCreatedTicket.token && <p><span className="font-semibold text-slate-500">Token:</span> <span className="break-all">{currentCreatedTicket.token}</span></p>}
                      <p><span className="font-semibold text-slate-500">Ngày lập:</span> {currentCreatedTicket.createdAt}</p>
                      <a href={currentCreatedTicket.qrUrl} target="_blank" rel="noreferrer" className="block break-all text-blue-600 underline">Mở form từ QR</a>
                    </div>
                  </div>

                  {/(localhost|127\.0\.0\.1)/.test(currentCreatedTicket.qrUrl) && (
                    <p className="max-w-xs mt-3 text-xs text-amber-700 text-center">
                      QR hiện dùng địa chỉ localhost nên điện thoại không mở được. Hãy đặt VITE_PUBLIC_APP_URL thành địa chỉ LAN của frontend.
                    </p>
                  )}

                  <div className="w-full max-w-xs mt-5">
                    <button
                      onClick={() => window.print()}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition"
                    >
                      <Printer className="w-4 h-4" /> In Tem Dán
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <QrCode className="w-16 h-16 mx-auto mb-3 stroke-1 text-slate-300" />
                  <p className="text-sm">Mã QR chứa đường dẫn form và Token do backend cấp sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'repairForm' && (
          <section className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto">
            {ticketVerificationStatus === 'checking' ? (
              <div className="py-12 text-center text-slate-600">
                <Clock3 className="w-8 h-8 mx-auto mb-3 text-blue-600 animate-spin" />
                <p className="font-semibold">Đang kiểm tra mã QR...</p>
              </div>
            ) : ticketVerificationStatus === 'invalid' ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
                <h2 className="text-xl font-bold text-slate-900">Không thể mở phiếu</h2>
                <p className="mt-2 text-sm text-red-600">{ticketVerificationError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setTicketAccess({ token: '', id: '' });
                    setTicketVerificationStatus('idle');
                    window.history.replaceState({}, '', window.location.pathname);
                    setActiveTab('lookup');
                  }}
                  className="mt-5 border border-slate-300 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  Về trang chủ
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Thông tin tiếp nhận sửa chữa</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Mã phiếu: <span className="font-mono font-semibold text-blue-700">{ticketAccess.id || 'Đã xác nhận mã QR'}</span>
                  </p>
                </div>

                {ticketSubmissionError && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ticketSubmissionError}
                  </div>
                )}

                <form onSubmit={handleSubmitRepairDetails} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tên khách hàng</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Số điện thoại</label>
                  <input type="tel" required className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="0912345678" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Dịch vụ</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white transition" value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}>
                    {serviceTypes.map((serviceType) => <option key={serviceType} value={serviceType}>{serviceType}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tên máy / Model</label>
                  <input type="text" required className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Dell Latitude, PC i7..." value={formData.deviceName} onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Tình trạng lỗi cụ thể</label>
                <textarea rows="3" required className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition" placeholder="Mô tả vấn đề thiết bị..." value={formData.issueDescription} onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}></textarea>
              </div>
              <button type="submit" disabled={isSubmittingTicket} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-sm shadow-blue-500/20">
                <CheckCircle2 className="w-5 h-5" /> {isSubmittingTicket ? 'Đang gửi...' : 'Gửi thông tin sửa chữa'}
              </button>
                </form>
              </>
            )}
          </section>
        )}

        {activeTab === 'repairSubmitted' && submittedRepairTicket && (
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-2xl mx-auto text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-900">Đã gửi thông tin sửa chữa</h2>
            <p className="mt-2 text-sm text-slate-500">Thông tin thiết bị đã được gửi tới hệ thống.</p>
            {submittedRepairTicket.id && <p className="mt-4 font-mono font-semibold text-blue-700">Mã phiếu: {submittedRepairTicket.id}</p>}
          </section>
        )}

        {/* 5. Tab Chi Tiết */}
        {activeTab === 'detail' && selectedTicket && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center pb-5 border-b border-slate-200 gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md text-sm">
                    {selectedTicket.id}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{selectedTicket.deviceName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Khách: {selectedTicket.customerName} - {selectedTicket.phone}</p>
              </div>

              <button
                onClick={() => setActiveTab(currentUser ? 'dashboard' : 'lookup')}
                className="self-start md:self-auto text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 border border-slate-200 px-3.5 py-2 rounded-xl transition"
              >
                <X className="w-4 h-4" /> Đóng
              </button>
            </div>

            {ticketActionError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ticketActionError}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3.5">
                Tiến Độ Sửa Chữa {currentUser ? '(Kỹ thuật viên nhấp để cập nhật)' : ''}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {steps.map((st, idx) => {
                  const currentIdx = steps.findIndex(s => s.key === selectedTicket.status);
                  const isDone = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <button
                      key={st.key}
                      disabled={!currentUser || updatingTicketId === selectedTicket.id}
                      onClick={() => handleUpdateStatus(selectedTicket.id, st.key)}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      } ${currentUser ? 'cursor-pointer hover:opacity-85' : 'cursor-default'}`}
                    >
                      <div className="text-xs">{st.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80">
                <h5 className="text-xs font-bold uppercase text-slate-500 mb-2">Mô tả sự cố từ khách:</h5>
                <p className="text-sm text-slate-800 leading-relaxed">{selectedTicket.issueDescription}</p>
              </div>

              <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/80">
                <h5 className="text-xs font-bold uppercase text-blue-900 mb-2">Nhật ký kỹ thuật viên:</h5>
                {currentUser ? (
                  <textarea
                    rows="2"
                    className="w-full text-sm bg-white border border-blue-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    value={selectedTicket.technicianNote}
                    onChange={(e) => setSelectedTicket((currentTicket) => ({ ...currentTicket, technicianNote: e.target.value }))}
                    onBlur={() => handleUpdateStatus(selectedTicket.id, selectedTicket.status, selectedTicket.technicianNote)}
                  />
                ) : (
                  <p className="text-sm text-slate-800 leading-relaxed">{selectedTicket.technicianNote}</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}