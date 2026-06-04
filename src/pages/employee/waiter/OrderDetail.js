import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ShoppingCart, Users, Plus, Minus, Trash2,
    Printer, Tag, X, Percent, DollarSign, CheckCircle,
    Clock, ChefHat, Circle, CircleCheckBig, Sofa, User,
    CreditCard, Banknote, Wallet, Phone, Landmark
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import ToastNotification from "./ToastNotification";
import styles from "./OrderDetail.module.css";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';
const WAITER_NOTIFICATIONS_KEY = 'waiter_notifications';

const OrderDetail = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const table = state?.table;
    const room = state?.room;

    const isRoom = !!room;
    const entity = isRoom ? room : table;
    const entityType = isRoom ? "Phòng" : "Bàn";
    const entityNumber = entity?.number;

    // ===== STATE =====
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
    const [toasts, setToasts] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [branchInfo, setBranchInfo] = useState(null);
    const [roomFee, setRoomFee] = useState(0);

    const confirmedCartRef = useRef({});
    const [confirmedCart, setConfirmedCart] = useState({});

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const branchId = user?.branch?.id;

    // ===== NOTIFICATION HELPERS =====
    const sendCashierNotification = (message, type = 'info') => {
        const newNotification = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date().toISOString()
        };

        const saved = localStorage.getItem(CASHIER_NOTIFICATIONS_KEY);
        const currentNotifications = saved ? JSON.parse(saved) : [];
        currentNotifications.unshift(newNotification);
        localStorage.setItem(CASHIER_NOTIFICATIONS_KEY, JSON.stringify(currentNotifications.slice(0, 50)));

        window.dispatchEvent(new CustomEvent('cashier-notification', {
            detail: newNotification
        }));

        console.log('📤 Waiter → Cashier notification:', message);
    };

    const sendWaiterNotification = (message, type = 'info') => {
        const newNotification = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date().toISOString()
        };

        const saved = localStorage.getItem(WAITER_NOTIFICATIONS_KEY);
        const currentNotifications = saved ? JSON.parse(saved) : [];
        currentNotifications.unshift(newNotification);
        localStorage.setItem(WAITER_NOTIFICATIONS_KEY, JSON.stringify(currentNotifications.slice(0, 50)));

        window.dispatchEvent(new CustomEvent('waiter-notification', {
            detail: newNotification
        }));
    };

    // ===== TOAST MANAGEMENT =====
    const showToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    // ===== API CALLS =====
    const fetchProducts = useCallback(async () => {
        try {
            const response = await axiosClient.get(
                `/branch-foods/branch/${branchId}/with-promotions`
            );
            const activeProducts = response.data.filter(p => p.isActive !== false);
            setProducts(activeProducts);
            const cats = ["Tất cả", ...new Set(activeProducts.map(p => p.categoryName).filter(Boolean))];
            setCategories(cats);
        } catch (err) {
            console.error("Lỗi tải sản phẩm:", err);
            showToast("Không thể tải danh sách sản phẩm", "error");
        } finally {
            setLoading(false);
        }
    }, [branchId, showToast]);

    const fetchPromotions = useCallback(async () => {
        try {
            const response = await axiosClient.get("/promotions");
            setPromotions(response.data || []);
        } catch (err) {
            console.error("Lỗi tải khuyến mãi:", err);
        }
    }, []);

    const fetchBranchInfo = useCallback(async () => {
        try {
            const response = await axiosClient.get(`/branches/${branchId}`);
            setBranchInfo(response.data);
        } catch (err) {
            console.error("Lỗi tải thông tin chi nhánh:", err);
        }
    }, [branchId]);

    const checkExistingOrder = useCallback(async () => {
        try {
            const response = await axiosClient.get("/customer/orders");
            const existingOrder = response.data.find(o => {
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
                    items = existingOrder.items.map(item => {
                        const foodId = item.foodId || item.food?.id || item.id;
                        const foodName = item.food?.name || item.foodName || item.name;
                        const product = products.find(p => p.id === foodId);
                        return {
                            id: foodId,
                            name: product?.name || foodName || `Sản phẩm #${foodId}`,
                            price: item.price || 0,
                            quantity: item.quantity || 0,
                            image: product?.imageUrl || item.food?.imageUrl || '',
                            kitchenStatus: item.kitchenStatus || 'WAITING'
                        };
                    }).filter(item => item.id);
                }
                setCart(items);

                const snapshot = {};
                items.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
                setConfirmedCart(snapshot);

                if (existingOrder.promotion) {
                    setSelectedPromotion(existingOrder.promotion);
                }
            }
        } catch (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
            showToast("Không thể kiểm tra đơn hàng hiện tại", "error");
        }
    }, [entity, isRoom, products, showToast]);

    const fetchOrderById = useCallback(async (orderId) => {
        try {
            const response = await axiosClient.get(`/customer/orders/${orderId}`);
            const updatedOrder = response.data;
            setOrder(updatedOrder);

            if (updatedOrder.items && updatedOrder.items.length > 0) {
                const updatedCart = updatedOrder.items.map(item => {
                    const foodId = item.foodId || item.food?.id || item.id;
                    const product = products.find(p => p.id === foodId);
                    return {
                        id: foodId,
                        name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                        price: item.price || 0,
                        quantity: item.quantity || 0,
                        image: product?.imageUrl || '',
                        kitchenStatus: item.kitchenStatus || 'WAITING'
                    };
                });
                setCart(updatedCart);

                const snapshot = {};
                updatedCart.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
                setConfirmedCart(snapshot);
            }
            return updatedOrder;
        } catch (err) {
            console.error("Lỗi fetch order:", err);
            return null;
        }
    }, [products]);

    // ===== CART OPERATIONS =====
    const addToCart = useCallback((product) => {
        const price = product.finalPrice || product.branchPrice || product.originalPrice || 0;
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => parseInt(item.id) === parseInt(product.id));
            if (existingIndex >= 0) {
                return prevCart.map((item, index) =>
                    index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, {
                id: product.id,
                branchFoodId: product.branchFoodId,
                name: product.name,
                price: price,
                quantity: 1,
                image: product.imageUrl?.startsWith("http") ? product.imageUrl : `http://localhost:8080/${product.imageUrl}`,
                kitchenStatus: 'WAITING'
            }];
        });
    }, []);

    const updateQuantity = useCallback((id, delta) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (parseInt(item.id) === parseInt(id)) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    }, []);

    const removeFromCart = useCallback((id) => {
        setCart(prevCart => prevCart.filter(item => parseInt(item.id) !== parseInt(id)));
    }, []);

    // ===== COMPUTED VALUES =====
    const itemsTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
    const originalTotal = useMemo(() => itemsTotal + roomFee, [itemsTotal, roomFee]);
    const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    const discount = useMemo(() => selectedPromotion?.discountPercentage
        ? (originalTotal * selectedPromotion.discountPercentage) / 100
        : selectedPromotion?.discountAmount || 0, [originalTotal, selectedPromotion]);

    const finalTotal = useMemo(() => originalTotal - discount, [originalTotal, discount]);

    // ===== ORDER OPERATIONS =====
    const handleUpdateOrder = async () => {
        if (cart.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        const orderItemMap = {};
        if (order?.items?.length > 0) {
            order.items.forEach(item => {
                const foodId = item.foodId || item.food?.id;
                if (foodId) {
                    orderItemMap[parseInt(foodId)] = (orderItemMap[parseInt(foodId)] || 0) + (item.quantity || 0);
                }
            });
        }

        const groupedCart = {};
        cart.forEach(item => {
            const foodId = parseInt(item.id);
            if (!foodId) return;
            if (groupedCart[foodId]) {
                groupedCart[foodId].quantity += item.quantity;
                if (item.price > groupedCart[foodId].price) groupedCart[foodId].price = item.price;
            } else {
                groupedCart[foodId] = { ...item };
            }
        });

        const mergedCart = Object.values(groupedCart);
        const itemsToAdd = [];
        mergedCart.forEach(item => {
            const foodId = parseInt(item.id);
            if (!foodId) return;
            const orderQty = orderItemMap[foodId] || 0;
            const quantityToAdd = item.quantity - orderQty;
            if (quantityToAdd > 0) itemsToAdd.push({ foodId, quantity: quantityToAdd });
        });

        if (itemsToAdd.length === 0) {
            showToast("Chưa có món mới để cập nhật!", "info", 3000);
            return;
        }

        setIsUpdating(true);
        try {
            await axiosClient.post(`/customer/orders/${order.id}/add-items`, itemsToAdd);
            await fetchOrderById(order.id);

            const newItems = itemsToAdd.map(item => {
                const product = products.find(p => p.id === item.foodId);
                return {
                    id: item.foodId, name: product?.name || `Món #${item.foodId}`,
                    quantity: item.quantity, orderId: order.id,
                    tableNumber: entityNumber, tableId: entity.id, status: 'WAITING'
                };
            });

            socket.emit("order-updated", {
                orderId: order.id, tableNumber: entityNumber, tableId: entity.id,
                locationName: isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`,
                areaName: entity?.area || "Khu chính", isRoom: isRoom,
                items: newItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
                timestamp: new Date().toISOString(), branchId: branchId
            });

            const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
            sendCashierNotification(`➕ ${locationName} thêm món - ${finalTotal.toLocaleString('vi-VN')}đ`, 'order');

            showToast(`Đã thêm ${itemsToAdd.reduce((sum, i) => sum + i.quantity, 0)} món vào đơn!`, 'success', 3000);
        } catch (err) {
            console.error("❌ Lỗi cập nhật đơn:", err);
            showToast(`Lỗi: ${err.response?.data?.message || err.message}`, "error", 5000);
        } finally {
            setIsUpdating(false);
        }
    };

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
            if (selectedPromotion?.id) orderData.promotion = { id: selectedPromotion.id };

            const res = await axiosClient.post("/customer/orders", orderData);
            const newOrder = res.data;

            try {
                if (!isRoom) {
                    await axiosClient.put(`/tables/${entity.id}/status?status=OCCUPIED`);
                    console.log(`✅ Đã cập nhật bàn ${entityNumber} thành OCCUPIED`);
                } else {
                    await axiosClient.put(`/rooms/${entity.id}/status?status=OCCUPIED`);
                    console.log(`✅ Đã cập nhật phòng ${entityNumber} thành OCCUPIED`);
                }
            } catch (err) {
                console.error("Lỗi cập nhật trạng thái:", err);
            }

            const itemsToAdd = cart.filter(item => item.id && item.quantity > 0)
                .map(item => ({ foodId: item.id, quantity: item.quantity }));

            if (itemsToAdd.length > 0) {
                await axiosClient.post(`/customer/orders/${newOrder.id}/add-items`, itemsToAdd);
            }

            await fetchOrderById(newOrder.id);

            const newItems = itemsToAdd.map(item => {
                const product = products.find(p => p.id === item.foodId);
                return {
                    id: item.foodId, name: product?.name || `Món #${item.foodId}`,
                    quantity: item.quantity, orderId: newOrder.id,
                    tableNumber: entityNumber, tableId: entity.id, status: 'WAITING'
                };
            });

            socket.emit("new-order", {
                orderId: newOrder.id, tableNumber: entityNumber, tableId: entity.id,
                locationName: isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`,
                areaName: entity?.area || "Khu chính", isRoom: isRoom,
                items: newItems.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
                timestamp: new Date().toISOString(), branchId: branchId
            });

            const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
            sendCashierNotification(`🆕 ${locationName} - Đơn mới: ${totalItems} món - ${finalTotal.toLocaleString('vi-VN')}đ`, 'order');

            showToast(`Đơn hàng đã được gửi đến bếp!`, 'success', 4000);
        } catch (err) {
            console.error("❌ Lỗi tạo đơn:", err);
            showToast(`Lỗi: ${err.response?.data?.message || "Không thể tạo đơn hàng!"}`, "error", 5000);
        } finally {
            setIsConfirming(false);
        }
    };

    // ===== PAYMENT =====
    const handlePayOSPayment = async () => {
        if (!order) {
            showToast("Không tìm thấy đơn hàng!", "error", 2000);
            return;
        }

        setProcessingPayment(true);
        try {
            const tempOrderCode = Date.now() % 2147483647;
            const shortDesc = `Thanh toan don ${order.id}`.substring(0, 25);

            sessionStorage.removeItem('paymentCancelled');

            const tempPaymentData = {
                orderId: order.id, totalAmount: finalTotal,
                customerName: customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`,
                entityType: entityType, entityNumber: entityNumber,
                entityId: entity.id, isRoom: isRoom, returnTo: '/waiter/orders'
            };
            sessionStorage.setItem('tempCashierPayment', JSON.stringify(tempPaymentData));

            const entityData = {
                id: entity.id, number: entity.number,
                type: isRoom ? 'room' : 'table', status: entity.status,
                capacity: entity.capacity, area: entity.area
            };
            sessionStorage.setItem('lastEntity', JSON.stringify(entityData));

            const items = cart.map(item => ({
                name: String(item.name || "Món ăn"),
                quantity: Number(item.quantity) || 1,
                price: Math.floor(Number(item.price) || 0)
            }));

            const paymentResponse = await axiosClient.post("/payos/create", {
                orderCode: tempOrderCode,
                amount: Math.floor(finalTotal),
                description: shortDesc,
                returnUrl: `${window.location.origin}/waiter/payment-success?orderId=${order.id}&entityId=${entity.id}&isRoom=${isRoom}&returnTo=/waiter/orders`,
                cancelUrl: `${window.location.origin}/waiter/payment-cancel?orderId=${order.id}&returnTo=/waiter/orders`,
                items: items
            });

            if (paymentResponse.data.code !== "00" || !paymentResponse.data.data?.checkoutUrl) {
                throw new Error(paymentResponse.data.desc || "Không thể tạo link thanh toán");
            }

            window.location.href = paymentResponse.data.data.checkoutUrl;
        } catch (err) {
            console.error("Payment error:", err);
            showToast(`Lỗi thanh toán: ${err.message}`, "error", 3000);
            setProcessingPayment(false);
        }
    };

    // ===== PRINT BILL =====
    const printBill = () => {
        const branchName = branchInfo?.name || 'LA COSTA RESTAURANT';
        const branchAddress = branchInfo?.address || '123 Đường ABC, Quận XYZ, TP.HCM';
        const branchPhone = branchInfo?.phone || '0123 456 789';

        const billContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hóa đơn ${entityType} ${entityNumber}</title><style>
            *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;background:white}
            .bill-container{max-width:800px;margin:0 auto;border:2px solid #333;padding:30px}
            .header{text-align:center;border-bottom:2px solid #333;padding-bottom:20px;margin-bottom:20px}
            .header h1{font-size:32px;color:#8b4513;margin-bottom:5px}.header p{color:#666;font-size:14px}
            .bill-info{display:flex;justify-content:space-between;margin-bottom:30px;padding:15px;background:#f9f9f9;border-radius:8px}
            .bill-info div{flex:1}.bill-info strong{display:block;color:#333;margin-bottom:5px}
            table{width:100%;border-collapse:collapse;margin-bottom:20px}thead{background:#8b4513;color:white}
            th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd}.text-right{text-align:right}.text-center{text-align:center}
            .totals{margin-top:20px;padding-top:20px;border-top:2px solid #333}
            .total-row{display:flex;justify-content:space-between;padding:8px 0;font-size:16px}
            .total-row.grand-total{font-size:20px;font-weight:bold;color:#8b4513;margin-top:10px;padding-top:10px;border-top:2px solid #8b4513}
            .footer{margin-top:40px;text-align:center;padding-top:20px;border-top:1px dashed #999;color:#666}
        </style></head><body><div class="bill-container">
            <div class="header"><h1>${branchName}</h1><p>${branchAddress}</p><p>Hotline: ${branchPhone}</p></div>
            <div class="bill-info">
                <div><strong>HÓA ĐƠN</strong><span>${new Date().toLocaleString('vi-VN')}</span></div>
                <div><strong>Khách hàng</strong><span>${customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`}</span></div>
                <div><strong>${entityType}</strong><span>${entityType} ${entityNumber}</span></div>
            </div>
            <table><thead><tr><th>Sản phẩm</th><th class="text-center">SL</th><th class="text-right">Đơn giá</th><th class="text-right">Thành tiền</th></tr></thead>
            <tbody>${cart.map(item => `<tr><td>${item.name}</td><td class="text-center">${item.quantity}</td><td class="text-right">${item.price.toLocaleString('vi-VN')}đ</td><td class="text-right">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>`).join('')}</tbody></table>
            <div class="totals">
                <div class="total-row"><span>Tạm tính món:</span><span>${itemsTotal.toLocaleString('vi-VN')}đ</span></div>
                ${isRoom && roomFee > 0 ? `<div class="total-row"><span>🏠 Phí phòng VIP:</span><span>${roomFee.toLocaleString('vi-VN')}đ</span></div>` : ''}
                <div class="total-row"><span>Tổng tiền trước KM:</span><span>${originalTotal.toLocaleString('vi-VN')}đ</span></div>
                ${discount > 0 ? `<div class="total-row" style="color:#10b981;"><span>Giảm giá:</span><span>-${discount.toLocaleString('vi-VN')}đ</span></div>` : ''}
                <div class="total-row grand-total"><span>TỔNG CỘNG:</span><span>${finalTotal.toLocaleString('vi-VN')}đ</span></div>
            </div>
            <div class="footer"><p>Cảm ơn quý khách! Hẹn gặp lại!</p></div>
        </div></body></html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(billContent);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const filteredProducts = useMemo(() => {
        return products
            .filter(p => activeTab === "Tất cả" ? true : p.categoryName === activeTab)
            .filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, activeTab, searchTerm]);

    const canPay = order?.status === "COMPLETED";
    const canPrint = order?.status === "COMPLETED" || order?.status === "PAID";
    const canEdit = order && order.status !== "PAID" && order.status !== "CANCELED";
    const isNewOrder = !order;

    // ===== EFFECTS =====
    useEffect(() => {
        if (!entity) return;
        const initialize = async () => {
            setLoading(true);
            await Promise.all([fetchProducts(), fetchPromotions(), fetchBranchInfo()]);
        };
        initialize();
    }, [entity, fetchProducts, fetchPromotions, fetchBranchInfo]);

    useEffect(() => {
        if (isRoom && entity?.roomFee) {
            setRoomFee(Number(entity.roomFee));
            console.log(`🏠 Phí phòng VIP ${entityNumber}: ${Number(entity.roomFee).toLocaleString('vi-VN')}đ`);
        } else {
            setRoomFee(0);
        }
    }, [isRoom, entity, entityNumber]);

    useEffect(() => {
        if (products.length === 0) return;
        const existingOrderFromState = state?.existingOrder;
        const processOrder = async () => {
            if (existingOrderFromState && existingOrderFromState.status !== "PAID" && existingOrderFromState.status !== "CANCELED") {
                setOrder(existingOrderFromState);
                setCustomerName(existingOrderFromState.customerName || "");
                let items = [];
                if (existingOrderFromState.items?.length > 0) {
                    items = existingOrderFromState.items.map(item => {
                        const foodId = item.foodId || item.food?.id || item.id;
                        const product = products.find(p => p.id === foodId);
                        return {
                            id: foodId, name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                            price: item.price || 0, quantity: item.quantity || 0,
                            image: product?.imageUrl || '', kitchenStatus: item.kitchenStatus || 'WAITING'
                        };
                    }).filter(item => item.id);
                }
                setCart(items);
                const snapshot = {};
                items.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
                setConfirmedCart(snapshot);
                if (existingOrderFromState.promotion) setSelectedPromotion(existingOrderFromState.promotion);
            } else if (entity) {
                await checkExistingOrder();
            }
        };
        processOrder();
    }, [products, state?.existingOrder, entity, checkExistingOrder]);

    useEffect(() => {
        const handleConnect = () => {
            socket.emit("register-role", { role: "waiter", userId: user?.id, branchId: branchId });
        };

        const handleUpdateOrderStatus = async (data) => {
            if (data.branchId && branchId && data.branchId !== branchId) return;
            if (order && order.id === data.orderId) {
                await fetchOrderById(order.id);
                showToast(`🔔 Đơn hàng #${order.id} đã chuyển trạng thái: ${data.newStatus || data.status}`, 'info', 3000);
            }
        };

        const handleUpdateOrderItemStatus = (data) => {
            if (data.branchId && branchId && data.branchId !== branchId) return;
            if (!order || !data.items || data.items.length === 0) return;
            const orderItemIds = order.items?.map(item => item.foodId || item.food?.id || item.id) || [];
            const hasRelevantItem = data.items.some(id => orderItemIds.includes(parseInt(id)));
            if (!hasRelevantItem) return;
            if (order.items) {
                const updatedItems = order.items.map(item => {
                    const foodId = item.foodId || item.food?.id || item.id;
                    if (data.items.includes(parseInt(foodId))) return { ...item, kitchenStatus: data.status };
                    return item;
                });
                setOrder(prev => prev ? { ...prev, items: updatedItems } : prev);
                setCart(prevCart => prevCart.map(item => {
                    const foodId = parseInt(item.id);
                    if (data.items.includes(foodId)) return { ...item, kitchenStatus: data.status };
                    return item;
                }));
            }
            let statusText, toastType;
            switch (data.status) {
                case 'PREPARING': statusText = '🔪 ĐANG NẤU'; toastType = 'info'; break;
                case 'READY': statusText = '✅ HOÀN THÀNH'; toastType = 'success'; break;
                default: statusText = `📋 ${data.status}`; toastType = 'info';
            }
            showToast(`${statusText}: ${data.itemName}`, toastType, 5000);
        };

        socket.on("connect", handleConnect);
        socket.on("update-order-status", handleUpdateOrderStatus);
        socket.on("update-order-item-status", handleUpdateOrderItemStatus);
        if (socket.connected) handleConnect();

        return () => {
            socket.off("connect", handleConnect);
            socket.off("update-order-status", handleUpdateOrderStatus);
            socket.off("update-order-item-status", handleUpdateOrderItemStatus);
        };
    }, [order, branchId, user?.id, fetchOrderById, showToast]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        const returnTo = urlParams.get('returnTo');
        const orderId = urlParams.get('orderId');
        const entityId = urlParams.get('entityId');
        const isRoomParam = urlParams.get('isRoom');

        if (paymentStatus === 'success') {
            (async () => {
                if (orderId) {
                    try { await axiosClient.put(`/customer/orders/${orderId}/pay?paymentMethod=BANKING`); } catch (err) { }
                }
                if (entityId) {
                    try {
                        const newStatus = isRoomParam === 'true' ? 'ACTIVE' : 'FREE';
                        const url = isRoomParam === 'true'
                            ? `/rooms/${entityId}/status?status=${newStatus}`
                            : `/tables/${entityId}/status?status=${newStatus}`;
                        await axiosClient.put(url);
                        socket.emit("update-tables");
                    } catch (err) { }
                }

                const entityType2 = isRoomParam === 'true' ? 'Phòng' : 'Bàn';
                sendCashierNotification(`💰 ${entityType2} ${entityNumber || ''} thanh toán PayOS thành công`, 'success');

                window.history.replaceState({}, document.title, window.location.pathname);
                showToast("Thanh toán thành công!", "success", 2000);
                setTimeout(() => navigate(returnTo || '/waiter/orders'), 2000);
            })();
        } else if (paymentStatus === 'cancel') {
            window.history.replaceState({}, document.title, window.location.pathname);
            showToast("Thanh toán đã bị hủy", "warning", 2000);
        }
    }, [navigate, showToast]);

    useEffect(() => {
        if (products.length > 0 && cart.length > 0) {
            let hasChange = false;
            const updatedCart = cart.map(item => {
                if (!item.id && item.name) {
                    const product = products.find(p => p.name === item.name);
                    if (product) { hasChange = true; return { ...item, id: product.id }; }
                }
                return item;
            });
            if (hasChange) setCart(updatedCart);
        }
    }, [products, cart]);

    useEffect(() => {
        if (cart.length <= 1) return;
        const grouped = {};
        cart.forEach(item => {
            const key = parseInt(item.id);
            if (!key) return;
            if (grouped[key]) {
                grouped[key].quantity += item.quantity;
                if (item.price > grouped[key].price) grouped[key].price = item.price;
            } else {
                grouped[key] = { ...item };
            }
        });
        const mergedCart = Object.values(grouped);
        if (mergedCart.length !== cart.length) setCart(mergedCart);
    }, [cart]);

    // ===== RENDER =====
    if (!entity) {
        return (
            <div className={styles.container}>
                <div style={{ textAlign: 'center', padding: '60px' }}>
                    <h2>Không tìm thấy thông tin {entityType.toLowerCase()}</h2>
                    <button onClick={() => navigate('/waiter/orders')} style={{ marginTop: '20px', padding: '10px 24px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Quay lại</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.leftContent}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.tableInfo}>
                        <h1>
                            {isRoom ? <Sofa size={24} color="#dc2626" /> : <Circle size={24} color="#dc2626" />}
                            {entityType} {entityNumber}
                        </h1>
                        <div className={`${entity?.status === "FREE" ? styles.available : styles.occupied}`}>
                            {entity?.status === "FREE" ? (
                                <><CircleCheckBig size={14} color="white" /> Trống</>
                            ) : entity?.status === "RESERVED" ? (
                                <><Clock size={14} color="white" /> Đã đặt</>
                            ) : (
                                <><Circle size={14} color="white" /> Đã có khách</>
                            )}
                        </div>
                        {order?.status === "PENDING" && (
                            <div className={styles.statusBadge} style={{ background: "#3b82f6" }}>
                                <Clock size={14} color="white" /> Đang chờ bếp
                            </div>
                        )}
                        {order?.status === "PREPARING" && (
                            <div className={styles.statusBadge} style={{ background: "#f59e0b" }}>
                                <ChefHat size={14} color="white" /> Đang chuẩn bị
                            </div>
                        )}
                        {order?.status === "COMPLETED" && (
                            <div className={styles.statusBadge} style={{ background: "#10b981" }}>
                                <CheckCircle size={14} color="white" /> Đã hoàn thành
                            </div>
                        )}
                    </div>
                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                            <ShoppingCart size={18} color="#dc2626" />
                            <span>{totalItems} món</span>
                        </div>
                        <div className={styles.statItem}>
                            <Users size={18} color="#dc2626" />
                            <span>{entity?.capacity || 4} người</span>
                        </div>
                    </div>
                </div>

                {/* Customer Section */}
                <div className={styles.customerSection}>
                    <input
                        type="text"
                        className={styles.customerInput}
                        placeholder="Tên khách hàng (tùy chọn)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                </div>

                {/* Promotion Section */}
                {order?.status !== "PAID" && (
                    <div className={styles.promotionSection}>
                        <div className={styles.formGroup}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={16} color="#854d0e" />Mã khuyến mãi
                            </label>
                            <div className={styles.promotionSelect} onClick={() => setShowPromotionModal(true)} style={{ cursor: 'pointer' }}>
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
                                            onClick={(e) => { e.stopPropagation(); setSelectedPromotion(null); }}
                                            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', marginLeft: 'auto' }}
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

                {/* Search & Category Tabs */}
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

                {/* Products Grid */}
                <div className={styles.content}>
                    {order?.status !== "PAID" && (
                        <div className={styles.productsGrid}>
                            {loading ? (
                                <div className={styles.loading}>Đang tải...</div>
                            ) : filteredProducts.length === 0 ? (
                                <div className={styles.emptyProducts}>Không tìm thấy sản phẩm nào</div>
                            ) : (
                                filteredProducts.map(product => (
                                    <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
                                        <img
                                            src={product.imageUrl?.startsWith("http") ? product.imageUrl : `http://localhost:8080/${product.imageUrl}`}
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
                </div>
            </div>

            {/* Cart Sidebar */}
            <div className={styles.cartSidebar}>
                <div className={styles.cartHeader}>
                    <h3><ShoppingCart size={18} color="white" /> Đơn hàng</h3>
                    <button className={styles.cartBackBtn} onClick={() => navigate('/waiter/orders')}>
                        <ArrowLeft size={18} />Quay về
                    </button>
                </div>

                {cart.length === 0 ? (
                    <p className={styles.emptyCart}>Chưa có món nào</p>
                ) : (
                    <>
                        <div className={styles.cartList}>
                            {cart.map((item, index) => (
                                <div key={`${item.id}_${index}`} className={styles.cartItem}>
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
                                </div>
                            ))}
                        </div>

                        <div className={styles.cartFooter}>
                            {isRoom && roomFee > 0 && (
                                <div className={styles.totalRow}>
                                    <span><Sofa size={14} /> Phí phòng VIP:</span>
                                    <span>{roomFee.toLocaleString('vi-VN')}đ</span>
                                </div>
                            )}

                            {discount > 0 && (
                                <>
                                    <div className={styles.totalRow}>
                                        <span>Tạm tính (món + phí phòng):</span>
                                        <span>{originalTotal.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className={styles.discountRow}>
                                        <span><Tag size={14} color="#10b981" /> Giảm giá:</span>
                                        <span>-{discount.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </>
                            )}

                            {discount === 0 && isRoom && roomFee > 0 && (
                                <div className={styles.totalRow}>
                                    <span>Tạm tính món:</span>
                                    <span>{itemsTotal.toLocaleString('vi-VN')}đ</span>
                                </div>
                            )}

                            <div className={styles.totalRow}>
                                <span><Wallet size={14} /> Tổng cộng:</span>
                                <span className={styles.totalAmount}>{finalTotal.toLocaleString('vi-VN')}đ</span>
                            </div>

                            {canEdit && cart.length > 0 && (
                                <button className={styles.updateBtn} onClick={handleUpdateOrder} disabled={isUpdating}>
                                    {isUpdating ? "Đang cập nhật..." : "CẬP NHẬT THÊM MÓN"}
                                </button>
                            )}
                            {isNewOrder && cart.length > 0 && (
                                <button className={styles.orderBtn} onClick={handleConfirmOrder} disabled={isConfirming}>
                                    {isConfirming ? "Đang xử lý..." : "Xác nhận đơn"}
                                </button>
                            )}
                            {canPrint && (
                                <button className={styles.printBtn} onClick={printBill}>
                                    <Printer size={18} /> In hóa đơn
                                </button>
                            )}
                            {canPay && (
                                <button className={styles.payBtn} onClick={handlePayOSPayment} disabled={processingPayment}>
                                    {processingPayment ? "Đang xử lý..." : "Thanh toán PayOS"}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Promotion Modal */}
            {showPromotionModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPromotionModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3><Tag size={20} color="white" /> Chọn mã khuyến mãi</h3>
                            <button onClick={() => setShowPromotionModal(false)} className={styles.modalClose}>
                                <X size={24} />
                            </button>
                        </div>
                        <div
                            className={`${styles.promoOption} ${!selectedPromotion ? styles.selected : ''}`}
                            onClick={() => { setSelectedPromotion(null); setShowPromotionModal(false); }}
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
                                        {promo.discountPercentage ? <Percent size={20} color="#f59e0b" /> : <DollarSign size={20} color="#f59e0b" />}
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

            {/* Toast Notifications */}
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

export default OrderDetail;