import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ShoppingCart, Users, Plus, Minus, Trash2, Printer, Tag, X,
    CheckCircle, Clock, ChefHat, Circle, CircleCheckBig,
    Sofa, Wallet, XCircle
} from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import PaymentMethodModal from "./PaymentMethodModal";
import ToastNotification from "./ToastNotification";
import styles from "./TableDetail.module.css";
import CashPaymentModal from "./CashPaymentModal";

const socket = io('/', { path: '/socket.io/' });
const API = "";
const CASHIER_NOTIFICATIONS_KEY = 'cashier_notifications';

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
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showCashModal, setShowCashModal] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const confirmedCartRef = useRef({});
    const [branchInfo, setBranchInfo] = useState(null);
    const [roomFee, setRoomFee] = useState(0);

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const API_BASE_URL = '';

    const getDiscountedPrices = useCallback((orderId) => {
        if (!orderId) return {};
        const key = `discounted_prices_${orderId}`;
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : {};
    }, []);

    // ===== GỬI NOTIFICATION =====
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

        console.log('📤 Notification sent:', message);
    };

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const fetchProducts = useCallback(async () => {
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
    }, [branchId, API_BASE_URL]);

    const fetchBranchInfo = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBranchInfo(data);
                console.log("📋 Branch info:", data);
            }
        } catch (err) {
            console.error("Lỗi tải thông tin chi nhánh:", err);
        }
    }, [branchId, API_BASE_URL]);

    const checkExistingOrder = useCallback(async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const existingOrder = res.data.find(o => {
                if (isRoom) {
                    return o.room?.id === entity.id && o.status !== "PAID" && o.status !== "CANCELED";
                }
                return o.table?.id === entity.id && o.status !== "PAID" && o.status !== "CANCELED";
            });

            if (existingOrder) {
                console.log("🔍 Found existing order:", existingOrder.id);
                setOrder(existingOrder);
                setCustomerName(existingOrder.customerName || "");

                const savedPrices = getDiscountedPrices(existingOrder.id);
                console.log("📦 Khôi phục giá từ localStorage:", savedPrices);

                let items = [];
                if (existingOrder.items && existingOrder.items.length > 0) {
                    items = existingOrder.items.map(item => {
                        const foodId = item.foodId || item.food?.id || item.id;
                        const product = products.find(p => p.id === foodId);
                        const displayPrice = savedPrices[foodId] || item.price || 0;

                        return {
                            id: foodId,
                            name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                            price: displayPrice,
                            quantity: item.quantity || 0,
                            image: product?.imageUrl || ''
                        };
                    }).filter(item => item.id);
                }
                setCart(items);
                const snapshot = {};
                items.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
            }
        } catch (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
        }
    }, [isRoom, entity, products, getDiscountedPrices]);

    const addToCart = (product) => {
        const price = product.finalPrice || product.branchPrice || product.originalPrice || 0;

        const existingIndex = cart.findIndex(item =>
            parseInt(item.id) === parseInt(product.id)
        );

        if (existingIndex >= 0) {
            setCart(cart.map((item, index) =>
                index === existingIndex
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
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
        setCart(prevCart => {
            return prevCart.map(item => {
                if (parseInt(item.id) === parseInt(id)) {
                    const newQty = item.quantity + delta;
                    return newQty > 0 ? { ...item, quantity: newQty } : null;
                }
                return item;
            }).filter(Boolean);
        });
    };

    const removeFromCart = (id) => {
        setCart(prevCart => prevCart.filter(item => parseInt(item.id) !== parseInt(id)));
    };

    // Tính tổng tiền đã bao gồm phí phòng
    const itemsTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalTotal = itemsTotal + roomFee;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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

        // Tạo danh sách items để thêm - CÓ KÈM PRICE
        const itemsToAdd = [];
        mergedCart.forEach(item => {
            const foodId = parseInt(item.id);
            if (!foodId) return;
            const orderQty = orderItemMap[foodId] || 0;
            const quantityToAdd = item.quantity - orderQty;
            if (quantityToAdd > 0) {
                itemsToAdd.push({
                    foodId: foodId,
                    quantity: quantityToAdd,
                    price: item.price  // ✅ GỬI PRICE
                });
            }
        });

        if (itemsToAdd.length === 0) {
            showToast("Chưa có món mới để cập nhật!", "info", 3000);
            return;
        }

        console.log("📦 Items to add with price:", itemsToAdd);

        setIsUpdating(true);

        try {
            // Gửi request KÈM PRICE
            await axiosClient.post(`/customer/orders/${order.id}/add-items`, itemsToAdd);
            console.log("✅ Đã thêm items mới với giá đúng");

            // Lấy lại order sau khi cập nhật
            const finalRes = await axiosClient.get(`/customer/orders/${order.id}`);
            const updatedOrder = finalRes.data;
            setOrder(updatedOrder);

            // Cập nhật localStorage
            const newPriceMap = {};
            mergedCart.forEach(item => {
                newPriceMap[item.id] = item.price;
            });
            localStorage.setItem(`discounted_prices_${order.id}`, JSON.stringify(newPriceMap));

            // Cập nhật cart
            if (updatedOrder.items && updatedOrder.items.length > 0) {
                const updatedCart = updatedOrder.items.map(item => {
                    const foodId = item.foodId || item.food?.id || item.id;
                    const product = products.find(p => p.id === foodId);
                    const displayPrice = newPriceMap[foodId] || item.price || 0;

                    return {
                        id: foodId,
                        name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                        price: displayPrice,
                        quantity: item.quantity || 0,
                        image: product?.imageUrl || ''
                    };
                });
                setCart(updatedCart);
            }

            // Gửi socket
            socket.emit("order-updated", {
                orderId: order.id,
                tableNumber: entityNumber,
                tableId: entity.id,
                locationName: isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`,
                areaName: entity?.area || (isRoom ? "Khu VIP" : "Khu chính"),
                items: itemsToAdd.map(item => ({
                    id: item.foodId,
                    name: products.find(p => p.id === item.foodId)?.name || `Món #${item.foodId}`,
                    quantity: item.quantity,
                    price: item.price
                })),
                timestamp: new Date().toISOString(),
                branchId: branchId,
                isRoom: isRoom
            });

            showToast(`Đã thêm ${itemsToAdd.reduce((sum, i) => sum + i.quantity, 0)} món vào đơn!`, 'success', 3000);

        } catch (err) {
            console.error("❌ Lỗi cập nhật đơn:", err);
            showToast(`Lỗi: ${err.response?.data?.message || err.message}`, "error", 5000);
        } finally {
            setIsUpdating(false);
        }
    };

    const updateEntityStatus = useCallback(async (newStatus) => {
        try {
            const updateUrl = isRoom
                ? `${API}/api/rooms/${entity.id}/status?status=${newStatus}`
                : `${API}/api/tables/${entity.id}/status?status=${newStatus}`;

            const token = localStorage.getItem("token");
            const response = await fetch(updateUrl, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                console.log(`✅ Đã cập nhật ${entityType} ${entityNumber} thành ${newStatus}`);
                if (isRoom) {
                    entity.status = newStatus;
                } else {
                    entity.status = newStatus;
                }
                return true;
            } else {
                console.error(`Lỗi cập nhật status: ${response.status}`);
                return false;
            }
        } catch (err) {
            console.error(`Lỗi cập nhật trạng thái ${entityType}:`, err);
            return false;
        }
    }, [isRoom, entity, entityType, entityNumber]);

    const handleConfirmOrder = async () => {
        if (cart.length === 0) {
            showToast("Vui lòng chọn món!", "warning", 2000);
            return;
        }

        setIsConfirming(true);

        try {
            // TẠO ORDER VỚI ITEMS CÓ GIÁ ĐÃ GIẢM NGAY TỪ ĐẦU
            const orderData = {
                customerName: customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`,
                status: "PENDING",
                branch: { id: branchId },
                ...(isRoom ? { room: { id: entity.id } } : { table: { id: entity.id } }),
                items: cart.filter(item => item.id && item.quantity > 0).map(item => ({
                    food: { id: item.id },
                    quantity: item.quantity,
                    price: item.price  // ← GỬI TRỰC TIẾP GIÁ ĐÃ GIẢM
                }))
            };

            console.log("📦 Order data with prices:", orderData);

            const res = await axiosClient.post("/customer/orders", orderData);
            const newOrder = res.data;

            await updateEntityStatus("OCCUPIED");

            // Lưu vào localStorage để dự phòng (cho lần vào sau)
            const priceMap = {};
            cart.forEach(item => {
                priceMap[item.id] = item.price;
            });
            if (newOrder.id) {
                localStorage.setItem(`discounted_prices_${newOrder.id}`, JSON.stringify(priceMap));
            }

            // Lấy order sau khi tạo
            const finalOrder = await axiosClient.get(`/customer/orders/${newOrder.id}`);

            console.log("✅ Final order:", finalOrder.data);
            setOrder(finalOrder.data);

            // Cập nhật cart
            if (finalOrder.data.items && finalOrder.data.items.length > 0) {
                const updatedCart = finalOrder.data.items.map(item => {
                    const foodId = item.foodId || item.food?.id || item.id;
                    const product = products.find(p => p.id === foodId);
                    const displayPrice = priceMap[foodId] || item.price || 0;

                    return {
                        id: foodId,
                        name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                        price: displayPrice,
                        quantity: item.quantity || 0,
                        image: product?.imageUrl || ''
                    };
                });
                setCart(updatedCart);

                const snapshot = {};
                updatedCart.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
            }

            // Tạo danh sách items để gửi socket
            const newItems = cart
                .filter(item => item.id && item.quantity > 0)
                .map(item => {
                    const product = products.find(p => p.id === item.id);
                    return {
                        id: item.id,
                        name: product?.name || `Món #${item.id}`,
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
                locationName: isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`,
                areaName: entity?.area || (isRoom ? "Khu VIP" : "Khu chính"),
                items: newItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity
                })),
                timestamp: new Date().toISOString(),
                branchId: branchId,
                isRoom: isRoom,
                entityType: isRoom ? 'room' : 'table',
                entityNumber: entityNumber,
                entityArea: entity?.area || (isRoom ? "Khu VIP" : "Khu chính")
            });

            socket.emit("update-tables");

            const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
            sendCashierNotification(
                `🆕 Đơn mới - ${locationName}: ${totalItems} món - ${finalTotal.toLocaleString('vi-VN')}đ`,
                'order'
            );

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

            const items = cart.map(item => ({
                name: String(item.name || "Món ăn"),
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
            console.log(`💰 Số tiền thực tế cần thanh toán: ${finalTotal.toLocaleString('vi-VN')}đ`);

            const discountedTotal = finalTotal;

            const payData = paymentData || {};
            const response = await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${backendMethod}`,
                payData
            );

            console.log("✅ Kết quả thanh toán:", response.data);

            if (response.data?.success || response.status === 200) {
                try {
                    const allBills = await axiosClient.get(`/employee/bills`);
                    console.log("📋 Tất cả bills:", allBills.data);

                    const bill = allBills.data.find(b => b.order?.id === orderId);

                    if (bill && bill.id) {
                        console.log(`📄 Tìm thấy bill #${bill.id}:`, bill);
                        console.log(`💰 TotalAmount hiện tại: ${bill.totalAmount}, cần cập nhật thành: ${discountedTotal}`);

                        const updateData = {
                            id: bill.id,
                            order: { id: orderId },
                            totalAmount: discountedTotal,
                            finalAmount: discountedTotal,
                            paymentMethod: backendMethod,
                            paymentStatus: "PAID",
                            notes: `Thanh toán qua ${backendMethod}`
                        };

                        await axiosClient.put(`/employee/bills/${bill.id}`, updateData);
                        console.log(`✅ Đã cập nhật bill #${bill.id} với số tiền đúng: ${discountedTotal.toLocaleString('vi-VN')}đ`);
                    } else {
                        console.log(`⚠️ Không tìm thấy bill cho order #${orderId}`);
                    }
                } catch (billErr) {
                    console.error(`❌ Lỗi khi cập nhật bill:`, billErr.response?.data || billErr.message);
                }

                const key = `discounted_prices_${orderId}`;
                localStorage.removeItem(key);
                console.log(`🗑️ Đã xóa giá khỏi localStorage cho order: ${orderId}`);

                if (entity) {
                    const newStatus = isRoom ? "ACTIVE" : "FREE";
                    const updateUrl = isRoom
                        ? `${API}/api/rooms/${entity.id}/status?status=${newStatus}`
                        : `${API}/api/tables/${entity.id}/status?status=${newStatus}`;

                    try {
                        const token = localStorage.getItem("token");
                        await fetch(updateUrl, {
                            method: "PUT",
                            headers: {
                                "Authorization": `Bearer ${token}`,
                                "Content-Type": "application/json"
                            }
                        });
                        console.log(`✅ Đã cập nhật ${entityType.toLowerCase()} ${entityNumber} thành ${newStatus}`);
                    } catch (err) {
                        console.error("Lỗi cập nhật trạng thái:", err);
                    }
                }

                const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
                const amountFormatted = discountedTotal.toLocaleString('vi-VN') + 'đ';
                const methodText = method === 'cash' ? 'Tiền mặt' : method === 'card' ? 'Thẻ' : 'Chuyển khoản';

                sendCashierNotification(
                    `💰 ${locationName} thanh toán ${amountFormatted} (${methodText})`,
                    'success'
                );

                setOrder(null);
                setCart([]);
                confirmedCartRef.current = {};
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
            console.error("Chi tiết lỗi:", err.response?.data);

            const locationName = isRoom ? `Phòng ${entityNumber}` : `Bàn ${entityNumber}`;
            sendCashierNotification(
                `❌ ${locationName} thanh toán thất bại: ${err.response?.data?.message || err.message}`,
                'error'
            );

            showToast(`Lỗi thanh toán: ${err.response?.data?.message || "Không thể thanh toán!"}`, "error", 3000);
        }
    };

    const printBill = () => {
        const branchName = branchInfo?.name || 'LA COSTA RESTAURANT';
        const branchAddress = branchInfo?.address || '123 Đường ABC, Quận XYZ, TP.HCM';
        const branchPhone = branchInfo?.phone || '0123 456 789';

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
                    <h1>${branchName}</h1>
                    <p>${branchAddress}</p>
                    <p>Hotline: ${branchPhone}</p>
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
                    <div class="total-row"><span>Tạm tính món:</span><span>${itemsTotal.toLocaleString('vi-VN')}đ</span></div>
                    ${isRoom && roomFee > 0 ? `
                    <div class="total-row">
                        <span>🏠 Phí phòng VIP:</span>
                        <span>${roomFee.toLocaleString('vi-VN')}đ</span>
                    </div>
                    ` : ''}
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
        if (isRoom && entity?.roomFee) {
            setRoomFee(Number(entity.roomFee));
            console.log(`🏠 Phí phòng VIP ${entityNumber}: ${Number(entity.roomFee).toLocaleString('vi-VN')}đ`);
        } else {
            setRoomFee(0);
        }
    }, [isRoom, entity, entityNumber]);

    useEffect(() => {
        if (products.length > 0 && cart.length > 0) {
            let hasChange = false;
            const updatedCart = cart.map(item => {
                const product = products.find(p => p.id === item.id);
                if (product && product.name !== item.name) {
                    hasChange = true;
                    return { ...item, name: product.name };
                }
                return item;
            });
            if (hasChange) {
                console.log("🔄 Đồng bộ tên sản phẩm từ products vào cart");
                setCart(updatedCart);
            }
        }
    }, [products, cart]);

    useEffect(() => {
        if (products.length > 0 && cart.length > 0) {
            let hasChange = false;
            const fixedCart = cart.map(item => {
                if (!item.id && item.name) {
                    const product = products.find(p => p.name === item.name);
                    if (product) {
                        hasChange = true;
                        return { ...item, id: product.id };
                    }
                }
                return item;
            });
            if (hasChange) {
                console.log("🔧 Đã tự động fix cart items bị undefined id");
                setCart(fixedCart);
            }
        }
    }, [products, cart]);

    useEffect(() => {
        const paymentCancelled = sessionStorage.getItem('paymentCancelled');
        if (paymentCancelled === 'true') {
            sessionStorage.removeItem('paymentCancelled');
            showToast("Thanh toán đã bị hủy, bạn có thể thử lại", "warning", 3000);
            setProcessingPayment(false);
        }
    }, []);

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
        if (mergedCart.length !== cart.length) {
            console.log("🔄 FIX 3: Gộp cart:", mergedCart);
            setCart(mergedCart);
        }
    }, [cart]);

    useEffect(() => {
        const initialize = async () => {
            await fetchProducts();
            await fetchBranchInfo();
        };
        if (entity) initialize();
    }, [entity, fetchProducts, fetchBranchInfo]);

    useEffect(() => {
        const processExistingOrder = async () => {
            if (products.length === 0) return;
            if (existingOrderFromState) {
                if (existingOrderFromState.status === "PAID" || existingOrderFromState.status === "CANCELED") return;
                setOrder(existingOrderFromState);
                setCustomerName(existingOrderFromState.customerName || "");

                const savedPrices = getDiscountedPrices(existingOrderFromState.id);
                console.log("📦 Khôi phục giá từ localStorage (existingOrderFromState):", savedPrices);

                let items = [];
                if (existingOrderFromState.items && existingOrderFromState.items.length > 0) {
                    items = existingOrderFromState.items.map(item => {
                        const foodId = item.foodId || item.food?.id || item.id;
                        const product = products.find(p => p.id === foodId);
                        const displayPrice = savedPrices[foodId] || item.price || 0;

                        return {
                            id: foodId,
                            name: product?.name || item.food?.name || `Sản phẩm #${foodId}`,
                            price: displayPrice,
                            quantity: item.quantity || 0,
                            image: product?.imageUrl || item.food?.imageUrl || ''
                        };
                    }).filter(item => item.id);
                }
                setCart(items);
                const snapshot = {};
                items.forEach(item => { snapshot[item.id] = item.quantity; });
                confirmedCartRef.current = snapshot;
            } else if (entity) {
                await checkExistingOrder();
            }
        };
        processExistingOrder();
    }, [products, existingOrderFromState, entity, checkExistingOrder, getDiscountedPrices]);

    const canPay = order?.status === "COMPLETED";
    const canPrint = order?.status === "COMPLETED" || order?.status === "PAID";
    const canEdit = order && order.status !== "PAID" && order.status !== "CANCELED";
    const isNewOrder = !order;

    useEffect(() => {
        const syncRoomStatus = async () => {
            if (!isRoom || !entity) return;

            if (order && order.status !== "PAID" && order.status !== "CANCELED" && entity.status === "ACTIVE") {
                console.log(`🔧 Phòng ${entityNumber} có order nhưng đang ACTIVE, chuyển thành OCCUPIED`);
                await updateEntityStatus("OCCUPIED");
            }

            if ((!order || order.status === "PAID" || order.status === "CANCELED") && entity.status === "OCCUPIED") {
                console.log(`🔧 Phòng ${entityNumber} không có order active nhưng đang OCCUPIED, chuyển thành ACTIVE`);
                await updateEntityStatus("ACTIVE");
            }
        };

        if (order !== undefined) {
            syncRoomStatus();
        }
    }, [order, isRoom, entity, entityNumber, updateEntityStatus]);

    return (
        <div className={styles.container}>
            <div className={styles.leftContent}>
                <div className={styles.header}>
                    <div className={styles.tableInfo}>
                        <h1>
                            {isRoom ? <Sofa size={24} color="#dc2626" /> : <Circle size={24} color="#dc2626" />}
                            {entityType} {entityNumber}
                        </h1>
                        <div className={`${entity?.status === "ACTIVE" ? styles.available :
                            entity?.status === "OCCUPIED" ? styles.occupied :
                                entity?.status === "MAINTENANCE" ? styles.maintenance :
                                    styles.occupied
                            }`}>
                            {entity?.status === "ACTIVE" ? (
                                <><CircleCheckBig size={14} color="white" /> Trống</>
                            ) : entity?.status === "OCCUPIED" ? (
                                <><Circle size={14} color="white" /> Đã có khách</>
                            ) : entity?.status === "MAINTENANCE" ? (
                                <><XCircle size={14} color="white" /> Bảo trì</>
                            ) : (
                                <><Circle size={14} color="white" /> {entity?.status}</>
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

                <div className={styles.customerSection}>
                    <input type="text" className={styles.customerInput} placeholder="Tên khách hàng (tùy chọn)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>

                {order?.status !== "PAID" && (
                    <>
                        <div className={styles.searchSection}>
                            <input type="text" className={styles.searchInput} placeholder="Tìm kiếm món..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className={styles.categoryTabs}>
                            {categories.map(cat => (
                                <button key={cat} className={`${styles.categoryBtn} ${activeTab === cat ? styles.active : ""}`} onClick={() => setActiveTab(cat)}>{cat}</button>
                            ))}
                        </div>
                    </>
                )}

                <div className={styles.content}>
                    {order?.status !== "PAID" && (
                        <div className={styles.productsGrid}>
                            {loading ? <div className={styles.loading}>Đang tải...</div> : (
                                filteredProducts.map(product => (
                                    <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
                                        <img src={product.imageUrl?.startsWith("http") ? product.imageUrl : `${API_BASE_URL}/${product.imageUrl}`} alt={product.name} className={styles.productImage} onError={(e) => { e.target.src = "/default-food.jpg"; }} />
                                        <div className={styles.productInfo}>
                                            <h4>{product.name}</h4>
                                            <p className={styles.productPrice}>{(product.finalPrice || product.branchPrice || product.originalPrice || 0).toLocaleString('vi-VN')}đ</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className={styles.cartSidebar}>
                        <div className={styles.cartHeader}>
                            <h3><ShoppingCart size={18} color="white" /> Đơn hàng</h3>
                            <button className={styles.cartBackBtn} onClick={() => navigate(-1)}><ArrowLeft size={18} />Quay về</button>
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
                                                <span className={styles.cartItemPrice}>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</span>
                                            </div>
                                            {order?.status !== "PAID" ? (
                                                <div className={styles.cartItemControls}>
                                                    <button onClick={() => updateQuantity(item.id, -1)} className={styles.qtyBtn}><Minus size={14} /></button>
                                                    <span className={styles.qty}>{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.id, 1)} className={styles.qtyBtn}><Plus size={14} /></button>
                                                    <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}><Trash2 size={14} /></button>
                                                </div>
                                            ) : (
                                                <div className={styles.cartItemControls}><span className={styles.qty}>x{item.quantity}</span></div>
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

                                    <div className={styles.totalRow}>
                                        <span><Wallet size={14} /> Tổng cộng:</span>
                                        <span className={styles.totalAmount}>{finalTotal.toLocaleString('vi-VN')}đ</span>
                                    </div>

                                    {canEdit && cart.length > 0 && <button className={styles.updateBtn} onClick={handleUpdateOrder} disabled={isUpdating}>{isUpdating ? "Đang cập nhật..." : "CẬP NHẬT THÊM MÓN"}</button>}
                                    {isNewOrder && cart.length > 0 && <button className={styles.orderBtn} onClick={handleConfirmOrder} disabled={isConfirming}>{isConfirming ? "Đang xử lý..." : "Xác nhận đơn"}</button>}
                                    {canPrint && <button className={styles.printBtn} onClick={printBill}><Printer size={18} />In hóa đơn</button>}
                                    {canPay && <button className={styles.payBtn} onClick={() => setShowPaymentMethodModal(true)} disabled={processingPayment}>{processingPayment ? "Đang xử lý..." : "Thanh toán"}</button>}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <PaymentMethodModal show={showPaymentMethodModal} onClose={() => setShowPaymentMethodModal(false)} onSelect={(method) => { setShowPaymentMethodModal(false); if (method === "transfer" || method === "momo") { handlePayOSPayment(); } else if (method === "cash") { setShowCashModal(true); } else if (method === "card") { handleCompletePayment(order?.id, "card"); } }} />
            <CashPaymentModal show={showCashModal} onClose={() => setShowCashModal(false)} onConfirm={() => { handleCompletePayment(order?.id, "cash"); }} totalAmount={finalTotal} />

            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <ToastNotification key={toast.id} message={toast.message} type={toast.type} duration={toast.duration} onClose={() => removeToast(toast.id)} />
                ))}
            </div>
        </div>
    );
};

export default TableDetail;