import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = "http://localhost:8080";

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderCode = searchParams.get('orderCode');
    const [reservationInfo, setReservationInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cập nhật trạng thái bàn
    const updateTableStatus = async (tableId, status) => {
        try {
            const token = localStorage.getItem("token");
            console.log(`📡 Đang cập nhật bàn ${tableId} -> ${status}`);

            const response = await fetch(`${API}/api/tables/${tableId}/status?status=${status}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();
            console.log("📥 Kết quả cập nhật bàn:", result);

            if (response.ok) {
                console.log(`✅ Bàn ${tableId} đã được cập nhật thành ${status}`);
                return true;
            } else {
                console.error(`❌ Lỗi cập nhật bàn: ${response.status}`, result);
                return false;
            }
        } catch (error) {
            console.error("❌ Lỗi kết nối khi cập nhật bàn:", error);
            return false;
        }
    };

    // Cập nhật trạng thái phòng
    const updateRoomStatus = async (roomId, status) => {
        try {
            const token = localStorage.getItem("token");
            console.log(`📡 Đang cập nhật phòng ${roomId} -> ${status}`);

            const response = await fetch(`${API}/api/rooms/${roomId}/status?status=${status}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();
            console.log("📥 Kết quả cập nhật phòng:", result);

            if (response.ok) {
                console.log(`✅ Phòng ${roomId} đã được cập nhật thành ${status}`);
                return true;
            } else {
                console.error(`❌ Lỗi cập nhật phòng: ${response.status}`, result);
                return false;
            }
        } catch (error) {
            console.error("❌ Lỗi kết nối khi cập nhật phòng:", error);
            return false;
        }
    };

    // Xóa branch đã lưu
    const clearSavedBranch = () => {
        sessionStorage.removeItem('currentBranch');
        localStorage.removeItem('currentBranch');
        sessionStorage.removeItem('lastBranch');
        console.log("🗑️ Đã xóa branch đã lưu");
    };

    useEffect(() => {
        const createReservationAfterPayment = async () => {
            try {
                const tempBookingData = sessionStorage.getItem('tempBooking');
                if (!tempBookingData) {
                    console.error("Không tìm thấy dữ liệu đặt bàn");
                    setError("Không tìm thấy dữ liệu đặt bàn");
                    setTimeout(() => { clearSavedBranch(); navigate("/dat-ban-dia-chi"); }, 3000);
                    return;
                }

                const bookingData = JSON.parse(tempBookingData);
                console.log("📦 Booking data:", bookingData);
                console.log("🔑 tableId:", bookingData.tableId);
                console.log("🔑 roomId:", bookingData.roomId);
                console.log("🔑 selectedType:", bookingData.selectedType);

                if (bookingData.orderCode !== parseInt(orderCode)) {
                    console.error("OrderCode không khớp");
                    setError("Mã giao dịch không hợp lệ");
                    setTimeout(() => { clearSavedBranch(); navigate("/dat-ban-dia-chi"); }, 3000);
                    return;
                }

                const token = localStorage.getItem('token');

                // Tạo reservation
                console.log("📡 Đang tạo reservation...");
                const response = await fetch(`${API}/api/reservations/full`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        userId: bookingData.userId,
                        branchId: bookingData.branchId,
                        tableId: bookingData.tableId,
                        roomId: bookingData.roomId,
                        reservationTime: bookingData.reservationTime,
                        customerName: bookingData.customerName,
                        customerPhone: bookingData.customerPhone,
                        customerEmail: bookingData.customerEmail,
                        note: bookingData.note,
                        depositAmount: bookingData.depositAmount,
                        items: bookingData.items
                    })
                });

                const result = await response.json();
                console.log("📥 Kết quả tạo reservation:", result);

                if (!response.ok) throw new Error(result.message || "Tạo đặt bàn thất bại");

                // ✅ Cập nhật trạng thái bàn HOẶC phòng thành RESERVED
                if (bookingData.tableId) {
                    const updated = await updateTableStatus(bookingData.tableId, "RESERVED");
                    console.log("Kết quả cập nhật bàn:", updated ? "THÀNH CÔNG" : "THẤT BẠI");
                } else if (bookingData.roomId) {
                    const updated = await updateRoomStatus(bookingData.roomId, "RESERVED");
                    console.log("Kết quả cập nhật phòng:", updated ? "THÀNH CÔNG" : "THẤT BẠI");
                } else {
                    console.warn("⚠️ Không có tableId hoặc roomId để cập nhật!");
                }

                setReservationInfo({
                    id: result.id,
                    branchName: bookingData.branchName || "Nhà hàng",
                    tableNumber: bookingData.tableNumber || (bookingData.roomId ? `Phòng ${bookingData.roomNumber || ""}` : "Chưa xác định"),
                    date: bookingData.date || bookingData.reservationTime?.split(' ')[0],
                    time: bookingData.time || bookingData.reservationTime?.split(' ')[1],
                    customerName: bookingData.customerName,
                    customerPhone: bookingData.customerPhone,
                    amount: bookingData.depositAmount,
                    paymentMethod: bookingData.paymentMethod === "full" ? "Thanh toán 100%" : "Đặt cọc 20%",
                    isRoom: !!bookingData.roomId
                });

                sessionStorage.removeItem('tempBooking');
                sessionStorage.removeItem('pendingPayment');
                clearSavedBranch();

            } catch (error) {
                console.error("Lỗi:", error);
                setError(error.message || "Thanh toán thành công nhưng đặt bàn thất bại");
            } finally {
                setLoading(false);
            }
        };

        if (orderCode) {
            createReservationAfterPayment();
        }
    }, [navigate, orderCode]);

    if (loading) {
        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            }}>
                <div style={{
                    background: "white",
                    padding: "40px 60px",
                    borderRadius: "16px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "72px" }}>✅</div>
                    <h1 style={{ color: "#28a745" }}>Thanh toán thành công!</h1>
                    <p>Đang xử lý đặt bàn của bạn...</p>
                    <div style={{ marginTop: "20px", display: "flex", gap: "8px", justifyContent: "center" }}>
                        <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite" }}></div>
                        <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite 0.2s" }}></div>
                        <div style={{ width: "8px", height: "8px", background: "#28a745", borderRadius: "50%", animation: "pulse 1s infinite 0.4s" }}></div>
                    </div>
                </div>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 0.3; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.2); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
            }}>
                <div style={{
                    background: "white",
                    padding: "40px 60px",
                    borderRadius: "16px",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "72px" }}>⚠️</div>
                    <h1 style={{ color: "#dc3545" }}>Có lỗi xảy ra</h1>
                    <p>{error}</p>
                    <button
                        onClick={() => { clearSavedBranch(); navigate("/dat-ban-dia-chi"); }}
                        style={{
                            marginTop: "20px",
                            padding: "10px 24px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }}
                    >
                        Quay lại đặt bàn
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "20px"
        }}>
            <div style={{
                background: "white",
                padding: "40px",
                borderRadius: "24px",
                maxWidth: "500px",
                width: "100%",
                textAlign: "center"
            }}>
                <div style={{ fontSize: "72px" }}>🎉</div>
                <h1 style={{ color: "#28a745" }}>Đặt bàn thành công!</h1>
                <p style={{ color: "#6c757d", marginBottom: "24px" }}>
                    Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi
                </p>

                {reservationInfo && (
                    <div style={{
                        background: "#f8f9fa",
                        borderRadius: "16px",
                        padding: "20px",
                        textAlign: "left",
                        marginBottom: "24px"
                    }}>
                        <h3 style={{ margin: "0 0 16px 0", color: "#333" }}>📋 Thông tin đặt bàn</h3>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Mã đặt bàn:</span>
                            <span style={{ fontWeight: "bold", color: "#28a745" }}>#{reservationInfo.id}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Nhà hàng:</span>
                            <span>{reservationInfo.branchName}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>{reservationInfo.isRoom ? "Phòng số:" : "Bàn số:"}</span>
                            <span>{reservationInfo.tableNumber}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Ngày giờ:</span>
                            <span>{reservationInfo.date} - {reservationInfo.time}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Khách hàng:</span>
                            <span>{reservationInfo.customerName}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Số điện thoại:</span>
                            <span>{reservationInfo.customerPhone}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                            <span style={{ color: "#6c757d" }}>Số tiền:</span>
                            <span style={{ fontWeight: "bold", color: "#dc3545" }}>{reservationInfo.amount?.toLocaleString()}đ</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#6c757d" }}>Hình thức:</span>
                            <span>{reservationInfo.paymentMethod}</span>
                        </div>
                    </div>
                )}

                <div style={{
                    background: "#e8f5e9",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "24px",
                    textAlign: "left"
                }}>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#2c7a4d" }}>📞 Chúng tôi sẽ liên hệ xác nhận với bạn</p>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#2c7a4d" }}>⏰ Vui lòng đến đúng giờ đã đặt</p>
                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#2c7a4d" }}>❌ Hủy bàn trước 1 tiếng nếu có thay đổi</p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                    <button
                        onClick={() => { clearSavedBranch(); navigate("/"); }}
                        style={{
                            flex: 1,
                            padding: "12px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500"
                        }}
                    >
                        🏠 Về trang chủ
                    </button>
                    <button
                        onClick={() => { clearSavedBranch(); navigate("/dat-ban-dia-chi"); }}
                        style={{
                            flex: 1,
                            padding: "12px",
                            background: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "500"
                        }}
                    >
                        📅 Đặt bàn mới
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;