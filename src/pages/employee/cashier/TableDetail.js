import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Users, Plus, Minus, Trash2, Printer, Tag, X, Percent, DollarSign } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import PaymentMethodModal from "./PaymentMethodModal";
import ToastNotification from "./ToastNotification";
import styles from "./TableDetail.module.css";
import CashPaymentModal from "./CashPaymentModal";

const socket = io('http://localhost:3001');
const API = "http://localhost:8080";

const TableDetail = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const table = state?.table;
    const room = state?.room;

    const isRoom = !!room;
    const entity = isRoom ? room : table;
    const entityType = isRoom ? "Phòng" : "Bàn";
    const entityNumber = entity?.number;

    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeTab, setActiveTab] = useState("Tất cả");
    const [searchTerm, setSearchTerm] = useState("");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState("");
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [promotions, setPromotions] = useState([]);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [tempItemsToAdd, setTempItemsToAdd] = useState([]); // Món tạm thời chưa gửi lên server

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const API_BASE_URL = 'http://localhost:8080';

    // Lấy danh sách món từ order (nguồn dữ liệu duy nhất)
    const orderItems = order?.items || [];

    const originalTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const tempTotal = tempItemsToAdd.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const discount = selectedPromotion?.discountPercentage
        ? ((originalTotal + tempTotal) * selectedPromotion.discountPercentage) / 100
        : selectedPromotion?.discountAmount || 0;

    const finalTotal = (originalTotal + tempTotal) - discount;

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/branch-foods/branch/${branchId}/with-promotions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                console.log("📦 Dữ liệu sản phẩm từ API:", data);
                const activeProducts = data.filter(p => p.isActive !== false);
                setProducts(activeProducts);
                const cats = ["Tất cả", ...new Set(activeProducts.map(p => p.categoryName).filter(Boolean))];
                setCategories(cats);
            }
        } catch (err) {
            console.error("Lỗi tải sản phẩm:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPromotions = useCallback(async () => {
        try {
            const res = await axiosClient.get("/promotions");
            setPromotions(res.data || []);
        } catch (err) {
            console.error("Lỗi tải khuyến mãi:", err);
        }
    }, []);

    const checkExistingOrder = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const existingOrder = res.data.find(o => {
                if (isRoom) {
                    return o.room?.id === entity.id && o.status !== "PAID" && o.status !== "CANCELED";
                }
                return o.table?.id === entity.id && o.status !== "PAID" && o.status !== "CANCELED";
            });

            if (existingOrder) {
                setOrder(existingOrder);
                setCustomerName(existingOrder.customerName || "");

                if (existingOrder.promotion) {
                    setSelectedPromotion(existingOrder.promotion);
                }
            }
        } catch (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
        }
    };

    // Thêm món vào danh sách tạm
    const addToTempList = (product) => {
        setTempItemsToAdd(prev => {
            const existing = prev.find(item => item.id === product.id);
            const price = product.finalPrice || product.branchPrice || product.originalPrice || 0;

            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prev, {
                    id: product.id,
                    name: product.name,
                    price: price,
                    quantity: 1
                }];
            }
        });
    };

    // Cập nhật số lượng trong danh sách tạm
    const updateTempQuantity = (id, delta) => {
        setTempItemsToAdd(prev => {
            const newList = prev.map(item => {
                if (item.id === id) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean);
            return newList;
        });
    };

    // Xóa món khỏi danh sách tạm
    const removeFromTempList = (id) => {
        setTempItemsToAdd(prev => prev.filter(item => item.id !== id));
    };

    // Gửi danh sách món mới lên server (thêm vào order hiện có) – phiên bản gửi từng phần riêng lẻ
    const handleAddToOrder = async () => {
        if (tempItemsToAdd.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        setIsUpdating(true);

        try {
            // Tạo mảng các request, mỗi phần là 1 đơn vị
            const requests = [];
            tempItemsToAdd.forEach(item => {
                for (let i = 0; i < item.quantity; i++) {
                    requests.push({ foodId: item.id, quantity: 1 });
                }
            });

            // Gửi lần lượt từng request (có delay nhẹ để tránh quá tải)
            for (const req of requests) {
                await axiosClient.post(`/customer/orders/${order.id}/add-items`, [req]);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Refresh lại order
            const refreshedOrder = await axiosClient.get(`/customer/orders/${order.id}`);
            setOrder(refreshedOrder.data);
            setTempItemsToAdd([]);

            // Socket emit – gộp thông báo để không spam
            const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
            const grouped = {};
            requests.forEach(req => {
                const prod = products.find(p => p.id === req.foodId);
                const name = prod?.name || `Món #${req.foodId}`;
                grouped[name] = (grouped[name] || 0) + 1;
            });
            const allItems = Object.entries(grouped).map(([name, qty], idx) => ({
                id: idx,
                name: name,
                quantity: qty,
                orderId: order.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                status: 'WAITING',
                timestamp: Date.now() + idx
            }));

            socket.emit("order-updated", {
                orderId: order.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                locationName: locationName,
                areaName: entity?.area || "Khu chính",
                isRoom: isRoom,
                items: allItems,
                timestamp: new Date().toISOString(),
                branchId: branchId
            });

            socket.emit("update-tables");
            showToast(`Đã thêm thành công ${requests.length} phần!`, 'success', 3000);
        } catch (err) {
            console.error("Lỗi thêm món:", err);
            showToast(`Lỗi: ${err.response?.data?.message || err.message}`, "error", 5000);
        } finally {
            setIsUpdating(false);
        }
    };

    // Tạo đơn hàng mới + thêm món – phiên bản gửi từng phần riêng lẻ
    const handleConfirmOrder = async () => {
        if (tempItemsToAdd.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        setIsConfirming(true);

        try {
            // Tạo mảng các request, mỗi phần là 1 đơn vị
            const requests = [];
            tempItemsToAdd.forEach(item => {
                for (let i = 0; i < item.quantity; i++) {
                    requests.push({ foodId: item.id, quantity: 1 });
                }
            });

            const orderData = {
                customerName: customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`,
                status: "PENDING",
                branch: { id: branchId },
                ...(isRoom ? { room: { id: entity.id } } : { table: { id: entity.id } })
            };

            if (selectedPromotion && selectedPromotion.id) {
                orderData.promotion = { id: selectedPromotion.id };
            }

            const res = await axiosClient.post("/customer/orders", orderData);
            const newOrder = res.data;

            // Gửi từng request riêng
            for (const req of requests) {
                await axiosClient.post(`/customer/orders/${newOrder.id}/add-items`, [req]);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const finalRes = await axiosClient.get(`/customer/orders/${newOrder.id}`);
            setOrder(finalRes.data);
            setTempItemsToAdd([]);

            // Socket emit – gộp thông báo
            const grouped = {};
            requests.forEach(req => {
                const prod = products.find(p => p.id === req.foodId);
                const name = prod?.name || `Món #${req.foodId}`;
                grouped[name] = (grouped[name] || 0) + 1;
            });
            const newItems = Object.entries(grouped).map(([name, qty], idx) => ({
                id: idx,
                name: name,
                quantity: qty,
                orderId: newOrder.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                status: 'WAITING'
            }));

            socket.emit("new-order", {
                orderId: newOrder.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                locationName: isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`,
                areaName: entity?.area || "Khu chính",
                isRoom: isRoom,
                items: newItems,
                timestamp: new Date().toISOString(),
                branchId: branchId
            });

            socket.emit("update-tables");
            showToast(`Đơn hàng đã được gửi đến bếp!`, 'success', 4000);
        } catch (err) {
            console.error("❌ Lỗi tạo đơn:", err);
            showToast(`Lỗi: ${err.response?.data?.message || "Không thể tạo đơn hàng!"}`, "error", 5000);
        } finally {
            setIsConfirming(false);
        }
    };

    const handlePayOSPayment = async () => {
        if (!order) {
            showToast("Không tìm thấy đơn hàng!", "error", 2000);
            return;
        }

        setProcessingPayment(true);
        try {
            const token = localStorage.getItem("token");
            const tempOrderCode = Date.now() % 2147483647;
            const shortDesc = `Thanh toan don ${order.id}`.substring(0, 25);

            sessionStorage.removeItem('paymentCancelled');

            const tempPaymentData = {
                orderId: order.id,
                totalAmount: finalTotal,
                customerName: customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`,
                entityType: entityType,
                entityNumber: entityNumber,
                entityId: entity.id,
                isRoom: isRoom
            };
            sessionStorage.setItem('tempCashierPayment', JSON.stringify(tempPaymentData));

            const entityData = {
                id: entity.id,
                number: entity.number,
                type: isRoom ? 'room' : 'table',
                status: entity.status,
                capacity: entity.capacity,
                area: entity.area
            };
            sessionStorage.setItem('lastEntity', JSON.stringify(entityData));

            const items = orderItems.map(item => ({
                name: String(item.food?.name || "Món ăn"),
                quantity: Number(item.quantity) || 1,
                price: Math.floor(Number(item.price) || 0)
            }));

            console.log("📦 Items gửi lên PayOS:", items);

            const paymentResponse = await fetch(`${API}/api/payos/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    orderCode: tempOrderCode,
                    amount: Math.floor(finalTotal),
                    description: shortDesc,
                    returnUrl: `${window.location.origin}/cashier-payment-success`,
                    cancelUrl: `${window.location.origin}/cashier-payment-cancel`,
                    items: items
                }),
            });

            const paymentResult = await paymentResponse.json();
            console.log("PayOS response:", paymentResult);

            if (paymentResult.code !== "00" || !paymentResult.data?.checkoutUrl) {
                throw new Error(paymentResult.desc || "Không thể tạo link thanh toán");
            }

            window.location.href = paymentResult.data.checkoutUrl;

        } catch (err) {
            console.error("Payment error:", err);
            showToast(`Lỗi thanh toán: ${err.message}`, "error", 3000);
            setProcessingPayment(false);
        }
    };

    const handleCompletePayment = async (orderId, method, paymentData = null) => {
        try {
            let backendMethod = 'CASH';
            if (method === 'cash') {
                backendMethod = 'CASH';
            } else if (method === 'card') {
                backendMethod = 'CARD';
            } else if (method === 'transfer' || method === 'payos') {
                backendMethod = 'MOBILE';
            }

            console.log(`💳 Thanh toán đơn #${orderId} với phương thức: ${backendMethod}`);

            const payData = paymentData || {};
            const response = await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${backendMethod}`,
                payData
            );

            console.log("✅ Kết quả thanh toán:", response.data);

            if (response.data?.success || response.status === 200) {
                if (entity) {
                    const updateUrl = isRoom
                        ? `${API}/api/rooms/${entity.id}/status?status=FREE`
                        : `${API}/api/tables/${entity.id}/status?status=FREE`;

                    try {
                        const token = localStorage.getItem("token");
                        await fetch(updateUrl, {
                            method: "PUT",
                            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
                        });
                        console.log(`✅ Đã cập nhật ${entityType.toLowerCase()} ${entityNumber} thành FREE`);
                    } catch (err) {
                        console.error("Lỗi cập nhật trạng thái:", err);
                    }
                }

                setOrder(null);
                setTempItemsToAdd([]);
                setSelectedPromotion(null);

                socket.emit("update-tables");
                showToast(`Thanh toán thành công!`, 'success', 4000);

                setTimeout(() => {
                    navigate('/cashier/tables');
                }, 2000);
            } else {
                throw new Error(response.data?.message || "Thanh toán thất bại");
            }
        } catch (err) {
            console.error("❌ Lỗi thanh toán:", err);
            showToast(`Lỗi thanh toán: ${err.response?.data?.message || "Không thể thanh toán!"}`, "error", 3000);
        }
    };

    const printBill = () => {
        const billContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hóa đơn ${entityType} ${entityNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Arial', sans-serif; padding: 40px; background: white; }
                .bill-container { max-width: 800px; margin: 0 auto; border: 2px solid #333; padding: 30px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { font-size: 32px; color: #8b4513; margin-bottom: 5px; }
                .header p { color: #666; font-size: 14px; }
                .bill-info { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
                .bill-info div { flex: 1; }
                .bill-info strong { display: block; color: #333; margin-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                thead { background: #8b4513; color: white; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .totals { margin-top: 20px; padding-top: 20px; border-top: 2px solid #333; }
                .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; }
                .total-row.grand-total { font-size: 20px; font-weight: bold; color: #8b4513; margin-top: 10px; padding-top: 10px; border-top: 2px solid #8b4513; }
                .footer { margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px dashed #999; color: #666; }
            </style>
        </head>
        <body>
            <div class="bill-container">
                <div class="header">
                    <h1> Restaurant </h1>
                    <p>Hotline: 0123 456 789</p>
                </div>
                <div class="bill-info">
                    <div><strong>HÓA ĐƠN</strong><span>${new Date().toLocaleString('vi-VN')}</span></div>
                    <div><strong>Khách hàng</strong><span>${customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`}</span></div>
                    <div><strong>${entityType}</strong><span>${entityType} ${entityNumber}</span></div>
                </div>
                <table>
                    <thead>
                        <tr><th>Sản phẩm</th><th class="text-center">SL</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th></tr>
                    </thead>
                    <tbody>
                        ${orderItems.map(item => `
                            <tr>
                                <td>${item.food?.name || item.foodName}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">${item.price.toLocaleString('vi-VN')}đ</td>
                                <td class="text-right">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="total-row"><span>Tạm tính:</span><span>${originalTotal.toLocaleString('vi-VN')}đ</span></div>
                    ${discount > 0 ? `<div class="total-row" style="color: #10b981;"><span>Giảm giá:</span><span>-${discount.toLocaleString('vi-VN')}đ</span></div>` : ''}
                    <div class="total-row grand-total"><span>TỔNG CỘNG:</span><span>${finalTotal.toLocaleString('vi-VN')}đ</span></div>
                </div>
                <div class="footer"><p>Cảm ơn quý khách! Hẹn gặp lại!</p></div>
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(billContent);
        printWindow.document.close();
        printWindow.print();
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => activeTab === "Tất cả" ? true : p.categoryName === activeTab)
            .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, activeTab, searchTerm]);

    const existingOrderFromState = state?.existingOrder;

    useEffect(() => {
        const initialize = async () => {
            await fetchProducts();
            await fetchPromotions();
        };

        if (entity) {
            initialize();
        }
    }, [entity]);

    useEffect(() => {
        const processExistingOrder = async () => {
            if (products.length === 0) return;

            if (existingOrderFromState) {
                setOrder(existingOrderFromState);
                setCustomerName(existingOrderFromState.customerName || "");
                if (existingOrderFromState.promotion) {
                    setSelectedPromotion(existingOrderFromState.promotion);
                }
            } else if (entity) {
                await checkExistingOrder();
            }
        };

        processExistingOrder();
    }, [products, existingOrderFromState, entity]);

    const canPay = order?.status === "COMPLETED";
    const canPrint = order?.status === "COMPLETED" || order?.status === "PAID";
    const canEdit = order && (order.status !== "PAID" && order.status !== "CANCELED");
    const isNewOrder = !order;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.tableInfo}>
                    <h1>{entityType} {entityNumber}</h1>
                    <div className={`${entity?.status === "FREE" ? styles.available : styles.occupied}`}>
                        {entity?.status === "FREE" ? "🟢 Trống" : entity?.status === "RESERVED" ? "📅 Đã đặt" : "🔴 Đã có khách"}
                    </div>
                    {order?.status === "PENDING" && (
                        <div className={styles.statusBadge} style={{ background: "#3b82f6" }}>
                            ⏳ Đang chờ bếp
                        </div>
                    )}
                    {order?.status === "PREPARING" && (
                        <div className={styles.statusBadge} style={{ background: "#f59e0b" }}>
                            🔪 Đang chuẩn bị
                        </div>
                    )}
                    {order?.status === "COMPLETED" && (
                        <div className={styles.statusBadge} style={{ background: "#10b981" }}>
                            ✅ Đã hoàn thành
                        </div>
                    )}
                </div>
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <ShoppingCart size={18} />
                        <span>{totalItems} món</span>
                    </div>
                    <div className={styles.statItem}>
                        <Users size={18} />
                        <span>{entity?.capacity || 4} người</span>
                    </div>
                </div>
            </div>

            <div className={styles.customerSection}>
                <input
                    type="text"
                    className={styles.customerInput}
                    placeholder="Tên khách hàng (tùy chọn)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                />
            </div>

            {order?.status !== "PAID" && (
                <div className={styles.promotionSection}>
                    <div className={styles.formGroup}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={16} />
                            Mã khuyến mãi
                        </label>
                        <div
                            className={styles.promotionSelect}
                            onClick={() => setShowPromotionModal(true)}
                            style={{ cursor: 'pointer' }}
                        >
                            {selectedPromotion ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <Tag size={16} color="#10b981" />
                                    <span>{selectedPromotion.name}</span>
                                    {selectedPromotion.discountPercentage && (
                                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                                            -{selectedPromotion.discountPercentage}%
                                        </span>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPromotion(null);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#9ca3af',
                                            cursor: 'pointer',
                                            marginLeft: 'auto'
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <span style={{ color: '#9ca3af' }}>Chọn mã giảm giá...</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {order?.status !== "PAID" && (
                <>
                    <div className={styles.searchSection}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Tìm kiếm món..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className={styles.categoryTabs}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`${styles.categoryBtn} ${activeTab === cat ? styles.active : ""}`}
                                onClick={() => setActiveTab(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </>
            )}

            <div className={styles.content}>
                {order?.status !== "PAID" && (
                    <div className={styles.productsGrid}>
                        {loading ? (
                            <div className={styles.loading}>Đang tải...</div>
                        ) : (
                            filteredProducts.map(product => (
                                <div key={product.id} className={styles.productCard} onClick={() => addToTempList(product)}>
                                    <img
                                        src={product.imageUrl?.startsWith("http") ? product.imageUrl : `${API_BASE_URL}/${product.imageUrl}`}
                                        alt={product.name}
                                        className={styles.productImage}
                                        onError={(e) => { e.target.src = "/default-food.jpg"; }}
                                    />
                                    <div className={styles.productInfo}>
                                        <h4>{product.name}</h4>
                                        <p className={styles.productPrice}>
                                            {(product.finalPrice || product.branchPrice || product.originalPrice || 0).toLocaleString('vi-VN')}đ
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                <div className={styles.cartSidebar} style={{
                    width: order?.status !== "PAID" ? '380px' : '100%',
                    maxWidth: order?.status !== "PAID" ? '380px' : '600px',
                    margin: '0 auto'
                }}>
                    <h3>🛒 Đơn hàng</h3>

                    {orderItems.length === 0 && tempItemsToAdd.length === 0 ? (
                        <p className={styles.emptyCart}>Chưa có món nào</p>
                    ) : (
                        <>
                            <div className={styles.cartList}>
                                {/* 🔥 GỘP DANH SÁCH MÓN TỪ DB + MÓN TẠM */}
                                {(() => {
                                    // Tạo Map để gộp tất cả món
                                    const mergedMap = new Map();

                                    // Thêm món từ database vào Map
                                    orderItems.forEach(item => {
                                        const foodId = item.food?.id || item.foodId;
                                        const product = products.find(p => p.id === foodId);
                                        const name = product?.name || item.food?.name;
                                        const price = item.price || product?.branchPrice || 0;
                                        const key = foodId;

                                        if (mergedMap.has(key)) {
                                            const existing = mergedMap.get(key);
                                            existing.quantity += item.quantity;
                                        } else {
                                            mergedMap.set(key, {
                                                id: foodId,
                                                name: name,
                                                price: price,
                                                quantity: item.quantity,
                                                isNew: false // Món cũ từ DB
                                            });
                                        }
                                    });

                                    // Thêm món tạm vào Map (cộng dồn số lượng)
                                    tempItemsToAdd.forEach(item => {
                                        const key = item.id;
                                        if (mergedMap.has(key)) {
                                            const existing = mergedMap.get(key);
                                            existing.quantity += item.quantity;
                                            existing.isNew = true; // Đánh dấu có món mới
                                        } else {
                                            mergedMap.set(key, {
                                                id: item.id,
                                                name: item.name,
                                                price: item.price,
                                                quantity: item.quantity,
                                                isNew: true
                                            });
                                        }
                                    });

                                    // Chuyển Map thành array và hiển thị
                                    const mergedItems = Array.from(mergedMap.values());

                                    return mergedItems.map((item) => (
                                        <div
                                            key={item.id}
                                            className={styles.cartItem}
                                            style={{ background: item.isNew && tempItemsToAdd.some(t => t.id === item.id) ? "#fef3c7" : "white" }}
                                        >
                                            <div className={styles.cartItemInfo}>
                                                <span className={styles.cartItemName}>
                                                    {item.name}
                                                    {item.isNew && tempItemsToAdd.some(t => t.id === item.id) && (
                                                        <span style={{ fontSize: "11px", color: "#d97706", marginLeft: "8px" }}>(có món mới)</span>
                                                    )}
                                                </span>
                                                <span className={styles.cartItemPrice}>
                                                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                                </span>
                                            </div>
                                            <div className={styles.cartItemControls}>
                                                {/* Chỉ cho phép sửa/xóa đối với món tạm (chưa lưu DB) */}
                                                {tempItemsToAdd.some(t => t.id === item.id) ? (
                                                    <>
                                                        <button
                                                            onClick={() => updateTempQuantity(item.id, -1)}
                                                            className={styles.qtyBtn}
                                                            disabled={item.quantity <= (orderItems.find(i => (i.food?.id || i.foodId) === item.id)?.quantity || 0)}
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className={styles.qty}>{item.quantity}</span>
                                                        <button onClick={() => updateTempQuantity(item.id, 1)} className={styles.qtyBtn}>
                                                            <Plus size={14} />
                                                        </button>
                                                        <button onClick={() => removeFromTempList(item.id)} className={styles.removeBtn}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={styles.qty}>x{item.quantity}</span>
                                                )}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>

                            <div className={styles.cartFooter}>
                                {discount > 0 && (
                                    <>
                                        <div className={styles.totalRow}>
                                            <span>Tạm tính:</span>
                                            <span>{(originalTotal + tempTotal).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div className={styles.discountRow}>
                                            <span>Giảm giá:</span>
                                            <span>-{discount.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    </>
                                )}
                                <div className={styles.totalRow}>
                                    <span>Tổng cộng:</span>
                                    <span className={styles.totalAmount}>{finalTotal.toLocaleString('vi-VN')}đ</span>
                                </div>

                                {/* Nút thêm món (khi có món mới và đã có order) */}
                                {tempItemsToAdd.length > 0 && order && (
                                    <button
                                        className={styles.updateBtn}
                                        onClick={handleAddToOrder}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? "Đang thêm..." : "Thêm món"}
                                    </button>
                                )}

                                {/* Nút xác nhận đơn (khi chưa có order) */}
                                {!order && tempItemsToAdd.length > 0 && (
                                    <button
                                        className={styles.orderBtn}
                                        onClick={handleConfirmOrder}
                                        disabled={isConfirming}
                                    >
                                        {isConfirming ? "Đang xử lý..." : "Xác nhận đơn"}
                                    </button>
                                )}

                                {canPrint && (
                                    <button className={styles.printBtn} onClick={printBill}>
                                        <Printer size={18} /> In hóa đơn
                                    </button>
                                )}

                                {canPay && (
                                    <button
                                        className={styles.payBtn}
                                        onClick={() => setShowPaymentMethodModal(true)}
                                        disabled={processingPayment}
                                    >
                                        {processingPayment ? "Đang xử lý..." : "Thanh toán"}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showPromotionModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPromotionModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3>Chọn mã khuyến mãi</h3>
                            <button onClick={() => setShowPromotionModal(false)} className={styles.modalClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div
                            className={`${styles.promoOption} ${!selectedPromotion ? styles.selected : ''}`}
                            onClick={() => {
                                setSelectedPromotion(null);
                                setShowPromotionModal(false);
                            }}
                        >
                            <div>Không sử dụng mã giảm giá</div>
                        </div>

                        {promotions.length === 0 ? (
                            <div className={styles.emptyPromo}>Không có mã khuyến mãi nào</div>
                        ) : (
                            promotions.map((promo) => (
                                <div
                                    key={promo.id}
                                    className={`${styles.promoOption} ${selectedPromotion?.id === promo.id ? styles.selected : ''}`}
                                    onClick={() => {
                                        setSelectedPromotion(promo);
                                        setShowPromotionModal(false);
                                        showToast(`Đã áp dụng mã ${promo.name}`, 'success', 2000);
                                    }}
                                >
                                    <div className={styles.promoIcon}>
                                        {promo.discountPercentage ? <Percent size={20} /> : <DollarSign size={20} />}
                                    </div>
                                    <div className={styles.promoInfo}>
                                        <div className={styles.promoName}>{promo.name}</div>
                                        {promo.description && <div className={styles.promoDesc}>{promo.description}</div>}
                                        {promo.endDate && (
                                            <div className={styles.promoDate}>
                                                Hạn đến: {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.promoValue}>
                                        {promo.discountPercentage && `-${promo.discountPercentage}%`}
                                        {promo.discountAmount && `-${promo.discountAmount.toLocaleString('vi-VN')}đ`}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            <PaymentMethodModal
                show={showPaymentMethodModal}
                onClose={() => setShowPaymentMethodModal(false)}
                onSelect={(method) => {
                    setShowPaymentMethodModal(false);
                    if (method === "transfer" || method === "momo") {
                        handlePayOSPayment();
                    } else if (method === "cash") {
                        setShowCashModal(true);
                    } else if (method === "card") {
                        handleCompletePayment(order?.id, "card");
                    }
                }}
            />

            <CashPaymentModal
                show={showCashModal}
                onClose={() => setShowCashModal(false)}
                onConfirm={() => {
                    handleCompletePayment(order?.id, "cash");
                }}
                totalAmount={finalTotal}
            />

            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <ToastNotification
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default TableDetail;