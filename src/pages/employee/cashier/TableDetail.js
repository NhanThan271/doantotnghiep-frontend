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

    const [cart, setCart] = useState([]);
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

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const API_BASE_URL = 'http://localhost:8080';

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

                let items = [];
                if (existingOrder.items && existingOrder.items.length > 0) {
                    items = existingOrder.items.map(item => ({
                        id: item.foodId,
                        name: item.foodName,
                        price: item.price || 0,
                        quantity: item.quantity || 0,
                        image: item.foodImageUrl
                    }));
                }
                setCart(items);

                if (existingOrder.promotion) {
                    setSelectedPromotion(existingOrder.promotion);
                }
            }
        } catch (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        const price = product.finalPrice || product.branchPrice || product.originalPrice || 0;

        if (existing) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                id: product.id,
                branchFoodId: product.branchFoodId,
                name: product.name,
                price: price,
                quantity: 1,
                image: product.imageUrl?.startsWith("http") ? product.imageUrl : `${API_BASE_URL}/${product.imageUrl}`
            }]);
        }
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    const originalTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const discount = selectedPromotion?.discountPercentage
        ? (originalTotal * selectedPromotion.discountPercentage) / 100
        : selectedPromotion?.discountAmount || 0;

    const finalTotal = originalTotal - discount;

    // Trong handleUpdateOrder, sau khi thêm món thành công, thêm socket emit
    const handleUpdateOrder = async () => {
        if (cart.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        setIsUpdating(true);

        try {
            const existingItems = order.items || [];

            const itemsToAdd = [];
            for (const cartItem of cart) {
                const existingItem = existingItems.find(item => item.foodId === cartItem.id);
                let quantityToAdd = cartItem.quantity;

                if (existingItem) {
                    quantityToAdd = cartItem.quantity - existingItem.quantity;
                }

                if (quantityToAdd > 0) {
                    itemsToAdd.push({
                        foodId: cartItem.id,
                        quantity: quantityToAdd
                    });
                }
            }

            if (itemsToAdd.length === 0) {
                showToast("Không có món mới để thêm!", "info", 2000);
                setIsUpdating(false);
                return;
            }

            const res = await axiosClient.post(`/customer/orders/${order.id}/add-items`, itemsToAdd);
            const updatedOrder = res.data;

            setOrder(updatedOrder);

            const updatedCart = (updatedOrder.items || []).map(item => {
                const existingCartItem = cart.find(c => c.id === item.foodId);
                return {
                    id: item.foodId,
                    name: existingCartItem?.name || item.foodName || `Sản phẩm #${item.foodId}`,
                    price: item.price || existingCartItem?.price || 0,
                    quantity: item.quantity || 0,
                    image: existingCartItem?.image || item.foodImageUrl
                };
            });
            setCart(updatedCart);

            // ✅ GỬI SOCKET REAL-TIME CHO BẾP VÀ NHÂN VIÊN
            // Tạo danh sách các món mới được thêm
            const newItems = itemsToAdd.map(item => {
                const cartItem = cart.find(c => c.id === item.foodId);
                return {
                    id: item.foodId,
                    name: cartItem?.name || `Món #${item.foodId}`,
                    quantity: item.quantity,
                    orderId: order.id,
                    tableNumber: entityNumber,
                    tableId: entity.id,
                    status: 'WAITING'
                };
            });

            console.log("🆕 Món mới thêm:", newItems);

            // Gửi sự kiện order-items-added cho bếp
            socket.emit("order-items-added", {
                orderId: order.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                items: newItems,
                timestamp: new Date().toISOString()
            });

            socket.emit("update-tables");
            socket.emit("update-order", updatedOrder);

            showToast(`Đã cập nhật thêm món cho đơn hàng!`, 'success', 3000);

        } catch (err) {
            console.error("❌ Lỗi cập nhật đơn:", err);
            alert(`Lỗi: ${err.response?.data?.message || "Không thể cập nhật đơn hàng!"}`);
        } finally {
            setIsUpdating(false);
        }
    };

    // Tương tự, trong handleConfirmOrder, cũng thêm socket emit
    const handleConfirmOrder = async () => {
        if (cart.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        setIsConfirming(true);

        try {
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

            const itemsToAdd = cart.map(item => ({
                foodId: item.id,
                quantity: item.quantity
            }));

            if (itemsToAdd.length > 0) {
                await axiosClient.post(`/customer/orders/${newOrder.id}/add-items`, itemsToAdd);
            }

            const finalRes = await axiosClient.get(`/customer/orders/${newOrder.id}`);
            const finalOrder = finalRes.data;

            setOrder(finalOrder);

            const updatedCart = (finalOrder.items || []).map(item => {
                const existingCartItem = cart.find(c => c.id === item.foodId);
                return {
                    id: item.foodId,
                    name: existingCartItem?.name || item.foodName,
                    price: item.price || existingCartItem?.price || 0,
                    quantity: item.quantity || 0,
                    image: existingCartItem?.image || item.foodImageUrl
                };
            });
            setCart(updatedCart);

            // ✅ GỬI SOCKET REAL-TIME CHO BẾP
            const newItems = itemsToAdd.map(item => {
                const cartItem = cart.find(c => c.id === item.foodId);
                return {
                    id: item.foodId,
                    name: cartItem?.name || `Món #${item.foodId}`,
                    quantity: item.quantity,
                    orderId: newOrder.id,
                    tableNumber: entityNumber,
                    tableId: entity.id,
                    status: 'WAITING'
                };
            });

            socket.emit("new-order", {
                orderId: newOrder.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                items: newItems,
                timestamp: new Date().toISOString()
            });

            socket.emit("update-tables");

            showToast(`Đơn hàng đã được gửi đến bếp!`, 'success', 4000);

        } catch (err) {
            console.error("❌ Lỗi tạo đơn:", err);
            alert(`Lỗi: ${err.response?.data?.message || "Không thể tạo đơn hàng!"}`);
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

            // Xóa flag cũ nếu có
            sessionStorage.removeItem('paymentCancelled');

            // Lưu thông tin đơn hàng tạm thời
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

            // Lưu entity để phục hồi sau
            const entityData = {
                id: entity.id,
                number: entity.number,
                type: isRoom ? 'room' : 'table',
                status: entity.status,
                capacity: entity.capacity,
                area: entity.area
            };
            sessionStorage.setItem('lastEntity', JSON.stringify(entityData));

            // ✅ QUAN TRỌNG: Đảm bảo tên món là string
            const items = cart.map(item => ({
                name: String(item.name || "Món ăn"),  // Chuyển thành string
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

            // Chuyển hướng sang PayOS
            window.location.href = paymentResult.data.checkoutUrl;

        } catch (err) {
            console.error("Payment error:", err);
            showToast(`Lỗi thanh toán: ${err.message}`, "error", 3000);
            setProcessingPayment(false);
        }
    };
    // ✅ Hàm xử lý thanh toán sau khi PayOS thành công
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

            // Nếu có paymentData từ PayOS, cập nhật thêm thông tin
            const payData = paymentData || {};
            const response = await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${backendMethod}`,
                payData
            );

            console.log("✅ Kết quả thanh toán:", response.data);

            if (response.data?.success || response.status === 200) {
                // Cập nhật trạng thái bàn/phòng thành FREE sau khi thanh toán
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
                setCart([]);
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
                    <h1>☕ CAFE SHOP</h1>
                    <p>123 Đường ABC, Quận XYZ, TP.HCM</p>
                    <p>Hotline: 0123 456 789</p>
                </div>
                <div class="bill-info">
                    <div><strong>HÓA ĐƠN</strong><span>${new Date().toLocaleString('vi-VN')}</span></div>
                    <div><strong>Khách hàng</strong><span>${customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`}</span></div>
                    <div><strong>${entityType}</strong><span>${entityType} ${entityNumber}</span></div>
                </div>
                <table>
                    <thead><tr><th>Sản phẩm</th><th class="text-center">SL</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th></tr></thead>
                    <tbody>
                        ${cart.map(item => `
                            <tr>
                                <td>${item.name}</td>
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
        const paymentCancelled = sessionStorage.getItem('paymentCancelled');
        if (paymentCancelled === 'true') {
            sessionStorage.removeItem('paymentCancelled');
            showToast("Thanh toán đã bị hủy, bạn có thể thử lại", "warning", 3000);
            setProcessingPayment(false); // Reset trạng thái xử lý
        }
    }, []);

    useEffect(() => {
        const paymentCancelled = sessionStorage.getItem('paymentCancelled');
        if (paymentCancelled === 'true') {
            sessionStorage.removeItem('paymentCancelled');
            showToast("Thanh toán đã bị hủy", "warning", 3000);
            // Không làm gì thêm, giữ nguyên dữ liệu hiện tại
        }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            await fetchProducts();
            await fetchPromotions();

            if (existingOrderFromState) {
                setOrder(existingOrderFromState);
                setCustomerName(existingOrderFromState.customerName || "");

                let items = [];
                if (existingOrderFromState.items && existingOrderFromState.items.length > 0) {
                    items = existingOrderFromState.items.map(item => ({
                        id: item.foodId,
                        name: item.foodName || item.food?.name || `Sản phẩm #${item.foodId}`,
                        price: item.price || 0,
                        quantity: item.quantity || 0,
                        image: item.foodImageUrl || item.food?.imageUrl
                    }));
                }
                setCart(items);

                if (existingOrderFromState.promotion) {
                    setSelectedPromotion(existingOrderFromState.promotion);
                }
            } else if (entity) {
                await checkExistingOrder();
            }
        };

        if (entity) {
            initialize();
        }
    }, [entity, existingOrderFromState]);

    const canPay = order?.status === "COMPLETED";
    const canPrint = order?.status === "COMPLETED" || order?.status === "PAID";
    const canEdit = order && (order.status === "PENDING" || order.status === "PREPARING" || order.status === "COMPLETED");
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
                                <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
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
                    {cart.length === 0 ? (
                        <p className={styles.emptyCart}>Chưa có món nào</p>
                    ) : (
                        <>
                            <div className={styles.cartList}>
                                {cart.map(item => (
                                    <div key={item.id} className={styles.cartItem}>
                                        <div className={styles.cartItemInfo}>
                                            <span className={styles.cartItemName}>{item.name}</span>
                                            <span className={styles.cartItemPrice}>
                                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                        {order?.status !== "PAID" && (
                                            <div className={styles.cartItemControls}>
                                                <button onClick={() => updateQuantity(item.id, -1)} className={styles.qtyBtn}>
                                                    <Minus size={14} />
                                                </button>
                                                <span className={styles.qty}>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className={styles.qtyBtn}>
                                                    <Plus size={14} />
                                                </button>
                                                <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {order?.status === "PAID" && (
                                            <div className={styles.cartItemControls}>
                                                <span className={styles.qty}>x{item.quantity}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className={styles.cartFooter}>
                                {discount > 0 && (
                                    <>
                                        <div className={styles.totalRow}>
                                            <span>Tạm tính:</span>
                                            <span>{originalTotal.toLocaleString('vi-VN')}đ</span>
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

                                {canEdit && cart.length > 0 && (
                                    <button
                                        className={styles.updateBtn}
                                        onClick={handleUpdateOrder}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? "Đang cập nhật..." : "Cập nhật thêm món"}
                                    </button>
                                )}

                                {(isNewOrder || (order && order.status === "COMPLETED")) && cart.length > 0 && (
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