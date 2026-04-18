import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TableSelectionModal from "../../customer/TableSelectionModal";
import FoodSelectionModal from "./FoodSelectionModal";
import styles from "./BookingDetail.module.css";

const API = "http://localhost:8080";

const BookingDetail = () => {
    const { state } = useLocation();
    const branch = state?.branch;

    const [step, setStep] = useState(2);
    const [showModal, setShowModal] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [user, setUser] = useState({});

    const [data, setData] = useState({
        date: "",
        time: "",
        table: null,
        tableNumber: "",
        customerName: "",
        phone: "",
        email: "",
        note: "",
        payment: "deposit",
        selectedFoods: [],
        selectedType: null,
        selectedTableId: null,
        selectedRoomId: null
    });

    // 🔥 Lấy thông tin user từ localStorage khi component mount
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        console.log("User data loaded:", userData);
        setUser(userData);

        // 🔥 Tự động điền tên và số điện thoại nếu có
        if (userData.fullName) {
            setData(prev => ({
                ...prev,
                customerName: userData.fullName,
                phone: userData.phone || "",
                email: userData.email || ""
            }));
        } else if (userData.username) {
            setData(prev => ({
                ...prev,
                customerName: userData.username,
                phone: userData.phone || "",
                email: userData.email || ""
            }));
        }
    }, []);

    // 🔥 Kiểm tra nếu đến từ trang hủy thanh toán
    useEffect(() => {
        const fromCancel = sessionStorage.getItem('paymentCancelled');
        if (fromCancel) {
            // Reset toàn bộ dữ liệu đặt bàn nhưng giữ lại thông tin user
            setData(prev => ({
                date: "",
                time: "",
                table: null,
                tableNumber: "",
                customerName: user.fullName || user.username || prev.customerName || "",
                phone: user.phone || prev.phone || "",
                email: user.email || prev.email || "",
                note: "",
                payment: "deposit",
                selectedFoods: [],
                selectedType: null,
                selectedTableId: null,
                selectedRoomId: null
            }));
            setStep(2);
            sessionStorage.removeItem('paymentCancelled');
        }
    }, [user]);

    // Validate functions
    const validateName = (name) => {
        if (!name || name.trim() === "") return "Vui lòng nhập họ tên";
        if (name.trim().length < 2) return "Họ tên phải có ít nhất 2 ký tự";
        if (name.trim().length > 50) return "Họ tên không được quá 50 ký tự";
        if (/[0-9]/.test(name)) return "Họ tên không được chứa số";
        return "";
    };

    const validatePhone = (phone) => {
        if (!phone || phone.trim() === "") return "Vui lòng nhập số điện thoại";
        const cleanPhone = phone.replace(/\s/g, '');
        const phoneRegex = /^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;
        if (!phoneRegex.test(cleanPhone)) return "Số điện thoại không hợp lệ (VD: 0912345678)";
        return "";
    };

    const validateEmail = (email) => {
        if (email && email.trim() !== "") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return "Email không hợp lệ (VD: example@email.com)";
        }
        return "";
    };

    const validateCurrentStep = () => {
        const newErrors = {};
        if (step === 5) {
            const nameError = validateName(data.customerName);
            if (nameError) newErrors.customerName = nameError;
            const phoneError = validatePhone(data.phone);
            if (phoneError) newErrors.phone = phoneError;
            const emailError = validateEmail(data.email);
            if (emailError) newErrors.email = emailError;
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const next = () => {
        if (step === 5) {
            if (validateCurrentStep()) setStep(step + 1);
        } else {
            setStep(step + 1);
        }
    };

    const back = () => setStep(step - 1);

    const handleInputChange = (field, value) => {
        setData({ ...data, [field]: value });
        if (errors[field]) setErrors({ ...errors, [field]: "" });

        if (field === 'customerName') {
            const error = validateName(value);
            setErrors(prev => ({ ...prev, customerName: error || "" }));
        }
        if (field === 'phone') {
            const error = validatePhone(value);
            setErrors(prev => ({ ...prev, phone: error || "" }));
        }
        if (field === 'email') {
            const error = validateEmail(value);
            setErrors(prev => ({ ...prev, email: error || "" }));
        }
    };

    const handleSelectTable = (selectedItem) => {
        setData({
            ...data,
            table: selectedItem.id,
            tableNumber: selectedItem.number,
            selectedType: selectedItem.type,
            selectedTableId: selectedItem.tableId,
            selectedRoomId: selectedItem.roomId
        });
    };

    const handleAddMultipleFoods = (newFoods) => {
        setData(prevData => {
            const updatedFoods = [...prevData.selectedFoods];
            const foodsToAdd = Array.isArray(newFoods) ? newFoods : [newFoods];

            foodsToAdd.forEach(newFood => {
                const existingIndex = updatedFoods.findIndex(f => f.branchFoodId === newFood.branchFoodId);
                if (existingIndex !== -1) {
                    updatedFoods[existingIndex].quantity += newFood.quantity;
                } else {
                    updatedFoods.push({
                        id: newFood.branchFoodId,
                        branchFoodId: newFood.branchFoodId,
                        foodId: newFood.foodId,
                        name: newFood.name,
                        price: newFood.price,
                        quantity: newFood.quantity,
                        imageUrl: newFood.imageUrl
                    });
                }
            });
            return { ...prevData, selectedFoods: updatedFoods };
        });
    };

    const handleRemoveFood = (branchFoodId) => {
        setData({
            ...data,
            selectedFoods: data.selectedFoods.filter(f => f.branchFoodId !== branchFoodId)
        });
    };

    const updateQuantity = (branchFoodId, quantity) => {
        if (quantity <= 0) {
            handleRemoveFood(branchFoodId);
        } else {
            setData({
                ...data,
                selectedFoods: data.selectedFoods.map(f =>
                    f.branchFoodId === branchFoodId ? { ...f, quantity } : f
                )
            });
        }
    };

    const totalFoodAmount = data.selectedFoods.reduce((sum, f) => sum + (f.price * f.quantity), 0);
    const getPayableAmount = () => {
        return data.payment === "full" ? totalFoodAmount * 0.9 : totalFoodAmount * 0.2;
    };

    const createPaymentLink = async (reservationId, orderCode) => {
        try {
            const payableAmount = getPayableAmount();
            const items = data.selectedFoods.map(food => ({
                name: food.name,
                quantity: food.quantity,
                price: Math.floor(food.price)
            }));

            const safeOrderCode = reservationId;
            const shortDescription = `Dat ban ${branch?.name?.substring(0, 10) || ''}`.substring(0, 25);

            const paymentRequest = {
                orderCode: safeOrderCode,
                amount: Math.floor(payableAmount),
                description: shortDescription,
                returnUrl: `${window.location.origin}/payment-success?reservationId=${reservationId}`,
                cancelUrl: `${window.location.origin}/payment-cancel`,
                items: items
            };

            console.log("📤 Payment request:", paymentRequest);

            const response = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(paymentRequest)
            });

            const responseText = await response.text();
            console.log("📥 Raw PayOS response:", responseText);

            if (!response.ok) {
                throw new Error(`PayOS error: ${responseText}`);
            }

            const result = JSON.parse(responseText);
            console.log("✅ PayOS result:", result);

            if (result.code === "00" && result.data?.checkoutUrl) {
                window.open(result.data.checkoutUrl, "_blank");
                return true;
            } else if (result.checkoutUrl) {
                window.open(result.checkoutUrl, "_blank");
                return true;
            } else {
                console.error("Unexpected response:", result);
                throw new Error(result.desc || "Không nhận được link thanh toán");
            }
        } catch (error) {
            console.error("❌ Error creating payment link:", error);
            alert(`⚠️ Đặt bàn thành công nhưng tạo link thanh toán thất bại!\nLỗi: ${error.message}`);
            return false;
        }
    };

    const handleBooking = async () => {
        if (!data.table) {
            alert("❌ Vui lòng chọn bàn");
            return;
        }

        const nameError = validateName(data.customerName);
        if (nameError) {
            alert(`❌ ${nameError}`);
            return;
        }

        const phoneError = validatePhone(data.phone);
        if (phoneError) {
            alert(`❌ ${phoneError}`);
            return;
        }

        const emailError = validateEmail(data.email);
        if (emailError) {
            alert(`❌ ${emailError}`);
            return;
        }

        if (data.selectedFoods.length === 0) {
            alert("❌ Vui lòng chọn món ăn");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const userData = JSON.parse(localStorage.getItem('user') || '{}');

            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const reservationDateTime = `${data.date} ${data.time}`;

            const requestData = {
                userId: userData.id,
                branchId: branch?.id,
                tableId: data.selectedType === "table" ? data.selectedTableId : null,
                roomId: data.selectedType === "room" ? data.selectedRoomId : null,
                reservationTime: reservationDateTime,
                depositAmount: getPayableAmount(),
                customerName: data.customerName.trim(),
                customerPhone: data.phone.replace(/\s/g, ''),
                customerEmail: data.email || "",
                note: data.note || "",
                items: data.selectedFoods.map(f => ({
                    branchFoodId: f.branchFoodId,
                    quantity: f.quantity
                }))
            };

            const payableAmount = getPayableAmount();
            const items = data.selectedFoods.map(food => ({
                name: food.name,
                quantity: food.quantity,
                price: Math.floor(food.price)
            }));

            const tempOrderCode = Date.now() % 2147483647;
            const shortDescription = `Dat ban ${branch?.name?.substring(0, 10) || ''}`.substring(0, 25);

            const paymentRequest = {
                orderCode: tempOrderCode,
                amount: Math.floor(payableAmount),
                description: shortDescription,
                returnUrl: `${window.location.origin}/payment-success`,
                cancelUrl: `${window.location.origin}/payment-cancel`,
                items: items
            };

            const paymentResponse = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(paymentRequest)
            });

            const paymentResult = await paymentResponse.json();
            console.log("PayOS response:", paymentResult);

            if (paymentResult.code !== "00" || !paymentResult.data?.checkoutUrl) {
                throw new Error(paymentResult.desc || "Không thể tạo link thanh toán");
            }

            const tempBookingData = {
                ...requestData,
                orderCode: tempOrderCode
            };
            sessionStorage.setItem('tempBooking', JSON.stringify(tempBookingData));
            console.log("💾 Saved temp booking data to sessionStorage");

            window.open(paymentResult.data.checkoutUrl, "_blank");
            alert("Vui lòng thanh toán để hoàn tất đặt bàn!");

        } catch (err) {
            console.error("❌ Booking error:", err);
            alert(`❌ ${err.message || "Vui lòng thử lại sau"}`);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableTimes = () => {
        const allTimes = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
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
        <div className={styles.bookingWrapper}>
            <div className={styles.bookingLeft}>
                <h2>Đặt bàn - {branch?.name}</h2>

                {/* STEP 2: Chọn ngày & giờ */}
                {step === 2 && (
                    <div className={styles.card}>
                        <h3>📅 Chọn ngày & giờ</h3>
                        <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                            onChange={(e) => setData({ ...data, date: e.target.value, time: "" })}
                        />
                        <select
                            value={data.time}
                            onChange={(e) => setData({ ...data, time: e.target.value })}
                            disabled={!data.date}
                        >
                            <option value="">-- Chọn giờ --</option>
                            {getAvailableTimes().map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                        {data.date === new Date().toISOString().split('T')[0] && (
                            <p className={styles.dateWarning}>⏰ Chỉ hiển thị giờ trong tương lai</p>
                        )}
                        <button onClick={next} disabled={!data.date || !data.time} className={styles.nextBtn}>
                            Tiếp tục →
                        </button>
                    </div>
                )}

                {/* STEP 3: Chọn bàn */}
                {step === 3 && (
                    <div className={styles.card}>
                        <h3>🪑 Chọn bàn</h3>
                        <button onClick={() => setShowModal(true)} className={styles.selectBtn}>
                            {data.table ? `✅ Đã chọn bàn ${data.tableNumber}` : "🔍 Chọn bàn"}
                        </button>
                        {data.table && (
                            <p className={styles.selectedInfo}>✅ Bạn đã chọn bàn số {data.tableNumber}</p>
                        )}
                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button onClick={next} disabled={!data.table} className={styles.nextBtn}>Tiếp tục →</button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Chọn món */}
                {step === 4 && (
                    <div className={styles.card}>
                        <h3>🍽️ Chọn món ăn</h3>
                        <button onClick={() => setShowMenuModal(true)} className={styles.addFoodBtn}>
                            + Thêm món
                        </button>

                        {data.selectedFoods.length > 0 ? (
                            <div className={styles.selectedFoods}>
                                <h4>📋 Món đã chọn:</h4>
                                {data.selectedFoods.map(food => (
                                    <div key={food.branchFoodId} className={styles.foodItem}>
                                        <img
                                            src={food.imageUrl?.startsWith("http") ? food.imageUrl : `${API}${food.imageUrl || ""}`}
                                            alt={food.name}
                                            className={styles.foodItemImage}
                                            onError={(e) => { e.target.src = "/default-food.jpg"; }}
                                        />
                                        <div className={styles.foodInfo}>
                                            <span className={styles.foodName}>{food.name}</span>
                                            <span className={styles.foodPrice}>{food.price.toLocaleString()}đ</span>
                                        </div>
                                        <div className={styles.foodControls}>
                                            <button onClick={() => updateQuantity(food.branchFoodId, food.quantity - 1)}>-</button>
                                            <span className={styles.quantity}>{food.quantity}</span>
                                            <button onClick={() => updateQuantity(food.branchFoodId, food.quantity + 1)}>+</button>
                                            <button onClick={() => handleRemoveFood(food.branchFoodId)} className={styles.removeBtn}>🗑️</button>
                                        </div>
                                        <div className={styles.foodSubtotal}>
                                            {(food.price * food.quantity).toLocaleString()}đ
                                        </div>
                                    </div>
                                ))}
                                <div className={styles.foodTotal}>
                                    <strong>Tổng cộng:</strong> {totalFoodAmount.toLocaleString()}đ
                                </div>
                            </div>
                        ) : (
                            <p className={styles.emptyFoods}>Chưa có món nào. Vui lòng thêm món!</p>
                        )}

                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button onClick={next} className={styles.nextBtn}>Tiếp tục →</button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Thông tin khách - ĐÃ TỰ ĐỘNG ĐIỀN */}
                {step === 5 && (
                    <div className={styles.card}>
                        <h3>👤 Thông tin khách hàng</h3>
                        <p className={styles.requiredLabel}>* Thông tin bắt buộc</p>

                        <div className={`${styles.formGroup} ${errors.customerName ? styles.error : ''}`}>
                            <input
                                type="text"
                                placeholder="Họ tên *"
                                value={data.customerName}
                                onChange={(e) => handleInputChange('customerName', e.target.value)}
                                className={errors.customerName ? styles.errorInput : ''}
                            />
                            {errors.customerName && <span className={styles.errorMessage}>{errors.customerName}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${errors.phone ? styles.error : ''}`}>
                            <input
                                type="tel"
                                placeholder="Số điện thoại * (VD: 0912345678)"
                                value={data.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className={errors.phone ? styles.errorInput : ''}
                            />
                            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                        </div>

                        <div className={`${styles.formGroup} ${errors.email ? styles.error : ''}`}>
                            <input
                                type="email"
                                placeholder="Email (không bắt buộc)"
                                value={data.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className={errors.email ? styles.errorInput : ''}
                            />
                            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                            <span className={styles.helperText}>💡 Không bắt buộc, nhập để nhận xác nhận qua email</span>
                        </div>

                        <textarea
                            placeholder="Ghi chú (không bắt buộc)"
                            value={data.note}
                            onChange={(e) => setData({ ...data, note: e.target.value })}
                            rows="3"
                        />
                        <span className={styles.helperText}>💡 Ví dụ: yêu cầu đặc biệt, dị ứng thực phẩm...</span>

                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button
                                onClick={next}
                                disabled={!!errors.customerName || !!errors.phone || !data.customerName || !data.phone}
                                className={styles.nextBtn}
                            >
                                Tiếp tục →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6: Thanh toán */}
                {step === 6 && (
                    <div className={styles.card}>
                        <h3>💰 Thanh toán online</h3>

                        <div className={styles.paymentSummary}>
                            <div className={styles.summaryRow}>
                                <span>Tổng tiền món:</span>
                                <span>{totalFoodAmount.toLocaleString()}đ</span>
                            </div>
                            {data.payment === "full" && (
                                <div className={`${styles.summaryRow} ${styles.discount}`}>
                                    <span>Giảm giá (thanh toán trước):</span>
                                    <span>-{(totalFoodAmount * 0.1).toLocaleString()}đ</span>
                                </div>
                            )}
                            <div className={`${styles.summaryRow} ${styles.total}`}>
                                <span>Phải thanh toán:</span>
                                <span>{getPayableAmount().toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className={styles.paymentOptions}>
                            <label className={`${styles.paymentOption} ${data.payment === "deposit" ? styles.active : ""}`}>
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

                            <label className={`${styles.paymentOption} ${data.payment === "full" ? styles.active : ""}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    value="full"
                                    checked={data.payment === "full"}
                                    onChange={() => setData({ ...data, payment: "full" })}
                                />
                                <div>
                                    <strong>💳 Thanh toán trước 100% <span className={styles.discountBadge}>GIẢM 10%</span></strong>
                                    <p>Tiết kiệm {(totalFoodAmount * 0.1).toLocaleString()}đ, chỉ còn {Math.floor(totalFoodAmount * 0.9).toLocaleString()}đ</p>
                                </div>
                            </label>
                        </div>

                        <button onClick={handleBooking} disabled={loading} className={styles.payosBtn}>
                            {loading ? "🔄 Đang xử lý..." : "💳 Thanh toán qua PayOS"}
                        </button>

                        <div className={styles.actions} style={{ marginTop: "16px" }}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT - Tóm tắt */}
            <div className={styles.bookingRight}>
                <h3>📋 Tóm tắt đặt bàn</h3>
                <div className={styles.summaryDetails}>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryIcon}>📍</span>
                        <span>{branch?.name || "Chưa chọn"}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryIcon}>📅</span>
                        <span>{data.date || "--"} - {data.time || "--"}</span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryIcon}>🪑</span>
                        <span>Bàn {data.tableNumber || "Chưa chọn"}</span>
                    </div>

                    {data.selectedFoods.length > 0 && (
                        <>
                            <hr />
                            <div className={styles.summaryFoods}>
                                <strong>🍜 Món đã chọn:</strong>
                                {data.selectedFoods.map(f => (
                                    <div key={f.branchFoodId} className={styles.summaryFood}>
                                        {f.name} x{f.quantity}: {(f.price * f.quantity).toLocaleString()}đ
                                    </div>
                                ))}
                            </div>
                            <hr />
                            <div className={styles.summaryTotal}>
                                <strong>Tổng tiền món:</strong> {totalFoodAmount.toLocaleString()}đ
                            </div>
                            {data.payment === "full" && (
                                <div className={styles.summaryDiscount}>
                                    Giảm 10%: -{(totalFoodAmount * 0.1).toLocaleString()}đ
                                </div>
                            )}
                            <div className={styles.summaryPayable}>
                                <strong>Phải thanh toán:</strong> {getPayableAmount().toLocaleString()}đ
                            </div>
                        </>
                    )}
                </div>
            </div>

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
                onSelectFood={handleAddMultipleFoods}
                branchId={branch?.id}
                selectedFoods={data.selectedFoods}
            />
        </div>
    );
};

export default BookingDetail;