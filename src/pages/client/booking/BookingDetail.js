import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import TableSelectionModal from "../../customer/TableSelectionModal";
import FoodSelectionModal from "./FoodSelectionModal";
import "./BookingDetail.css";

const API = "http://localhost:8080";

const BookingDetail = () => {
    const { state } = useLocation();
    const branch = state?.branch;

    const [step, setStep] = useState(2);
    const [showModal, setShowModal] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [data, setData] = useState({
        date: "",
        time: "",
        table: null,
        tableNumber: "",
        customerName: "",
        phone: "",
        email: "",
        note: "",
        payment: "deposit", // deposit hoặc full
        selectedFoods: []
    });

    const next = () => setStep(step + 1);
    const back = () => setStep(step - 1);

    // Nhận bàn từ Modal
    const handleSelectTable = (table) => {
        setData({
            ...data,
            table: table.id,
            tableNumber: table.number
        });
    };

    // Thêm món vào danh sách
    const handleAddFood = (food) => {
        const existing = data.selectedFoods.find(f => f.id === food.id);
        if (existing) {
            setData({
                ...data,
                selectedFoods: data.selectedFoods.map(f =>
                    f.id === food.id ? { ...f, quantity: f.quantity + 1 } : f
                )
            });
        } else {
            setData({
                ...data,
                selectedFoods: [...data.selectedFoods, {
                    id: food.id,
                    name: food.name,
                    price: food.price,
                    quantity: 1,
                    imageUrl: food.imageUrl
                }]
            });
        }
    };

    // Xóa món
    const handleRemoveFood = (foodId) => {
        setData({
            ...data,
            selectedFoods: data.selectedFoods.filter(f => f.id !== foodId)
        });
    };

    // Cập nhật số lượng
    const updateQuantity = (foodId, quantity) => {
        if (quantity <= 0) {
            handleRemoveFood(foodId);
        } else {
            setData({
                ...data,
                selectedFoods: data.selectedFoods.map(f =>
                    f.id === foodId ? { ...f, quantity } : f
                )
            });
        }
    };

    // Tính tổng tiền món
    const totalFoodAmount = data.selectedFoods.reduce((sum, f) => sum + (f.price * f.quantity), 0);

    // Tính tiền thanh toán theo hình thức
    const getPayableAmount = () => {
        if (data.payment === "full") {
            return totalFoodAmount * 0.9; // Giảm 10%
        }
        return totalFoodAmount * 0.2; // Cọc 20%
    };

    // Tạo payment link qua PayOS
    const createPaymentLink = async (reservationId, orderCode) => {
        try {
            const payableAmount = getPayableAmount();

            // Tạo danh sách items cho PayOS
            const items = data.selectedFoods.map(food => ({
                name: food.name,
                quantity: food.quantity,
                price: Math.floor(food.price)
            }));

            const paymentRequest = {
                orderCode: orderCode,
                amount: Math.floor(payableAmount),
                description: `Thanh toán đặt bàn ${branch?.name} - ${data.date} ${data.time}`,
                returnUrl: `${window.location.origin}/booking-success?reservationId=${reservationId}`,
                cancelUrl: `${window.location.origin}/booking-cancel`,
                items: items
            };

            console.log("💰 Creating payment link:", paymentRequest);

            const response = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(paymentRequest)
            });

            if (!response.ok) {
                throw new Error("Không thể tạo link thanh toán");
            }

            const result = await response.json();
            console.log("✅ Payment link created:", result);

            // PayOS trả về checkoutUrl
            if (result.data && result.data.checkoutUrl) {
                window.open(result.data.checkoutUrl, "_blank");
                return true;
            } else if (result.checkoutUrl) {
                window.open(result.checkoutUrl, "_blank");
                return true;
            } else {
                throw new Error("Không nhận được link thanh toán");
            }

        } catch (error) {
            console.error("❌ Error creating payment link:", error);
            throw error;
        }
    };

    // Submit booking - Thanh toán online qua PayOS
    const handleBooking = async () => {
        // Validate
        if (!data.table) {
            alert("❌ Vui lòng chọn bàn");
            return;
        }
        if (!data.customerName) {
            alert("❌ Vui lòng nhập họ tên");
            return;
        }
        if (!data.phone) {
            alert("❌ Vui lòng nhập số điện thoại");
            return;
        }
        if (data.selectedFoods.length === 0) {
            alert("❌ Vui lòng chọn món ăn");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Tạo orderCode duy nhất (timestamp + random)
            const orderCode = Date.now();

            // Format dữ liệu theo API backend
            const requestData = {
                branchId: branch?.id,
                bookingDate: data.date,
                bookingTime: data.time,
                tableIds: [data.table],
                customerName: data.customerName,
                phone: data.phone,
                email: data.email || "",
                note: data.note || "",
                paymentType: data.payment === "full" ? "FULL_PREPAY" : "DEPOSIT",
                foods: data.selectedFoods.map(f => ({
                    foodId: f.id,
                    quantity: f.quantity
                })),
                orderCode: orderCode,
                amount: Math.floor(getPayableAmount())
            };

            console.log("📤 Sending booking request:", requestData);

            // Gọi API tạo reservation
            const response = await fetch(`${API}/api/reservations/full`, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || "Đặt bàn thất bại");
            }

            const result = await response.json();
            console.log("✅ Booking success:", result);

            const reservationId = result.id || result.reservationId;

            // Tạo payment link qua PayOS
            await createPaymentLink(reservationId, orderCode);

            // Hiển thị thông báo
            alert(`🎉 Đặt bàn thành công!\n\nMã đặt bàn: ${reservationId}\nSố tiền cần thanh toán: ${getPayableAmount().toLocaleString()}đ\n\nVui lòng thanh toán để hoàn tất đặt bàn.\nCửa sổ thanh toán đã được mở.`);

        } catch (err) {
            console.error("❌ Booking error:", err);
            alert(`❌ Đặt bàn thất bại!\n${err.message || "Vui lòng thử lại sau"}`);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableTimes = () => {
        const allTimes = [
            "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
            "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
        ];

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const selectedDate = data.date;

        if (!selectedDate || selectedDate !== new Date().toISOString().split('T')[0]) {
            return allTimes;
        }

        return allTimes.filter(time => {
            const [hour, minute] = time.split(':').map(Number);
            if (hour > currentHour) return true;
            if (hour === currentHour && minute > currentMinute) return true;
            return false;
        });
    };

    return (
        <div className="booking-wrapper">
            {/* LEFT */}
            <div className="booking-left">
                <h2>Đặt bàn - {branch?.name}</h2>

                {/* STEP 2: Chọn ngày & giờ */}
                {step === 2 && (
                    <div className="card">
                        <h3>📅 Chọn ngày & giờ</h3>

                        <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            onChange={(e) => {
                                setData({ ...data, date: e.target.value, time: "" });
                            }}
                            placeholder="Chọn ngày"
                        />

                        <select
                            value={data.time}
                            onChange={(e) => setData({ ...data, time: e.target.value })}
                            style={{ padding: '10px', marginTop: '10px', width: '100%' }}
                            disabled={!data.date}
                        >
                            <option value="">-- Chọn giờ --</option>
                            {getAvailableTimes().map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>

                        {data.date === new Date().toISOString().split('T')[0] && (
                            <p style={{ fontSize: '12px', color: '#D4AF37', marginTop: '8px' }}>
                                ⏰ Chỉ hiển thị giờ trong tương lai
                            </p>
                        )}

                        <button onClick={next} disabled={!data.date || !data.time}>
                            Tiếp tục
                        </button>
                    </div>
                )}

                {/* STEP 3: Chọn bàn */}
                {step === 3 && (
                    <div className="card">
                        <h3>🪑 Chọn bàn</h3>

                        <button onClick={() => setShowModal(true)} className="select-btn">
                            {data.table ? `✅ Đã chọn bàn ${data.tableNumber}` : "🔍 Chọn bàn"}
                        </button>

                        {data.table && (
                            <p className="selected-info">Bạn đã chọn bàn số {data.tableNumber}</p>
                        )}

                        <div className="actions">
                            <button onClick={back} className="back-btn">← Quay lại</button>
                            <button onClick={next} disabled={!data.table} className="next-btn">
                                Tiếp tục →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Chọn món */}
                {step === 4 && (
                    <div className="card">
                        <h3>🍽️ Chọn món ăn</h3>

                        <button onClick={() => setShowMenuModal(true)} className="add-food-btn">
                            + Thêm món
                        </button>

                        {data.selectedFoods.length > 0 ? (
                            <div className="selected-foods">
                                <h4>📋 Món đã chọn:</h4>
                                {data.selectedFoods.map(food => (
                                    <div key={food.id} className="food-item">
                                        <img
                                            src={food.imageUrl?.startsWith("http") ? food.imageUrl : `${API}${food.imageUrl || ""}`}
                                            alt={food.name}
                                            className="food-item-image"
                                            onError={(e) => {
                                                e.target.src = "/default-food.jpg";
                                            }}
                                        />
                                        <div className="food-info">
                                            <span className="food-name">{food.name}</span>
                                            <span className="food-price">{food.price.toLocaleString()}đ</span>
                                        </div>
                                        <div className="food-controls">
                                            <button onClick={() => updateQuantity(food.id, food.quantity - 1)}>-</button>
                                            <span className="quantity">{food.quantity}</span>
                                            <button onClick={() => updateQuantity(food.id, food.quantity + 1)}>+</button>
                                            <button onClick={() => handleRemoveFood(food.id)} className="remove-btn">🗑️</button>
                                        </div>
                                        <div className="food-subtotal">
                                            {(food.price * food.quantity).toLocaleString()}đ
                                        </div>
                                    </div>
                                ))}
                                <div className="food-total">
                                    <strong>Tổng cộng:</strong> {totalFoodAmount.toLocaleString()}đ
                                </div>
                            </div>
                        ) : (
                            <p className="empty-foods">Chưa có món nào. Vui lòng thêm món!</p>
                        )}

                        <div className="actions">
                            <button onClick={back} className="back-btn">← Quay lại</button>
                            <button onClick={next} className="next-btn">
                                Tiếp tục →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Thông tin khách */}
                {step === 5 && (
                    <div className="card">
                        <h3>👤 Thông tin khách hàng</h3>

                        <input
                            type="text"
                            placeholder="Họ tên *"
                            value={data.customerName}
                            onChange={(e) => setData({ ...data, customerName: e.target.value })}
                        />

                        <input
                            type="tel"
                            placeholder="Số điện thoại *"
                            value={data.phone}
                            onChange={(e) => setData({ ...data, phone: e.target.value })}
                        />

                        <input
                            type="email"
                            placeholder="Email (nhận xác nhận)"
                            value={data.email}
                            onChange={(e) => setData({ ...data, email: e.target.value })}
                        />

                        <textarea
                            placeholder="Ghi chú (yêu cầu đặc biệt, dị ứng thực phẩm...)"
                            value={data.note}
                            onChange={(e) => setData({ ...data, note: e.target.value })}
                            rows="3"
                        />

                        <div className="actions">
                            <button onClick={back} className="back-btn">← Quay lại</button>
                            <button onClick={next} disabled={!data.customerName || !data.phone} className="next-btn">
                                Tiếp tục →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6: Thanh toán online */}
                {step === 6 && (
                    <div className="card">
                        <h3>💰 Thanh toán online</h3>

                        <div className="payment-summary">
                            <div className="summary-row">
                                <span>Tổng tiền món:</span>
                                <span>{totalFoodAmount.toLocaleString()}đ</span>
                            </div>
                            {data.payment === "full" && (
                                <div className="summary-row discount">
                                    <span>Giảm giá (thanh toán trước):</span>
                                    <span>-{(totalFoodAmount * 0.1).toLocaleString()}đ</span>
                                </div>
                            )}
                            <div className="summary-row total">
                                <span>Phải thanh toán:</span>
                                <span>{getPayableAmount().toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className="payment-options">
                            <label className={`payment-option ${data.payment === "deposit" ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    value="deposit"
                                    checked={data.payment === "deposit"}
                                    onChange={() => setData({ ...data, payment: "deposit" })}
                                />
                                <div>
                                    <strong>💎 Đặt cọc 20%</strong>
                                    <p>Thanh toán {Math.floor(totalFoodAmount * 0.2).toLocaleString()}đ hôm nay, còn lại khi đến nhà hàng</p>
                                </div>
                            </label>

                            <label className={`payment-option ${data.payment === "full" ? "active" : ""}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    value="full"
                                    checked={data.payment === "full"}
                                    onChange={() => setData({ ...data, payment: "full" })}
                                />
                                <div>
                                    <strong>💳 Thanh toán trước 100% <span className="discount-badge">GIẢM 10%</span></strong>
                                    <p>Tiết kiệm {(totalFoodAmount * 0.1).toLocaleString()}đ, chỉ còn {Math.floor(totalFoodAmount * 0.9).toLocaleString()}đ</p>
                                </div>
                            </label>
                        </div>

                        <button
                            onClick={handleBooking}
                            disabled={loading}
                            className="payos-btn"
                            style={{
                                width: "100%",
                                padding: "14px",
                                marginTop: "24px",
                                background: "#D4AF37",
                                border: "none",
                                borderRadius: "8px",
                                color: "#1f2937",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "16px",
                                transition: "all 0.3s ease"
                            }}
                        >
                            {loading ? "🔄 Đang xử lý..." : "💳 Thanh toán qua PayOS"}
                        </button>

                        <div className="actions" style={{ marginTop: "16px" }}>
                            <button onClick={back} className="back-btn">← Quay lại</button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT - Tóm tắt */}
            <div className="booking-right">
                <h3>📋 Tóm tắt đặt bàn</h3>

                <div className="summary-details">
                    <div className="summary-item">
                        <span className="summary-icon">📍</span>
                        <span>{branch?.name || "Chưa chọn"}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-icon">📅</span>
                        <span>{data.date || "--"} - {data.time || "--"}</span>
                    </div>
                    <div className="summary-item">
                        <span className="summary-icon">🪑</span>
                        <span>Bàn {data.tableNumber || "Chưa chọn"}</span>
                    </div>

                    {data.selectedFoods.length > 0 && (
                        <>
                            <hr />
                            <div className="summary-foods">
                                <strong>🍜 Món đã chọn:</strong>
                                {data.selectedFoods.map(f => (
                                    <div key={f.id} className="summary-food">
                                        {f.name} x{f.quantity}: {(f.price * f.quantity).toLocaleString()}đ
                                    </div>
                                ))}
                            </div>
                            <hr />
                            <div className="summary-total">
                                <strong>Tổng tiền món:</strong> {totalFoodAmount.toLocaleString()}đ
                            </div>
                            {data.payment === "full" && (
                                <div className="summary-discount">
                                    Giảm 10%: -{(totalFoodAmount * 0.1).toLocaleString()}đ
                                </div>
                            )}
                            <div className="summary-payable">
                                <strong>Phải thanh toán:</strong> {getPayableAmount().toLocaleString()}đ
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <TableSelectionModal
                show={showModal}
                onClose={() => setShowModal(false)}
                selectTable={handleSelectTable}
                branchId={branch?.id}
                date={data.date}
                time={data.time}
            />

            <FoodSelectionModal
                show={showMenuModal}
                onClose={() => setShowMenuModal(false)}
                onSelectFood={handleAddFood}
                branchId={branch?.id}
            />
        </div>
    );
};

export default BookingDetail;