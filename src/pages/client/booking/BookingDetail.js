import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TableSelectionModal from "../../customer/TableSelectionModal";
import FoodSelectionModal from "./FoodSelectionModal";
import styles from "./BookingDetail.module.css";

const API = "http://localhost:8080";

const STEPS = [
    { id: 2, label: "Ngày giờ" },
    { id: 3, label: "Bàn" },
    { id: 4, label: "Món ăn" },
    { id: 5, label: "Thông tin" },
    { id: 6, label: "Thanh toán" },
];

const BookingDetail = () => {
    const { state } = useLocation();
    const branch = state?.branch;

    const [step, setStep] = useState(2);
    const [showModal, setShowModal] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [bookingSuccessInfo, setBookingSuccessInfo] = useState(null);

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
        selectedRoomId: null,
    });

    // Khôi phục branch từ nhiều nguồn
    useEffect(() => {
        let currentBranch = branch;
        if (!currentBranch?.id) {
            const savedBranch = sessionStorage.getItem('currentBranch');
            if (savedBranch) {
                try {
                    currentBranch = JSON.parse(savedBranch);
                    console.log("🔄 Đã khôi phục branch:", currentBranch);
                } catch (e) { }
            }
        }
        if (currentBranch?.id) {
            sessionStorage.setItem('currentBranch', JSON.stringify(currentBranch));
        } else {
            console.error("❌ KHÔNG CÓ BRANCH!");
            setTimeout(() => window.location.href = '/dat-ban-dia-chi', 2000);
        }
    }, [branch]);

    // Khôi phục dữ liệu khi quay lại từ hủy thanh toán
    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem("user") || "{}");
        const fromCancel = sessionStorage.getItem('paymentCancelled');
        const restoreData = sessionStorage.getItem('bookingDataToRestore');

        if (fromCancel && restoreData) {
            try {
                const savedData = JSON.parse(restoreData);
                setData(prev => ({
                    ...prev,
                    date: savedData.reservationTime?.split(' ')[0] || "",
                    time: savedData.reservationTime?.split(' ')[1] || "",
                    selectedType: savedData.tableId ? "table" : (savedData.roomId ? "room" : null),
                    selectedTableId: savedData.tableId || null,
                    selectedRoomId: savedData.roomId || null,
                    customerName: savedData.customerName || userData.fullName || userData.username || "",
                    phone: savedData.customerPhone || userData.phone || "",
                    email: savedData.customerEmail || userData.email || "",
                    note: savedData.note || "",
                    payment: savedData.paymentMethod || "deposit",
                    selectedFoods: savedData.selectedFoods || []
                }));
                sessionStorage.removeItem('bookingDataToRestore');
                sessionStorage.removeItem('paymentCancelled');
            } catch (error) {
                console.error("Lỗi khôi phục:", error);
            }
        } else if (userData.fullName || userData.username) {
            setData(prev => ({
                ...prev,
                customerName: userData.fullName || userData.username,
                phone: userData.phone || "",
                email: userData.email || "",
            }));
        }
    }, []);

    // Validation
    const validateName = (v) => {
        if (!v?.trim()) return "Vui lòng nhập họ tên";
        if (v.trim().length < 2) return "Họ tên phải có ít nhất 2 ký tự";
        if (v.trim().length > 50) return "Họ tên không được quá 50 ký tự";
        if (/[0-9]/.test(v)) return "Họ tên không được chứa số";
        return "";
    };

    const validatePhone = (v) => {
        if (!v?.trim()) return "Vui lòng nhập số điện thoại";
        if (!/^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/.test(v.replace(/\s/g, "")))
            return "Số điện thoại không hợp lệ (VD: 0912345678)";
        return "";
    };

    const validateEmail = (v) => {
        if (v?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
            return "Email không hợp lệ (VD: example@email.com)";
        return "";
    };

    const validateCurrentStep = () => {
        if (step !== 5) return true;
        const newErrors = {
            customerName: validateName(data.customerName),
            phone: validatePhone(data.phone),
            email: validateEmail(data.email),
        };
        setErrors(newErrors);
        return !Object.values(newErrors).some(Boolean);
    };

    const next = () => validateCurrentStep() && setStep(s => s + 1);
    const back = () => setStep(s => s - 1);

    const handleInputChange = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        const validators = { customerName: validateName, phone: validatePhone, email: validateEmail };
        if (validators[field]) {
            setErrors(prev => ({ ...prev, [field]: validators[field](value) || "" }));
        }
    };

    const handleSelectTable = (sel) => {
        setData(prev => ({
            ...prev,
            table: sel.id,
            tableNumber: sel.number,
            selectedType: sel.type,
            selectedTableId: sel.tableId,
            selectedRoomId: sel.roomId,
        }));
    };

    const handleAddMultipleFoods = (newFoods) => {
        setData(prev => {
            const updated = [...prev.selectedFoods];
            (Array.isArray(newFoods) ? newFoods : [newFoods]).forEach(nf => {
                const idx = updated.findIndex(f => f.branchFoodId === nf.branchFoodId);
                if (idx !== -1) updated[idx].quantity += nf.quantity;
                else updated.push({ ...nf, id: nf.branchFoodId });
            });
            return { ...prev, selectedFoods: updated };
        });
    };

    const handleRemoveFood = (id) => {
        setData(prev => ({ ...prev, selectedFoods: prev.selectedFoods.filter(f => f.branchFoodId !== id) }));
    };

    const updateQuantity = (id, qty) => {
        if (qty <= 0) handleRemoveFood(id);
        else setData(prev => ({
            ...prev, selectedFoods: prev.selectedFoods.map(f =>
                f.branchFoodId === id ? { ...f, quantity: qty } : f
            )
        }));
    };

    const totalFoodAmount = data.selectedFoods.reduce((s, f) => s + f.price * f.quantity, 0);
    const getPayableAmount = () => totalFoodAmount * (data.payment === "full" ? 0.9 : 0.2);

    const getAvailableTimes = () => {
        const all = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        const today = new Date().toISOString().split("T")[0];
        if (!data.date || data.date !== today) return all;
        const now = new Date();
        return all.filter(t => {
            const [h, m] = t.split(":").map(Number);
            return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
        });
    };

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
    const updateTableStatus = async (tableId, status) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API}/api/tables/${tableId}/status?status=${status}`, {
                method: "PUT",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });
            return response.ok;
        } catch (error) {
            console.error("Error updating table status:", error);
            return false;
        }
    };

    const handleBookingOnlyTable = async () => {
        if (!data.table) return alert("❌ Vui lòng chọn bàn");
        const ne = validateName(data.customerName);
        if (ne) return alert(`❌ ${ne}`);
        const pe = validatePhone(data.phone);
        if (pe) return alert(`❌ ${pe}`);
        const ee = validateEmail(data.email);
        if (ee) return alert(`❌ ${ee}`);

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            const currentBranch = JSON.parse(sessionStorage.getItem('currentBranch'));

            const requestData = {
                userId: userData.id || null,
                branchId: currentBranch?.id,
                tableId: data.selectedType === "table" ? data.selectedTableId : null,
                roomId: data.selectedType === "room" ? data.selectedRoomId : null,
                reservationTime: `${data.date} ${data.time}`,
                customerName: data.customerName.trim(),
                customerPhone: data.phone.replace(/\s/g, ""),
                customerEmail: data.email || "",
                note: data.note || "Đặt bàn không kèm đồ ăn",
                depositAmount: 0,
                items: []
            };

            console.log("📤 Sending booking request:", requestData);

            const response = await fetch(`${API}/api/reservations/full`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();
            console.log("📥 Response:", result);

            if (response.ok) {
                // ✅ Cập nhật trạng thái bàn HOẶC phòng
                if (data.selectedType === "table" && data.selectedTableId) {
                    await updateTableStatus(data.selectedTableId, "RESERVED");
                    console.log("✅ Đã cập nhật bàn");
                } else if (data.selectedType === "room" && data.selectedRoomId) {
                    await updateRoomStatus(data.selectedRoomId, "RESERVED");
                    console.log("✅ Đã cập nhật phòng");
                }

                setBookingSuccessInfo({
                    id: result.id,
                    branchName: currentBranch?.name,
                    tableNumber: data.tableNumber,
                    date: data.date,
                    time: data.time,
                    customerName: data.customerName,
                    customerPhone: data.phone,
                });
                setShowSuccessModal(true);
            } else {
                throw new Error(result.message || JSON.stringify(result));
            }
        } catch (err) {
            console.error("❌ Booking error:", err);
            alert(`❌ Đặt bàn thất bại: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleBooking = async () => {
        if (!data.table) return alert("❌ Vui lòng chọn bàn");
        const ne = validateName(data.customerName);
        if (ne) return alert(`❌ ${ne}`);
        const pe = validatePhone(data.phone);
        if (pe) return alert(`❌ ${pe}`);
        const ee = validateEmail(data.email);
        if (ee) return alert(`❌ ${ee}`);
        if (!data.selectedFoods.length) return alert("❌ Vui lòng chọn món ăn");

        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userData = JSON.parse(localStorage.getItem("user") || "{}");
            const currentBranch = JSON.parse(sessionStorage.getItem('currentBranch'));
            const payableAmount = getPayableAmount();
            const tempOrderCode = Date.now() % 2147483647;
            const shortDesc = `Dat ban ${currentBranch?.name?.substring(0, 10) || ""}`.substring(0, 25);

            const tempBookingData = {
                userId: userData.id,
                branchId: currentBranch?.id,
                tableId: data.selectedType === "table" ? data.selectedTableId : null,
                roomId: data.selectedType === "room" ? data.selectedRoomId : null,
                reservationTime: `${data.date} ${data.time}`,
                depositAmount: payableAmount,
                customerName: data.customerName.trim(),
                customerPhone: data.phone.replace(/\s/g, ""),
                customerEmail: data.email || "",
                note: data.note || "",
                items: data.selectedFoods.map(f => ({ branchFoodId: f.branchFoodId, quantity: f.quantity })),
                selectedFoods: data.selectedFoods,
                paymentMethod: data.payment,
                orderCode: tempOrderCode,
                tableNumber: data.tableNumber,
                selectedType: data.selectedType,
                selectedTableId: data.selectedTableId,
                selectedRoomId: data.selectedRoomId,
                date: data.date,
                time: data.time
            };

            sessionStorage.setItem("tempBooking", JSON.stringify(tempBookingData));
            sessionStorage.setItem('lastBranch', JSON.stringify(currentBranch));

            const paymentResponse = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    orderCode: tempOrderCode,
                    amount: Math.floor(payableAmount),
                    description: shortDesc,
                    returnUrl: `${window.location.origin}/payment-success`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                    items: data.selectedFoods.map(f => ({ name: f.name, quantity: f.quantity, price: Math.floor(f.price) })),
                }),
            });

            const paymentResult = await paymentResponse.json();
            if (paymentResult.code !== "00" || !paymentResult.data?.checkoutUrl) {
                throw new Error(paymentResult.desc || "Không thể tạo link thanh toán");
            }
            window.location.href = paymentResult.data.checkoutUrl;
        } catch (err) {
            alert(`❌ ${err.message || "Vui lòng thử lại sau"}`);
            setLoading(false);
        }
    };

    const StepBar = () => (
        <div className={styles.stepBar}>
            {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                    <div className={`${styles.stepDot} ${step === s.id ? styles.active : ""} ${step > s.id ? styles.done : ""}`}>
                        {step > s.id ? "✓" : i + 1}
                    </div>
                    {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${step > s.id ? styles.done : ""}`} />}
                </React.Fragment>
            ))}
        </div>
    );

    const currentBranch = JSON.parse(sessionStorage.getItem('currentBranch') || '{}');

    if (!currentBranch?.id) {
        return (
            <div className={styles.bookingWrapper}>
                <div className={styles.bookingLeft}>
                    <div className={styles.card} style={{ textAlign: 'center', padding: '60px' }}>
                        <div style={{ fontSize: '48px' }}>🏠</div>
                        <h3>Đang tải thông tin nhà hàng...</h3>
                        <div className={styles.spinner} style={{ margin: '20px auto' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.bookingWrapper}>
            <div className={styles.bookingLeft}>
                <h2>Đặt bàn — {currentBranch.name}</h2>
                <StepBar />

                {/* STEP 2 */}
                {step === 2 && (
                    <div className={styles.card}>
                        <h3>📅 Chọn ngày & giờ</h3>
                        <input type="date" value={data.date}
                            min={new Date().toISOString().split("T")[0]}
                            max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                            onChange={e => setData({ ...data, date: e.target.value, time: "" })} />
                        {data.date && (
                            <>
                                {data.date === new Date().toISOString().split("T")[0] && (
                                    <p className={styles.dateWarning}>⏰ Chỉ hiển thị giờ trong tương lai</p>
                                )}
                                <div className={styles.timeGrid}>
                                    {getAvailableTimes().map(t => (
                                        <button key={t} className={`${styles.timeChip} ${data.time === t ? styles.selectedTime : ""}`}
                                            onClick={() => setData({ ...data, time: t })}>{t}</button>
                                    ))}
                                </div>
                            </>
                        )}
                        <button onClick={next} disabled={!data.date || !data.time} className={styles.nextBtn}>Tiếp tục →</button>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className={styles.card}>
                        <h3>🪑 Chọn bàn</h3>
                        <button onClick={() => setShowModal(true)} className={styles.selectBtn}>
                            {data.table ? `✅ Đã chọn bàn ${data.tableNumber} — đổi bàn` : "🔍 Xem sơ đồ & chọn bàn, phòng"}
                        </button>
                        {data.table && <p className={styles.selectedInfo}>✅ Bàn số <strong>{data.tableNumber}</strong> đã được chọn</p>}
                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button onClick={next} disabled={!data.table} className={styles.nextBtn}>Tiếp tục →</button>
                        </div>
                    </div>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                    <div className={styles.card}>
                        <h3>🍽️ Chọn món ăn</h3>
                        <button onClick={() => setShowMenuModal(true)} className={styles.addFoodBtn}>+ Thêm món</button>
                        {data.selectedFoods.length > 0 ? (
                            <div className={styles.selectedFoods}>
                                <h4>Món đã chọn</h4>
                                {data.selectedFoods.map(food => (
                                    <div key={food.branchFoodId} className={styles.foodItem}>
                                        <img src={food.imageUrl?.startsWith("http") ? food.imageUrl : `${API}${food.imageUrl || ""}`}
                                            alt={food.name} className={styles.foodItemImage}
                                            onError={e => e.target.src = "/default-food.jpg"} />
                                        <div className={styles.foodInfo}>
                                            <span className={styles.foodName}>{food.name}</span>
                                            <span className={styles.foodPrice}>{food.price.toLocaleString()}đ / phần</span>
                                        </div>
                                        <div className={styles.foodControls}>
                                            <button onClick={() => updateQuantity(food.branchFoodId, food.quantity - 1)}>−</button>
                                            <span className={styles.quantity}>{food.quantity}</span>
                                            <button onClick={() => updateQuantity(food.branchFoodId, food.quantity + 1)}>+</button>
                                            <button onClick={() => handleRemoveFood(food.branchFoodId)} className={styles.removeBtn}>🗑</button>
                                        </div>
                                        <div className={styles.foodSubtotal}>{(food.price * food.quantity).toLocaleString()}đ</div>
                                    </div>
                                ))}
                                <div className={styles.foodTotal}><strong>Tổng cộng: {totalFoodAmount.toLocaleString()}đ</strong></div>
                            </div>
                        ) : <p className={styles.emptyFoods}>Chưa có món nào. Vui lòng thêm món ăn!</p>}
                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button onClick={next} className={styles.nextBtn}>Tiếp tục →</button>
                        </div>
                    </div>
                )}

                {/* STEP 5 */}
                {step === 5 && (
                    <div className={styles.card}>
                        <h3>👤 Thông tin khách hàng</h3>
                        <p className={styles.requiredLabel}>* Các trường có dấu sao là bắt buộc</p>
                        <div className={styles.formGroup}>
                            <input type="text" placeholder="Họ và tên *" value={data.customerName}
                                onChange={e => handleInputChange("customerName", e.target.value)}
                                className={errors.customerName ? styles.errorInput : ""} />
                            {errors.customerName && <span className={styles.errorMessage}>{errors.customerName}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <input type="tel" placeholder="Số điện thoại * (VD: 0912345678)" value={data.phone}
                                onChange={e => handleInputChange("phone", e.target.value)}
                                className={errors.phone ? styles.errorInput : ""} />
                            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                        </div>
                        <div className={styles.formGroup}>
                            <input type="email" placeholder="Email (không bắt buộc)" value={data.email}
                                onChange={e => handleInputChange("email", e.target.value)}
                                className={errors.email ? styles.errorInput : ""} />
                            {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
                            <span className={styles.helperText}>💡 Nhập email để nhận xác nhận đặt bàn</span>
                        </div>
                        <textarea placeholder="Ghi chú (không bắt buộc)" value={data.note}
                            onChange={e => setData({ ...data, note: e.target.value })} rows="3" />
                        <span className={styles.helperText}>💡 Ví dụ: yêu cầu đặc biệt, dị ứng thực phẩm...</span>
                        <div className={styles.actions}>
                            <button onClick={back} className={styles.backBtn}>← Quay lại</button>
                            <button onClick={next} disabled={!!errors.customerName || !!errors.phone || !data.customerName || !data.phone}
                                className={styles.nextBtn}>Tiếp tục →</button>
                        </div>
                    </div>
                )}

                {/* STEP 6 */}
                {step === 6 && (
                    <div className={styles.card}>
                        <h3>{data.selectedFoods.length === 0 ? "📝 Xác nhận đặt bàn" : "💳 Thanh toán"}</h3>
                        {data.selectedFoods.length > 0 && (
                            <>
                                <div className={styles.paymentSummary}>
                                    <div className={styles.summaryRow}><span>Tổng tiền món ăn</span><span>{totalFoodAmount.toLocaleString()}đ</span></div>
                                    {data.payment === "full" && (
                                        <div className={`${styles.summaryRow} ${styles.discount}`}>
                                            <span>Ưu đãi thanh toán trước (−10%)</span>
                                            <span>−{(totalFoodAmount * 0.1).toLocaleString()}đ</span>
                                        </div>
                                    )}
                                    <div className={`${styles.summaryRow} ${styles.total}`}>
                                        <span>Cần thanh toán</span><span>{getPayableAmount().toLocaleString()}đ</span>
                                    </div>
                                </div>
                                <div className={styles.paymentOptions}>
                                    <label className={`${styles.paymentOption} ${data.payment === "deposit" ? styles.active : ""}`}>
                                        <input type="radio" name="payment" value="deposit" checked={data.payment === "deposit"}
                                            onChange={() => setData({ ...data, payment: "deposit" })} />
                                        <div><strong>💎 Đặt cọc 20%</strong>
                                            <p>Thanh toán {Math.floor(totalFoodAmount * 0.2).toLocaleString()}đ ngay hôm nay, phần còn lại thanh toán khi đến nhà hàng</p>
                                        </div>
                                    </label>
                                    <label className={`${styles.paymentOption} ${data.payment === "full" ? styles.active : ""}`}>
                                        <input type="radio" name="payment" value="full" checked={data.payment === "full"}
                                            onChange={() => setData({ ...data, payment: "full" })} />
                                        <div><strong>💳 Thanh toán toàn bộ <span className={styles.discountBadge}>GIẢM 10%</span></strong>
                                            <p>Tiết kiệm {(totalFoodAmount * 0.1).toLocaleString()}đ, chỉ còn {Math.floor(totalFoodAmount * 0.9).toLocaleString()}đ</p>
                                        </div>
                                    </label>
                                </div>
                            </>
                        )}
                        {data.selectedFoods.length === 0 && (
                            <div className={styles.noFoodWarning}>
                                <span className={styles.warningIcon}>⚠️</span>
                                <p>Bạn chưa chọn món ăn nào. Đặt bàn chỉ để sử dụng dịch vụ (không bao gồm đồ ăn).</p>
                                <button onClick={() => setStep(4)} className={styles.addFoodNowBtn}>+ Thêm món ngay</button>
                            </div>
                        )}
                        <button onClick={data.selectedFoods.length > 0 ? handleBooking : handleBookingOnlyTable}
                            disabled={loading}
                            className={data.selectedFoods.length > 0 ? styles.payosBtn : styles.bookingOnlyBtn}>
                            {loading ? "🔄 Đang xử lý..." : (data.selectedFoods.length > 0 ? "💳 Thanh toán qua PayOS" : "📅 Đặt bàn ngay")}
                        </button>
                        <div className={styles.actions}><button onClick={back} className={styles.backBtn}>← Quay lại</button></div>
                    </div>
                )}
            </div>

            {/* RIGHT - Summary */}
            <div className={styles.bookingRight}>
                <h3>📋 Tóm tắt đặt bàn</h3>
                <div className={styles.summaryDetails}>
                    <div className={styles.summaryItem}><span className={styles.summaryIcon}>📍</span><span>{currentBranch.name}</span></div>
                    <div className={styles.summaryItem}><span className={styles.summaryIcon}>📅</span>
                        <span>{data.date ? `${data.date} — ${data.time || "chưa chọn giờ"}` : "Chưa chọn ngày"}</span>
                    </div>
                    <div className={styles.summaryItem}><span className={styles.summaryIcon}>🪑</span>
                        <span>{data.tableNumber ? `Bàn số ${data.tableNumber}` : "Chưa chọn bàn"}</span>
                    </div>
                    {data.selectedFoods.length > 0 && (
                        <>
                            <hr />
                            <div className={styles.summaryFoods}><strong>Món đã chọn</strong>
                                {data.selectedFoods.map(f => (
                                    <div key={f.branchFoodId} className={styles.summaryFood}>
                                        {f.name} ×{f.quantity} — {(f.price * f.quantity).toLocaleString()}đ
                                    </div>
                                ))}
                            </div>
                            <hr />
                            <div className={styles.summaryTotal}>Tổng tiền món: <strong>{totalFoodAmount.toLocaleString()}đ</strong></div>
                            {data.payment === "full" && <div className={styles.summaryDiscount}>Giảm 10%: −{(totalFoodAmount * 0.1).toLocaleString()}đ</div>}
                            <div className={styles.summaryPayable}>Cần thanh toán: {getPayableAmount().toLocaleString()}đ</div>
                        </>
                    )}
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && bookingSuccessInfo && (
                <div className={styles.modalOverlay}>
                    <div className={styles.successModal}>
                        <div className={styles.successIcon}>✅</div>
                        <h2>Đặt bàn thành công!</h2>
                        <p>Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi</p>
                        <div className={styles.bookingInfo}>
                            <h3>Thông tin đặt bàn</h3>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Mã đặt bàn:</span><span className={styles.infoValue}>#{bookingSuccessInfo.id}</span></div>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Nhà hàng:</span><span className={styles.infoValue}>{bookingSuccessInfo.branchName}</span></div>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Bàn số:</span><span className={styles.infoValue}>{bookingSuccessInfo.tableNumber}</span></div>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Ngày giờ:</span><span className={styles.infoValue}>{bookingSuccessInfo.date} - {bookingSuccessInfo.time}</span></div>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Khách hàng:</span><span className={styles.infoValue}>{bookingSuccessInfo.customerName}</span></div>
                            <div className={styles.infoRow}><span className={styles.infoLabel}>Số điện thoại:</span><span className={styles.infoValue}>{bookingSuccessInfo.customerPhone}</span></div>
                        </div>
                        <div className={styles.notice}>
                            <p>📞 Chúng tôi sẽ liên hệ xác nhận với bạn trong thời gian sớm nhất</p>
                            <p>⏰ Vui lòng đến đúng giờ đã đặt</p>
                            <p>❌ Hủy bàn trước 1 tiếng nếu có thay đổi</p>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => { setShowSuccessModal(false); window.location.href = "/"; }} className={styles.homeBtn}>🏠 Về trang chủ</button>
                            <button onClick={() => { setShowSuccessModal(false); }} className={styles.historyBtn}>📋 Xem lịch sử đặt bàn</button>
                        </div>
                    </div>
                </div>
            )}

            <TableSelectionModal show={showModal} onClose={() => setShowModal(false)}
                selectTable={handleSelectTable} branchId={currentBranch.id} date={data.date} time={data.time} />

            <FoodSelectionModal show={showMenuModal} onClose={() => setShowMenuModal(false)}
                onSelectFood={handleAddMultipleFoods} branchId={currentBranch.id} selectedFoods={data.selectedFoods} />
        </div>
    );
};

export default BookingDetail;