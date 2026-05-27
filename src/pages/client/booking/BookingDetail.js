import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import styles from "./BookingDetail.module.css";

const API = "http://localhost:8080";

/* ── helpers ── */
const getAuthToken = () => localStorage.getItem("token");
const getImgUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `${API}${url.startsWith("/") ? url : "/" + url}`;
};
const fmtPrice = (p) => p ? p.toLocaleString("vi-VN") + "đ" : "0đ";
const isVipArea = (area) => area && area.toLowerCase().includes("vip");

// FIX: helper đọc tên chi nhánh an toàn từ bất kỳ kiểu dữ liệu nào
const safeName = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return value.name || '';
    return String(value);
};

const groupByCapacity = (tables) => {
    const bands = { small: [], medium: [], large: [], vip: [], grandVip: [] };
    tables.forEach(t => {
        if (t.capacity <= 4) bands.small.push(t);
        else if (t.capacity <= 6) bands.medium.push(t);
        else if (t.capacity <= 8) bands.large.push(t);
        else if (t.capacity <= 15) bands.vip.push(t);
        else bands.grandVip.push(t);
    });
    return bands;
};

/* ════════════════════════════════════════════════════════ */
const BookingDetail = () => {
    const { state } = useLocation();

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [bookingSuccessInfo, setBookingSuccessInfo] = useState(null);

    /* table map */
    const [tableAreas, setTableAreas] = useState([]);
    const [activeArea, setActiveArea] = useState(null);
    const [areaTablesMap, setAreaTablesMap] = useState({});
    const [areaLoading, setAreaLoading] = useState(false);

    /* menu */
    const [categories, setCategories] = useState([]);
    const [allFoods, setAllFoods] = useState([]);
    const [activeCat, setActiveCat] = useState(null);
    const [menuLoading, setMenuLoading] = useState(true);

    const [rooms, setRooms] = useState([]);
    const [roomLoading, setRoomLoading] = useState(false);
    const [bookingMode, setBookingMode] = useState("table");
    const ROOM_HOURS = Array.from({ length: 24 }, (_, i) =>
        `${String(i).padStart(2, "0")}:00`
    );
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const toDateStr = (d) => d.toISOString().split("T")[0];
    /* form */
    const [data, setData] = useState({
        date: "", time: "",
        table: null, tableNumber: "", tableCapacity: "",
        customerName: "", phone: "", email: "", note: "",
        payment: "deposit",
        selectedFoods: [],
        selectedTableId: null,
        checkInDate: toDateStr(today),
        checkInTime: "11:00",
        checkOutDate: toDateStr(today),
        checkOutTime: "11:00",
        selectedRoomId: null, roomNumber: "", roomCapacity: "",
    });

    const getRoomCheckInTimes = (dateRef) => {
        const todayStr = new Date().toISOString().split("T")[0];
        if (!dateRef || dateRef !== todayStr) return ROOM_HOURS;
        const now = new Date();
        const minHour = now.getHours() + 1;
        return ROOM_HOURS.filter(t => parseInt(t) >= minHour);
    };

    const getRoomCheckOutTimes = (checkInDate, checkOutDate, checkInTime) => {
        if (checkInDate && checkOutDate && checkInDate === checkOutDate) {
            const minHour = checkInTime ? parseInt(checkInTime) + 1 : 0;
            return ROOM_HOURS.filter(t => parseInt(t) > minHour);
        }
        return ROOM_HOURS;
    };

    /* ── restore branch ── */
    useEffect(() => {

        const raw = sessionStorage.getItem("currentBranch");
        console.log("RAW currentBranch:", raw);
        console.log("PARSED:", JSON.parse(raw || "{}"));
        window.scrollTo(0, 0);
        let cb = null;

        if (state?.branch) {
            cb = { id: state.branch.id, name: safeName(state.branch.name) };
        }

        if (!cb?.id) {
            try {
                const raw = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
                cb = { id: raw.id, name: safeName(raw.name) };
            } catch { }
        }

        if (!cb?.id) {
            const id = localStorage.getItem('selectedBranchId');
            const name = localStorage.getItem('selectedBranch');
            if (id) cb = { id: parseInt(id), name: safeName(name) };
        }

        if (cb?.id) {
            sessionStorage.setItem("currentBranch", JSON.stringify({
                id: cb.id,
                name: cb.name
            }));
        } else {
            setTimeout(() => (window.location.href = "/dat-ban-dia-chi"), 2000);
        }
    }, []);

    /* ── prefill user ── */
    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            setData(prev => ({
                ...prev,
                customerName: u.fullName || u.username || "",
                phone: u.phone || "",
                email: u.email || "",
            }));
        } catch { }
    }, []);

    /* ── load areas ── */
    useEffect(() => {
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
            if (!cb?.id) return;
            fetch(`${API}/api/tables/branch/${cb.id}/areas`)
                .then(r => r.json())
                .then(areas => {
                    const areaList = (areas || [])
                        .map(a => typeof a === 'string' ? a : (a.name || a.areaName || String(a)))
                        .filter(a => !a.toLowerCase().includes('takeaway'));
                    setTableAreas(areaList);
                    if (areaList.length) setActiveArea(areaList[0]);
                })
                .catch(console.error);
        } catch { }
    }, []);

    /* ── load tables per area ── */
    const loadTablesForArea = useCallback(async (area) => {
        if (areaTablesMap[area]) return;
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
            if (!cb?.id) return;
            setAreaLoading(true);
            const res = await fetch(`${API}/api/tables/branch/${cb.id}/area/${encodeURIComponent(area)}`);
            const json = await res.json();
            setAreaTablesMap(prev => ({
                ...prev,
                [area]: json.map(t => ({ id: t.id, number: t.number, status: t.status, capacity: t.capacity }))
            }));
        } catch (e) { console.error(e); }
        finally { setAreaLoading(false); }
    }, [areaTablesMap]);

    useEffect(() => { if (activeArea) loadTablesForArea(activeArea); }, [activeArea]);

    // load rooms 
    const loadRooms = useCallback(async (checkIn, checkOut) => {
        const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
        if (!cb?.id || !checkIn || !checkOut) return;
        setRoomLoading(true);
        try {
            const url = `${API}/api/rooms/branch/${cb.id}/available`
                + `?checkIn=${encodeURIComponent(checkIn)}`
                + `&checkOut=${encodeURIComponent(checkOut)}`;
            const res = await fetch(url);
            const json = await res.json();
            setRooms(json || []);
        } catch (e) { console.error(e); }
        finally { setRoomLoading(false); }
    }, []);

    useEffect(() => {
        if (bookingMode === "room"
            && data.checkInDate && data.checkInTime
            && data.checkOutDate && data.checkOutTime) {
            loadRooms(
                `${data.checkInDate} ${data.checkInTime}`,
                `${data.checkOutDate} ${data.checkOutTime}`
            );
        }
    }, [data.checkInDate, data.checkInTime, data.checkOutDate, data.checkOutTime, bookingMode]);

    /* ── load menu ── */
    useEffect(() => {
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
            if (!cb?.id) return;
            setMenuLoading(true);
            Promise.all([
                fetch(`${API}/api/categories`, { headers: { "Content-Type": "application/json" } }).then(r => r.json()),
                fetch(`${API}/api/branch-foods/branch/${cb.id}/with-promotions`, {
                    headers: {
                        "Content-Type": "application/json",
                        ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
                    }
                }).then(r => r.json()),
            ])
                .then(([cats, foods]) => {
                    setCategories(cats || []);
                    if (cats?.length) setActiveCat(cats[0]);
                    const active = (foods || [])
                        .filter(f => f.isActive)
                        .map(f => ({
                            branchFoodId: f.branchFoodId,
                            id: f.branchFoodId,
                            name: f.name,
                            description: f.description,
                            price: f.finalPrice || f.branchPrice || 0,
                            originalPrice: f.branchPrice,
                            imageUrl: f.imageUrl,
                            categoryId: f.categoryId,
                            foodId: f.id,
                            hasPromotion: f.hasPromotion,
                            promotionName: f.promotionName,
                            discountPercentage: f.discountPercentage,
                        }));
                    setAllFoods(active);

                    const promoFood = (() => {
                        try { return JSON.parse(sessionStorage.getItem('promoSelectedFood')); }
                        catch { return null; }
                    })();

                    if (promoFood) {
                        const matched = active.find(f => f.foodId === promoFood.foodId);
                        if (matched) {
                            setData(prev => ({
                                ...prev,
                                selectedFoods: [{ ...matched, quantity: 1 }]
                            }));
                        }
                        sessionStorage.removeItem('promoSelectedFood');
                    }
                })
                .catch(console.error)
                .finally(() => setMenuLoading(false));
        } catch { }
    }, []);

    /* ── validation ── */
    const validateName = v => !v?.trim() ? "Vui lòng nhập họ tên"
        : v.trim().length < 2 ? "Ít nhất 2 ký tự"
            : /[0-9]/.test(v) ? "Họ tên không chứa số" : "";
    const validatePhone = v => !v?.trim() ? "Vui lòng nhập số điện thoại"
        : !/^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/.test(v.replace(/\s/g, ""))
            ? "SĐT không hợp lệ" : "";
    const validateEmail = v => v?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
        ? "Email không hợp lệ" : "";

    const handleInputChange = (field, value) => {
        setData(prev => ({ ...prev, [field]: value }));
        const fns = { customerName: validateName, phone: validatePhone, email: validateEmail };
        if (fns[field]) setErrors(prev => ({ ...prev, [field]: fns[field](value) || "" }));
    };

    /* ── select table ── */
    const handleSelectTable = (table) => {
        if (table.status !== "FREE") return;
        setData(prev => ({
            ...prev,
            table: table.id, tableNumber: table.number, tableCapacity: table.capacity,
            selectedTableId: table.id,
        }));
    };

    /* ── food qty ── */
    const setQty = (branchFoodId, qty) => {
        setData(prev => {
            const list = prev.selectedFoods;
            if (qty <= 0) return { ...prev, selectedFoods: list.filter(f => f.branchFoodId !== branchFoodId) };
            const idx = list.findIndex(f => f.branchFoodId === branchFoodId);
            if (idx === -1) {
                const food = allFoods.find(f => f.branchFoodId === branchFoodId);
                return { ...prev, selectedFoods: [...list, { ...food, quantity: qty }] };
            }
            const updated = [...list];
            updated[idx] = { ...updated[idx], quantity: qty };
            return { ...prev, selectedFoods: updated };
        });
    };
    const getQty = (id) => data.selectedFoods.find(f => f.branchFoodId === id)?.quantity || 0;

    /* ── totals ── */
    const totalFoodAmount = data.selectedFoods.reduce((s, f) => s + f.price * f.quantity, 0);
    const payable = Math.floor(totalFoodAmount * (data.payment === "full" ? 0.9 : 0.2));

    /* ── available times ── */
    const getAvailableTimes = (dateRef) => {
        const all = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
            "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        const today = new Date().toISOString().split("T")[0];
        if (!dateRef || dateRef !== today) return all;
        const now = new Date();
        return all.filter(t => {
            const [h, m] = t.split(":").map(Number);
            return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
        });
    };

    /* ── update table status ── */
    const updateTableStatus = async (tableId, status) => {
        try {
            await fetch(`${API}/api/tables/${tableId}/status?status=${status}`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${getAuthToken()}`, "Content-Type": "application/json" }
            });
        } catch { }
    };

    /* ── booking without food ── */
    const handleBookingOnlyTable = async () => {
        const ne = validateName(data.customerName); if (ne) return alert(` ${ne}`);
        const pe = validatePhone(data.phone); if (pe) return alert(` ${pe}`);
        const ee = validateEmail(data.email); if (ee) return alert(` ${ee}`);
        setLoading(true);
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch"));
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            const isRoom = bookingMode === "room";
            const body = {
                userId: u.id || null,
                branchId: cb?.id,
                tableId: isRoom ? null : (data.selectedTableId || null),
                roomId: isRoom ? data.selectedRoomId : null,
                ...(isRoom
                    ? {
                        checkInTime: `${data.checkInDate} ${data.checkInTime}`,
                        checkOutTime: `${data.checkOutDate} ${data.checkOutTime}`,
                    }
                    : {
                        reservationTime: `${data.date} ${data.time}`,
                    }),
                customerName: data.customerName.trim(),
                customerPhone: data.phone.replace(/\s/g, ""),
                customerEmail: data.email || "",
                note: data.note || "",
                depositAmount: 0,
                items: [],
            };

            const res = await fetch(`${API}/api/reservations/full`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(body),
            });
            const result = await res.json();
            if (res.ok) {
                if (data.selectedTableId) await updateTableStatus(data.selectedTableId, "RESERVED");
                setAreaTablesMap(prev => {
                    const u2 = { ...prev };
                    if (activeArea && u2[activeArea]) {
                        u2[activeArea] = u2[activeArea].map(t =>
                            t.id === data.selectedTableId ? { ...t, status: "RESERVED" } : t
                        );
                    }
                    return u2;
                });
                const isRoom = bookingMode === "room";
                setBookingSuccessInfo({
                    id: result.id,
                    branchName: safeName(cb?.name),
                    label: isRoom ? "Phòng số" : "Bàn số",
                    tableNumber: isRoom ? data.roomNumber : data.tableNumber,
                    date: isRoom ? data.checkInDate : data.date,
                    time: isRoom
                        ? `${data.checkInTime} → ${data.checkOutDate} ${data.checkOutTime}`
                        : data.time,
                    customerName: data.customerName,
                    customerPhone: data.phone,
                });
                setShowSuccessModal(true);
            } else throw new Error(result.message || JSON.stringify(result));
        } catch (err) { alert(` Đặt bàn thất bại: ${err.message}`); }
        finally { setLoading(false); }
    };

    /* ── booking with food → PayOS ── */
    const handleBooking = async () => {
        if (!data.selectedFoods.length) return alert(" Vui lòng chọn ít nhất 1 món");
        const ne = validateName(data.customerName); if (ne) return alert(` ${ne}`);
        const pe = validatePhone(data.phone); if (pe) return alert(` ${pe}`);
        const ee = validateEmail(data.email); if (ee) return alert(` ${ee}`);
        setLoading(true);
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch"));
            const u = JSON.parse(localStorage.getItem("user") || "{}");
            const tempOrderCode = Date.now() % 2147483647;
            const cbName = safeName(cb?.name); // FIX: luôn là string
            sessionStorage.setItem("tempBooking", JSON.stringify({
                userId: u.id, branchId: cb?.id,
                tableId: data.selectedTableId || null,
                reservationTime: `${data.date} ${data.time}`, depositAmount: payable,
                customerName: data.customerName.trim(), customerPhone: data.phone.replace(/\s/g, ""),
                customerEmail: data.email || "", note: data.note || "",
                items: data.selectedFoods.map(f => ({ branchFoodId: f.branchFoodId, quantity: f.quantity })),
                selectedFoods: data.selectedFoods, paymentMethod: data.payment,
                orderCode: tempOrderCode, tableNumber: data.tableNumber,
                selectedTableId: data.selectedTableId, date: data.date, time: data.time
            }));
            sessionStorage.setItem("lastBranch", JSON.stringify({ id: cb?.id, name: cbName }));
            const payRes = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
                body: JSON.stringify({
                    orderCode: tempOrderCode, amount: payable,
                    description: `Dat ban ${cbName.substring(0, 10)}`.substring(0, 25), // FIX
                    returnUrl: `${window.location.origin}/payment-success`,
                    cancelUrl: `${window.location.origin}/payment-cancel`,
                    items: data.selectedFoods.map(f => ({ name: f.name, quantity: f.quantity, price: Math.floor(f.price) })),
                }),
            });
            const payResult = await payRes.json();
            if (payResult.code !== "00" || !payResult.data?.checkoutUrl)
                throw new Error(payResult.desc || "Không thể tạo link thanh toán");
            window.location.href = payResult.data.checkoutUrl;
        } catch (err) { alert(` ${err.message}`); setLoading(false); }
    };

    const canConfirm = bookingMode === "table"
        ? (data.table && data.date && data.time &&
            data.customerName && data.phone &&
            !validateName(data.customerName) && !validatePhone(data.phone) && !validateEmail(data.email))
        : (data.selectedRoomId && data.checkInDate && data.checkInTime &&
            data.checkOutDate && data.checkOutTime &&
            data.customerName && data.phone &&
            !validateName(data.customerName) && !validatePhone(data.phone) && !validateEmail(data.email));

    const currentBranch = (() => {
        try {
            const cb = JSON.parse(sessionStorage.getItem("currentBranch") || "{}");
            const name = safeName(cb.name);
            return { id: cb.id, name };
        } catch { return { id: null, name: '' }; }
    })();

    const currentTables = areaTablesMap[activeArea] || [];
    const { small, medium, large, vip, grandVip } = groupByCapacity(currentTables);
    const displayedFoods = activeCat ? allFoods.filter(f => f.categoryId === activeCat.id) : allFoods;

    if (!currentBranch?.id) return (
        <div className={styles.bookingPage}>
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>Đang tải nhà hàng...</p>
            </div>
        </div>
    );

    return (
        <div className={styles.bookingPage}>

            {/* ══ COL 1 — FORM ══ */}
            <div className={styles.colForm}>
                <div className={styles.formTitle}>Đặt Bàn</div>

                <div className={styles.formGroup}>
                    <label className={styles.flabel}>Họ và tên *</label>
                    <input
                        className={`${styles.finput}${errors.customerName ? " " + styles.inputError : ""}`}
                        type="text" placeholder="Nguyễn Văn A"
                        value={data.customerName}
                        onChange={e => handleInputChange("customerName", e.target.value)}
                    />
                    {errors.customerName && <span className={styles.errMsg}>{errors.customerName}</span>}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.flabel}>Số điện thoại *</label>
                    <input
                        className={`${styles.finput}${errors.phone ? " " + styles.inputError : ""}`}
                        type="tel" placeholder="0912 345 678"
                        value={data.phone}
                        onChange={e => handleInputChange("phone", e.target.value)}
                    />
                    {errors.phone && <span className={styles.errMsg}>{errors.phone}</span>}
                </div>
                {bookingMode === "table" && (
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.flabel}>Ngày</label>
                            <input className={styles.finput} type="date"
                                value={data.date}
                                min={new Date().toISOString().split("T")[0]}
                                max={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                                onChange={e => setData({ ...data, date: e.target.value, time: "" })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.flabel}>Giờ</label>
                            <select className={styles.finput} value={data.time}
                                onChange={e => setData({ ...data, time: e.target.value })}
                                disabled={!data.date}>
                                <option value="">--:--</option>
                                {getAvailableTimes().map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label className={styles.flabel}>Email</label>
                    <input
                        className={`${styles.finput}${errors.email ? " " + styles.inputError : ""}`}
                        type="email" placeholder="example@email.com"
                        value={data.email}
                        onChange={e => handleInputChange("email", e.target.value)}
                    />
                    {errors.email && <span className={styles.errMsg}>{errors.email}</span>}
                </div>

                <div className={styles.formDivider} />

                {bookingMode === "table" && (
                    <div className={styles.formGroup}>
                        <label className={styles.flabel}>Bàn đã chọn</label>
                        {data.table ? (
                            <div className={styles.selectedTable}>
                                <span className={styles.selectedDot} />
                                <span className={styles.selectedText}>
                                    {data.tableCapacity >= 16 ? "Phòng " : "Bàn "}
                                    <strong>{data.tableNumber}</strong>
                                </span>
                                <span className={styles.selectedCap}>{data.tableCapacity} người</span>
                                <button className={styles.clearBtn}
                                    onClick={() => setData(prev => ({
                                        ...prev, table: null, tableNumber: "",
                                        tableCapacity: "", selectedTableId: null
                                    }))}>✕</button>
                            </div>
                        ) : (
                            <div className={styles.noTable}>← Chọn bàn trên sơ đồ</div>
                        )}
                    </div>
                )}

                {bookingMode === "room" && (
                    <div className={styles.formGroup}>
                        <label className={styles.flabel}>Phòng đã chọn</label>
                        {data.selectedRoomId ? (
                            <div className={styles.selectedTable}>
                                <span className={styles.selectedDot} />
                                <span className={styles.selectedText}>
                                    Phòng <strong>{data.roomNumber}</strong>
                                </span>
                                <span className={styles.selectedCap}>{data.roomCapacity} người</span>
                                <button className={styles.clearBtn}
                                    onClick={() => setData(prev => ({
                                        ...prev, selectedRoomId: null, roomNumber: "",
                                        roomCapacity: "", table: null,
                                    }))}>✕</button>
                            </div>
                        ) : (
                            <div className={styles.noTable}>← Chọn phòng bên cạnh</div>
                        )}
                        {data.selectedRoomId && (
                            <div style={{ fontSize: "0.8em", color: "#888", marginTop: 4 }}>
                                {data.checkInDate} {data.checkInTime} → {data.checkOutDate} {data.checkOutTime}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ══ COL 2 — SƠ ĐỒ BÀN + THỰC ĐƠN ══ */}
            <div className={styles.colMid}>

                {/* Toggle mode */}
                <div className={styles.modeToggle}>
                    <button
                        className={bookingMode === "table" ? styles.modeActive : styles.modeBtn}
                        onClick={(e) => { e.preventDefault(); setBookingMode("table") }}>
                        Đặt bàn
                    </button>
                    <button
                        className={bookingMode === "room" ? styles.modeActive : styles.modeBtn}
                        onClick={(e) => { e.preventDefault(); setBookingMode("room") }}>
                        Đặt phòng
                    </button>
                </div>

                {bookingMode === "table" && (
                    <div className={styles.mapSection}>
                        <div className={styles.mapHeader}>
                            <div className={styles.mapTitle}>Sơ đồ bàn</div>
                            <div className={styles.mapSub}>
                                {String(currentBranch.name || '')} · Chọn vị trí yêu thích
                            </div>
                        </div>

                        <div className={styles.floorTabs}>
                            {tableAreas.map((area, i) => (
                                <button key={area}
                                    className={`${styles.floorTab}${activeArea === area ? " " + styles.floorTabActive : ""}`}
                                    onClick={() => setActiveArea(area)}>
                                    <span className={styles.floorBadge}>
                                        {isVipArea(area) ? "★" : `${i + 1}F`}
                                    </span>
                                    {area}
                                </button>
                            ))}
                        </div>

                        <div className={styles.tableMapWrap}>
                            {areaLoading ? (
                                <div className={styles.mapLoading}>
                                    <div className={styles.spinner} />
                                    <span>Đang tải sơ đồ...</span>
                                </div>
                            ) : currentTables.length === 0 ? (
                                <div className={styles.emptyArea}>Không có bàn trong khu vực này</div>
                            ) : (
                                <div className={styles.tablesGrid}>
                                    {small.length > 0 && (
                                        <div>
                                            <div className={styles.tableGroupLabel}>Bàn nhỏ (2–4 người)</div>
                                            <div className={styles.tableRow}>
                                                {small.map(t => (
                                                    <TableCard key={t.id} table={t}
                                                        selected={data.selectedTableId}
                                                        onSelect={handleSelectTable}
                                                        isVip={isVipArea(activeArea)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {medium.length > 0 && (
                                        <div>
                                            <div className={styles.tableGroupLabel}>Bàn thường (6 người)</div>
                                            <div className={styles.tableRow}>
                                                {medium.map(t => (
                                                    <TableCard key={t.id} table={t}
                                                        selected={data.selectedTableId}
                                                        onSelect={handleSelectTable}
                                                        isVip={isVipArea(activeArea)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {large.length > 0 && (
                                        <div>
                                            <div className={styles.tableGroupLabel}>Bàn lớn (8 người)</div>
                                            <div className={styles.tableRow}>
                                                {large.map(t => (
                                                    <TableCard key={t.id} table={t}
                                                        selected={data.selectedTableId}
                                                        onSelect={handleSelectTable}
                                                        isVip={isVipArea(activeArea)} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {vip.length > 0 && (
                                        <div>
                                            <div className={styles.tableGroupLabel}>★ Phòng VIP (10–15 người)</div>
                                            <div className={styles.tableRow}>
                                                {vip.map(t => (
                                                    <TableCard key={t.id} table={t}
                                                        selected={data.selectedTableId}
                                                        onSelect={handleSelectTable}
                                                        isVip={true} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {grandVip.length > 0 && (
                                        <div>
                                            <div className={styles.tableGroupLabel}>👑 Phòng VIP Lớn (16+ người)</div>
                                            <div className={styles.tableRow}>
                                                {grandVip.map(t => (
                                                    <TableCard key={t.id} table={t}
                                                        selected={data.selectedTableId}
                                                        onSelect={handleSelectTable}
                                                        isVip={true}
                                                        isGrandVip={true} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={styles.legend}>
                            {[
                                { color: "#4a7fd4", label: "Còn trống" },
                                { color: "#C9A84C", label: "Đang chọn" },
                                { color: "rgba(223, 222, 220, 0.45)", label: "Đã đặt" },
                                { color: "rgba(220,38,38,0.35)", label: "Có khách" },
                            ].map(l => (
                                <div key={l.label} className={styles.legendItem}>
                                    <span className={styles.legendBox} style={{ background: l.color }} />
                                    <span>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Panel đặt phòng — chỉ hiện khi mode = room */}
                {bookingMode === "room" && (
                    <div className={styles.roomSection}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.flabel}>Nhận phòng</label>
                                <input type="date" className={styles.finput}
                                    value={data.checkInDate}
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={e => setData({ ...data, checkInDate: e.target.value })} />
                                <select className={styles.finput} value={data.checkInTime}
                                    disabled={!data.checkInDate}
                                    onChange={e => setData({ ...data, checkInTime: e.target.value })}>
                                    <option value="">-- Giờ --</option>
                                    {getRoomCheckInTimes(data.checkInDate).map(t =>
                                        <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.flabel}>Trả phòng</label>
                                <input type="date" className={styles.finput}
                                    value={data.checkOutDate}
                                    min={data.checkInDate || new Date().toISOString().split("T")[0]}
                                    onChange={e => setData({ ...data, checkOutDate: e.target.value })} />
                                <select className={styles.finput} value={data.checkOutTime}
                                    disabled={!data.checkOutDate}
                                    onChange={e => setData({ ...data, checkOutTime: e.target.value })}>
                                    <option value="">-- Giờ --</option>
                                    {getRoomCheckOutTimes(data.checkInDate, data.checkOutDate, data.checkInTime).map(t =>
                                        <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        {roomLoading ? (
                            <div className={styles.mapLoading}>
                                <div className={styles.spinner} /><span>Đang tìm phòng...</span>
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className={styles.emptyArea}>
                                {data.checkInDate && data.checkOutDate
                                    ? "Không có phòng trống trong thời gian này"
                                    : "Chọn ngày nhận/trả phòng để xem phòng trống"}
                            </div>
                        ) : (
                            <div className={styles.tableRow}>
                                {rooms.map(room => (
                                    <div key={room.id}
                                        className={`${styles.tableCard}
                            ${data.selectedRoomId === room.id
                                                ? styles.tableSelected : styles.tableFree}
                            ${styles.tableVip}`}
                                        onClick={() => setData({
                                            ...data,
                                            selectedRoomId: room.id,
                                            roomNumber: room.number,
                                            roomCapacity: room.capacity,
                                            table: room.id,
                                            date: data.checkInDate,
                                            time: data.checkInTime,
                                        })}>
                                        <div className={styles.tableName}>
                                            {data.selectedRoomId === room.id ? "✓" : `Phòng ${room.number}`}
                                        </div>
                                        <div className={styles.tableCap}>{room.capacity} người</div>
                                        <div className={styles.tableStatus}>
                                            {data.selectedRoomId === room.id ? "Đang chọn" : "Còn trống"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.sectionDivider} />

                {/* Thực đơn */}
                <div className={styles.menuSection}>
                    <div className={styles.menuHeader}>
                        <span className={styles.menuTitle}>Thực đơn</span>
                        <span className={styles.menuSub}>Tuỳ chọn · Thêm món để đặt trước</span>
                    </div>

                    <div className={styles.catTabs}>
                        <button
                            className={`${styles.catTab}${!activeCat ? " " + styles.catTabActive : ""}`}
                            onClick={() => setActiveCat(null)}>
                            Tất cả
                        </button>
                        {categories.map(c => (
                            <button key={c.id}
                                className={`${styles.catTab}${activeCat?.id === c.id ? " " + styles.catTabActive : ""}`}
                                onClick={() => setActiveCat(c)}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    <div className={styles.foodGrid}>
                        {menuLoading ? (
                            <div className={styles.menuLoading}><div className={styles.spinner} /></div>
                        ) : displayedFoods.length === 0 ? (
                            <div className={styles.menuEmpty}>Không có món trong danh mục này</div>
                        ) : displayedFoods.map(food => {
                            const qty = getQty(food.branchFoodId);
                            return (
                                <div key={food.branchFoodId}
                                    className={`${styles.foodCard}${qty > 0 ? " " + styles.foodCardInCart : ""}`}>
                                    <div className={styles.foodCardImg}>
                                        {getImgUrl(food.imageUrl)
                                            ? <img src={getImgUrl(food.imageUrl)} alt={food.name}
                                                onError={e => e.target.style.display = "none"} />
                                            : <span>🍽️</span>
                                        }
                                    </div>
                                    <div className={styles.foodCardBody}>
                                        <span className={styles.foodCardName}>{food.name}</span>
                                        <div style={{ minHeight: '30px', marginBottom: '2px' }}>
                                            {food.hasPromotion && food.originalPrice ? (
                                                <>
                                                    <span style={{
                                                        textDecoration: 'line-through',
                                                        color: '#999',
                                                        fontSize: '0.8em',
                                                        marginRight: '4px'
                                                    }}>
                                                        {fmtPrice(food.originalPrice)}
                                                    </span>
                                                    <span style={{
                                                        background: '#e53e3e',
                                                        color: '#fff',
                                                        fontSize: '0.7em',
                                                        padding: '1px 4px',
                                                        borderRadius: '3px'
                                                    }}>
                                                        -{food.discountPercentage}%
                                                    </span>
                                                </>
                                            ) : null}
                                        </div>
                                        <span className={styles.foodCardPrice}>{fmtPrice(food.price)}</span>
                                    </div>
                                    <div className={styles.foodCardCtrl}>
                                        {qty > 0 ? (
                                            <div className={styles.qtyRow}>
                                                <button className={styles.qtyBtn}
                                                    onClick={() => setQty(food.branchFoodId, qty - 1)}>−</button>
                                                <span className={styles.qtyNum}>{qty}</span>
                                                <button className={styles.qtyBtn}
                                                    onClick={() => setQty(food.branchFoodId, qty + 1)}>+</button>
                                            </div>
                                        ) : (
                                            <button className={styles.addBtn}
                                                onClick={() => setQty(food.branchFoodId, 1)}>
                                                + Thêm
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ══ COL 3 — GIỎ HÀNG + NÚT XÁC NHẬN ══ */}
            <div className={styles.colCart}>
                <div className={styles.cartHeader}>
                    <div className={styles.cartTitle}>
                        Món đã chọn
                        {data.selectedFoods.length > 0 && (
                            <span className={styles.cartBadge}>
                                {data.selectedFoods.reduce((s, f) => s + f.quantity, 0)}
                            </span>
                        )}
                    </div>
                    <div className={styles.cartSub}>Xem lại đơn trước khi xác nhận</div>
                </div>

                {data.selectedFoods.length === 0 ? (
                    <div className={styles.cartEmpty}>
                        <span className={styles.cartEmptyIcon}>🍽️</span>
                        <p>Chưa có món nào.<br />Thêm món từ thực đơn bên cạnh.</p>
                    </div>
                ) : (
                    <>
                        <div className={styles.cartList}>
                            {data.selectedFoods.map(food => (
                                <div key={food.branchFoodId} className={styles.cartItem}>
                                    <div className={styles.ciImg}>
                                        {getImgUrl(food.imageUrl)
                                            ? <img src={getImgUrl(food.imageUrl)} alt={food.name}
                                                onError={e => e.target.style.display = "none"} />
                                            : <span>🍽️</span>
                                        }
                                    </div>
                                    <div className={styles.ciInfo}>
                                        <span className={styles.ciName}>{food.name}</span>
                                        <span className={styles.ciPrice}>{fmtPrice(food.price)}</span>
                                    </div>
                                    <div className={styles.ciCtrl}>
                                        <button className={styles.ciBtn}
                                            onClick={() => setQty(food.branchFoodId, food.quantity - 1)}>−</button>
                                        <span className={styles.ciQty}>{food.quantity}</span>
                                        <button className={styles.ciBtn}
                                            onClick={() => setQty(food.branchFoodId, food.quantity + 1)}>+</button>
                                    </div>
                                    <span className={styles.ciSub}>{fmtPrice(food.price * food.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className={styles.totalRow}>
                            <span className={styles.totalLabel}>Tổng tiền</span>
                            <span className={styles.totalAmt}>{fmtPrice(totalFoodAmount)}</span>
                        </div>

                        <div className={styles.payOpts}>
                            {[
                                { val: "deposit", label: "Đặt cọc 20%", amt: Math.floor(totalFoodAmount * 0.2) },
                                { val: "full", label: "Thanh toán toàn bộ", amt: Math.floor(totalFoodAmount * 0.9), badge: "−10%" },
                            ].map(opt => (
                                <div key={opt.val}
                                    className={`${styles.payOpt}${data.payment === opt.val ? " " + styles.payOptActive : ""}`}
                                    onClick={() => setData({ ...data, payment: opt.val })}>
                                    <div className={`${styles.payRadio}${data.payment === opt.val ? " " + styles.payRadioOn : ""}`} />
                                    <div className={styles.payInfo}>
                                        <span className={styles.payLabel}>
                                            {opt.label}
                                            {opt.badge && <span className={styles.payBadge}>{opt.badge}</span>}
                                        </span>
                                        <span className={styles.payAmt}>{fmtPrice(opt.amt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className={styles.noteSection}>
                    <label className={styles.noteLabel}>Ghi chú đặc biệt</label>
                    <textarea
                        className={styles.noteInput}
                        rows={2}
                        placeholder="Dị ứng thực phẩm, dịp đặc biệt, yêu cầu khác..."
                        value={data.note}
                        onChange={e => setData({ ...data, note: e.target.value })}
                    />
                </div>

                <button
                    className={styles.confirmBtnRight}
                    disabled={!canConfirm || loading}
                    onClick={data.selectedFoods.length > 0 ? handleBooking : handleBookingOnlyTable}
                >
                    {loading ? "Đang xử lý..." : "Xác nhận đặt bàn →"}
                </button>
            </div>

            {/* ══ SUCCESS MODAL ══ */}
            {showSuccessModal && bookingSuccessInfo && (
                <div className={styles.modalOverlay}>
                    <div className={styles.successModal}>
                        <div className={styles.successIcon}>✅</div>
                        <h2>Đặt bàn thành công!</h2>
                        <p>Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi</p>
                        <div className={styles.bookingInfo}>
                            <h3>Thông tin đặt bàn</h3>
                            {[
                                ["Mã đặt bàn", `#${bookingSuccessInfo.id}`],
                                ["Nhà hàng", bookingSuccessInfo.branchName],
                                [bookingSuccessInfo.label || "Bàn số", bookingSuccessInfo.tableNumber],
                                ["Ngày giờ", `${bookingSuccessInfo.date} — ${bookingSuccessInfo.time}`],
                                ["Khách hàng", bookingSuccessInfo.customerName],
                                ["Điện thoại", bookingSuccessInfo.customerPhone],
                            ].map(([label, value]) => (
                                <div key={label} className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{label}</span>
                                    <span className={styles.infoValue}>{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.notice}>
                            <p>📞 Chúng tôi sẽ liên hệ xác nhận sớm nhất</p>
                            <p>⏰ Vui lòng đến đúng giờ đã đặt</p>
                            <p> Hủy bàn trước 1 tiếng nếu có thay đổi</p>
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.homeBtn}
                                onClick={() => { setShowSuccessModal(false); window.location.href = "/"; }}>
                                Về trang chủ
                            </button>
                            <button className={styles.historyBtn}
                                onClick={() => setShowSuccessModal(false)}>
                                Lịch sử đặt bàn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Table Card ── */
const TableCard = ({ table, selected, onSelect, isVip = false, isGrandVip = false }) => {
    const isSelected = selected === table.id;
    const isFree = table.status === "FREE";
    const showVip = isVip || table.capacity >= 10;
    const showGrandVip = isGrandVip || table.capacity >= 16;
    const statusLabel = table.status === "FREE" ? "Trống"
        : table.status === "RESERVED" ? "Đã đặt" : "Có khách";

    let cls = styles.tableCard;
    if (isSelected) cls += " " + styles.tableSelected;
    else if (!isFree) cls += " " + styles.tableUnavailable;
    else cls += " " + styles.tableFree;
    if (showGrandVip) cls += " " + styles.tableGrandVip;
    else if (showVip) cls += " " + styles.tableVip;

    const label = showGrandVip || showVip ? `Phòng ${table.number}` : table.number;

    return (
        <div className={cls}
            onClick={() => isFree && onSelect(table)}
            title={`${showVip ? "Phòng" : "Bàn"} ${table.number} · ${table.capacity} người · ${statusLabel}`}>
            {showGrandVip && !isSelected && <span className={styles.grandVipPill}>👑 GRAND VIP</span>}
            {showVip && !showGrandVip && !isSelected && <span className={styles.vipPill}>VIP</span>}
            <div className={styles.tableName}>{isSelected ? "✓" : label}</div>
            <div className={styles.tableCap}>{table.capacity} người</div>
            <div className={styles.tableStatus}>{isSelected ? "Đang chọn" : statusLabel}</div>
        </div>
    );
};

export default BookingDetail;