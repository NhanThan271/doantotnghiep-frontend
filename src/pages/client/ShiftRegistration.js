// src/pages/employee/ShiftRegistration.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calendar,
    Clock,
    User,
    CheckCircle,
    XCircle,
    AlertCircle,
    ChevronLeft,
    Moon,
    Sun,
    Cloud,
    Star,
    History,
    Bell
} from "lucide-react";
import axios from "axios";


const ShiftRegistration = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedShift, setSelectedShift] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("");
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [registeredShifts, setRegisteredShifts] = useState([]);
    const [activeTab, setActiveTab] = useState("register"); // register, history

    // Danh sách ca làm
    const shifts = [
        { id: "MORNING", name: "Ca sáng", time: "06:00 - 11:00", icon: <Sun size={20} />, color: "#f59e0b", bg: "#fffbeb" },
        { id: "MIDDAY", name: "Ca trưa", time: "11:00 - 14:00", icon: <Cloud size={20} />, color: "#3b82f6", bg: "#eff6ff" },
        { id: "AFTERNOON", name: "Ca chiều", time: "14:00 - 17:00", icon: <Sun size={20} />, color: "#f97316", bg: "#fff7ed" },
        { id: "EVENING", name: "Ca tối", time: "17:00 - 22:00", icon: <Moon size={20} />, color: "#8b5cf6", bg: "#f5f3ff" },
        { id: "FULL", name: "Ca full", time: "08:00 - 22:00", icon: <Star size={20} />, color: "#ec4899", bg: "#fdf2f8" }
    ];

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        if (!userData || !userData.id) {
            navigate('/login');
            return;
        }
        setUser(userData);
        fetchBranches();
        fetchRegisteredShifts(userData.id);
    }, []);

    const fetchBranches = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get("http://localhost:8080/api/branches", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBranches(response.data);
        } catch (err) {
            console.error("Lỗi tải chi nhánh:", err);
        }
    };

    const fetchRegisteredShifts = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:8080/api/shift-registrations/user/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRegisteredShifts(response.data);
        } catch (err) {
            console.error("Lỗi tải lịch sử đăng ký:", err);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!selectedShift || !selectedDate || !selectedBranch) {
            setMessage({ type: "error", text: "Vui lòng điền đầy đủ thông tin!" });
            return;
        }

        setIsLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post("http://localhost:8080/api/shift-registrations", {
                userId: user.id,
                fullName: user.fullName,
                phone: user.phone,
                shiftId: selectedShift,
                shiftName: shifts.find(s => s.id === selectedShift)?.name,
                date: selectedDate,
                branchId: selectedBranch,
                status: "PENDING"
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.status === 200 || response.status === 201) {
                setMessage({ type: "success", text: "Đăng ký ca làm thành công! Vui lòng chờ xác nhận từ quản lý." });
                setSelectedShift("");
                setSelectedDate("");
                setSelectedBranch("");
                fetchRegisteredShifts(user.id);

                // Tự động chuyển sang tab lịch sử sau 2 giây
                setTimeout(() => {
                    setActiveTab("history");
                    setMessage({ type: "", text: "" });
                }, 2000);
            }
        } catch (err) {
            console.error("Register shift error:", err);
            setMessage({
                type: "error",
                text: err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại sau."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "PENDING":
                return { text: "Chờ duyệt", color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={12} /> };
            case "APPROVED":
                return { text: "Đã duyệt", color: "#10b981", bg: "#f0fdf4", icon: <CheckCircle size={12} /> };
            case "REJECTED":
                return { text: "Từ chối", color: "#ef4444", bg: "#fef2f2", icon: <XCircle size={12} /> };
            default:
                return { text: "Không xác định", color: "#6b7280", bg: "#f3f4f6", icon: <AlertCircle size={12} /> };
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
    };

    const minDate = new Date().toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return (
        <div className="shift-registration-page">
            <div className="container">
                {/* Header */}
                <div className="page-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ChevronLeft size={20} />
                        Quay lại
                    </button>
                    <div className="header-title">
                        <Calendar size={28} />
                        <h1>Đăng ký ca làm</h1>
                    </div>
                    <div className="user-info">
                        <User size={16} />
                        <span>{user?.fullName || user?.username}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === "register" ? "active" : ""}`}
                        onClick={() => setActiveTab("register")}
                    >
                        <Calendar size={16} />
                        Đăng ký mới
                    </button>
                    <button
                        className={`tab ${activeTab === "history" ? "active" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        <History size={16} />
                        Lịch sử đăng ký
                    </button>
                </div>

                {/* Nội dung */}
                <div className="tab-content">
                    {/* Tab Đăng ký */}
                    {activeTab === "register" && (
                        <form onSubmit={handleRegister} className="register-form">
                            <div className="form-card">
                                <h3>
                                    <User size={18} />
                                    Thông tin cá nhân
                                </h3>
                                <div className="info-row">
                                    <span>Họ và tên:</span>
                                    <strong>{user?.fullName || user?.username}</strong>
                                </div>
                                <div className="info-row">
                                    <span>Số điện thoại:</span>
                                    <strong>{user?.phone || "Chưa cập nhật"}</strong>
                                </div>
                            </div>

                            <div className="form-card">
                                <h3>
                                    <Calendar size={18} />
                                    Thông tin đăng ký
                                </h3>

                                <div className="form-group">
                                    <label>Chọn chi nhánh</label>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Chọn chi nhánh --</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name} - {branch.address}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Chọn ca làm</label>
                                    <div className="shift-options">
                                        {shifts.map(shift => (
                                            <div
                                                key={shift.id}
                                                className={`shift-card ${selectedShift === shift.id ? "selected" : ""}`}
                                                onClick={() => setSelectedShift(shift.id)}
                                                style={{ background: shift.bg, borderColor: selectedShift === shift.id ? shift.color : "#e2e8e0" }}
                                            >
                                                <div className="shift-icon" style={{ color: shift.color }}>
                                                    {shift.icon}
                                                </div>
                                                <div className="shift-info">
                                                    <div className="shift-name" style={{ color: shift.color }}>{shift.name}</div>
                                                    <div className="shift-time">{shift.time}</div>
                                                </div>
                                                {selectedShift === shift.id && <CheckCircle size={18} color={shift.color} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Chọn ngày làm</label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        min={minDate}
                                        max={maxDate}
                                        required
                                    />
                                </div>
                            </div>

                            {message.text && (
                                <div className={`message ${message.type}`}>
                                    {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <button type="submit" className="submit-btn" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <div className="spinner"></div>
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Bell size={16} />
                                        Gửi đăng ký
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Tab Lịch sử */}
                    {activeTab === "history" && (
                        <div className="history-section">
                            {registeredShifts.length === 0 ? (
                                <div className="empty-state">
                                    <Calendar size={48} />
                                    <p>Chưa có đăng ký ca làm nào</p>
                                    <button onClick={() => setActiveTab("register")} className="empty-btn">
                                        Đăng ký ngay
                                    </button>
                                </div>
                            ) : (
                                <div className="history-list">
                                    {registeredShifts.map((item, index) => {
                                        const status = getStatusBadge(item.status);
                                        const shift = shifts.find(s => s.id === item.shiftId);
                                        return (
                                            <div key={index} className="history-card">
                                                <div className="history-date">
                                                    <Calendar size={14} />
                                                    <span>{formatDate(item.date)}</span>
                                                </div>
                                                <div className="history-shift" style={{ background: shift?.bg, color: shift?.color }}>
                                                    {shift?.icon}
                                                    <span>{shift?.name}</span>
                                                    <small>{shift?.time}</small>
                                                </div>
                                                <div className="history-status" style={{ background: status.bg, color: status.color }}>
                                                    {status.icon}
                                                    <span>{status.text}</span>
                                                </div>
                                                {item.reason && (
                                                    <div className="history-reason">{item.reason}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShiftRegistration;