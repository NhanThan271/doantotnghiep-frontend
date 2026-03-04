import React, { useState, useEffect } from "react";
import TransferPaymentModal from "./TransferPaymentModal";
import TransferPaymentPayOs from "./TransferPaymentPayOs";
import PaymentMethodModal from "./PaymentMethodModal";
import styles from "./CafeStaffSystem.module.css";
import { Trash2, Minus, Plus, Printer, Tag, X, Percent, DollarSign } from "lucide-react";
import axiosClient from "../../api/axiosClient";
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

const CartSection = ({
    cart = [],
    setCart = () => { },
    selectedTable = null,
    setShowTableSelection = () => { },
    setSelectedTable = () => { },
    placeOrder = () => { },
    currentOrders = [],
    prepareOrder = () => { },
    completeOrder = () => { },
    payOrder = () => { },
    updateQuantity = () => { },
    removeFromCart = () => { },
    totalAmount = 0,
    customerName = "",
    setCustomerName = () => { },
    paymentMethod = "cash",
    setPaymentMethod = () => { },
    showOrderHistory = false,
    setShowOrderHistory = () => { },
    promotions = [],
    selectedPromotion = null,
    setSelectedPromotion = () => { },
    orders = [],
    setOrders = () => { },
    onPaymentSuccess = () => { },
    showToast = () => { },
    currentBranch = null,
}) => {
    const [showTransferQR, setShowTransferQR] = useState(false);
    const [showPayOSModal, setShowPayOSModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const handlePrepareOrder = async (orderId) => {
        try {
            console.log("📦 Preparing order #" + orderId);

            const response = await axiosClient.put(`/customer/orders/${orderId}/prepare`);
            const updatedOrderDTO = response.data;

            const currentOrder = orders.find(o => o.id === orderId);

            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id === orderId) {
                        return {
                            ...o,
                            // CONVERT STATUS (có thể là ENUM hoặc lowercase)
                            status: typeof updatedOrderDTO.status === 'string'
                                ? updatedOrderDTO.status.toLowerCase()
                                : 'preparing',

                            // CẬP NHẬT ITEMS NẾU CÓ
                            items: updatedOrderDTO.items?.map(item => ({
                                id: item.id || item.productId,
                                name: item.productName || item.name,
                                quantity: item.quantity,
                                price: item.price,
                                image: (item.productImageUrl || item.image)
                                    ? (item.productImageUrl || item.image).startsWith("http")
                                        ? (item.productImageUrl || item.image)
                                        : `http://localhost:8080/${item.productImageUrl || item.image}`
                                    : "/default.jpg",
                            })) || o.items,

                            total: updatedOrderDTO.totalAmount || o.total,
                            updatedAt: updatedOrderDTO.updatedAt || new Date().toISOString(),
                        };
                    }
                    return o;
                })
            );
            // PHÁT SOCKET CHO KHÁCH HÀNG
            socket.emit("order-status-changed", {
                orderId: orderId,
                tableNumber: currentOrder?.table,
                oldStatus: 'PENDING',
                newStatus: 'PREPARING',
                message: 'Đơn hàng của bạn đang được chuẩn bị'
            });
            console.log("Order prepared successfully:", orderId);
        } catch (err) {
            console.error("Lỗi khi chuẩn bị đơn:", err);
            console.error("Response:", err.response?.data);
            alert("Không thể cập nhật trạng thái đơn hàng!\n" +
                (err.response?.data?.error || err.message));
        }
    };

    // TÍNH LẠI GIÁ GỐC (chưa giảm) từ cart
    const originalTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);

    const handleCompleteOrder = async (orderId) => {
        try {
            console.log("Completing order #" + orderId);

            const response = await axiosClient.put(`/customer/orders/${orderId}/complete`);
            const updatedOrderDTO = response.data;

            const currentOrder = orders.find(o => o.id === orderId);

            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id === orderId) {
                        return {
                            ...o,
                            status: typeof updatedOrderDTO.status === 'string'
                                ? updatedOrderDTO.status.toLowerCase()
                                : 'completed',

                            items: updatedOrderDTO.items?.map(item => ({
                                id: item.id || item.productId,
                                name: item.productName || item.name,
                                quantity: item.quantity,
                                price: item.price,
                                image: (item.productImageUrl || item.image)
                                    ? (item.productImageUrl || item.image).startsWith("http")
                                        ? (item.productImageUrl || item.image)
                                        : `http://localhost:8080/${item.productImageUrl || item.image}`
                                    : "/default.jpg",
                            })) || o.items,

                            total: updatedOrderDTO.totalAmount || o.total,
                            updatedAt: updatedOrderDTO.updatedAt || new Date().toISOString(),
                        };
                    }
                    return o;
                })
            );
            // PHÁT SOCKET CHO KHÁCH HÀNG
            socket.emit("order-status-changed", {
                orderId: orderId,
                tableNumber: currentOrder?.table,
                oldStatus: 'PREPARING',
                newStatus: 'COMPLETED',
                message: 'Đơn hàng của bạn đã hoàn thành!'
            });
            console.log("Order completed successfully:", orderId);
        } catch (err) {
            console.error("Lỗi khi hoàn thành đơn:", err);
            console.error("Response:", err.response?.data);
            alert("Không thể cập nhật trạng thái đơn hàng!\n" +
                (err.response?.data?.error || err.message));
        }
    };

    const mapPaymentMethod = (method) => {
        const methodMap = {
            'cash': 'CASH',
            'transfer': 'TRANSFER',
            'card': 'CARD',
            'momo': 'MOBILE',
            'payos': 'MOBILE'
        };
        return methodMap[method.toLowerCase()] || 'CASH';
    };

    const handleCompletePayment = async (orderId, method) => {
        try {
            const backendMethod = mapPaymentMethod(method);
            console.log(`💳 Processing payment for order ${orderId}`);
            console.log(`📤 Frontend method: ${method} → Backend method: ${backendMethod}`);

            const currentOrder = orders.find(o => o.id === orderId);

            const response = await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${backendMethod}`
            );

            console.log("Payment response:", response.data);

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, status: "paid", paymentMethod: backendMethod } : o
                )
            );
            // PHÁT SOCKET CHO KHÁCH HÀNG
            socket.emit("order-status-changed", {
                orderId: orderId,
                tableNumber: currentOrder?.table,
                oldStatus: 'COMPLETED',
                newStatus: 'PAID',
                message: 'Đơn hàng đã được thanh toán. Cảm ơn quý khách!'
            });
            setShowTransferQR(false);
            setSelectedOrder(null);

            alert("Thanh toán thành công!");
            console.log("Payment completed for order:", orderId);
        } catch (err) {
            console.error("Lỗi khi thanh toán:", err);
            console.error("Error response:", err.response?.data);
            console.error("Status code:", err.response?.status);

            const errorMsg = err.response?.data || "Không thể cập nhật trạng thái thanh toán!";
            alert(`Lỗi: ${errorMsg}`);
        }
    };

    const printBill = (order) => {
        const originalTotal = order.items?.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
            0
        ) || 0;
        const branchName = currentBranch?.name || "CAFE SHOP";
        const branchAddress = currentBranch?.address || "123 Đường ABC, Quận XYZ, TP.HCM";
        const branchPhone = currentBranch?.phoneNumber || "0123 456 789";
        const billContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hóa đơn #${order.id}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Arial', sans-serif; 
                    padding: 40px;
                    background: white;
                }
                .bill-container {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 2px solid #333;
                    padding: 30px;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 20px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    font-size: 32px;
                    color: #8b4513;
                    margin-bottom: 5px;
                }
                .header p {
                    color: #666;
                    font-size: 14px;
                }
                .bill-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    padding: 15px;
                    background: #f9f9f9;
                    border-radius: 8px;
                }
                .bill-info div {
                    flex: 1;
                }
                .bill-info strong {
                    display: block;
                    color: #333;
                    margin-bottom: 5px;
                }
                .bill-info span {
                    color: #666;
                    font-size: 14px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                thead {
                    background: #8b4513;
                    color: white;
                }
                th, td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    font-weight: bold;
                    font-size: 14px;
                }
                td {
                    font-size: 14px;
                }
                .text-right {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .totals {
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 2px solid #333;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    font-size: 16px;
                }
                .total-row.grand-total {
                    font-size: 20px;
                    font-weight: bold;
                    color: #8b4513;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 2px solid #8b4513;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    padding-top: 20px;
                    border-top: 1px dashed #999;
                    color: #666;
                    font-size: 13px;
                }
                .payment-method {
                    display: inline-block;
                    padding: 5px 15px;
                    background: #8b4513;
                    color: white;
                    border-radius: 20px;
                    font-size: 12px;
                    margin-top: 10px;
                }
                @media print {
                    body { padding: 0; }
                    .bill-container { border: none; }
                }
            </style>
        </head>
        <body>
            <div class="bill-container">
                <div class="header">
                    <h1>☕ ${branchName}</h1>
                    <p>Địa chỉ: ${branchAddress}</p>
                    <p>Hotline: ${branchPhone}</p>
                </div>

                <div class="bill-info">
                    <div>
                        <strong>HÓA ĐƠN #${order.id}</strong>
                        <span>${order.date || new Date().toLocaleDateString('vi-VN')} - ${order.time || new Date().toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <div>
                        <strong>Khách hàng</strong>
                        <span>${(() => {
                if (typeof order.customer === "string") return order.customer;
                if (typeof order.customer === "object") return order.customer?.name || `Khách bàn ${order.table?.number || "?"}`;
                return `Khách bàn ${order.table?.number || "?"}`;
            })()}</span>
                    </div>
                    <div>
                        <strong>Bàn số</strong>
                        <span>${typeof order.table === "object" ? order.table.number : order.table || "?"}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Sản phẩm</th>
                            <th class="text-center">SL</th>
                            <th class="text-right">Đơn giá</th>
                            <th class="text-right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items?.map((item, idx) => `
                            <tr>
                                <td>${idx + 1}</td>
                                <td>${item.name}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">${(item.price || 0).toLocaleString('vi-VN')}đ</td>
                                <td class="text-right">${((item.price || 0) * (item.quantity || 0)).toLocaleString('vi-VN')}đ</td>
                            </tr>
                        `).join('') || '<tr><td colspan="5" class="text-center">Không có sản phẩm</td></tr>'}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">
                        <span>Tạm tính:</span>
                        <span>${originalTotal.toLocaleString('vi-VN')}đ</span>
                    </div>
                    ${order.discount ? `
                        <div class="total-row" style="color: #10b981;">
                            <span>Giảm giá${order.promotion?.name ? ` (${order.promotion.name})` : ''}:</span>
                            <span>-${(order.discount || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span>TỔNG CỘNG:</span>
                        <span>${(order.total || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                </div>

                <div class="footer">
                    <p>Cảm ơn quý khách! Hẹn gặp lại!</p>
                    <p style="margin-top: 5px; font-style: italic;">Powered by Cafe Management System</p>
                </div>
            </div>
        </body>
        </html>
    `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(billContent);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };

    const totalCups = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // --- Kiểm tra và áp dụng khuyến mãi tự động ---
    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                const res = await axiosClient.get("/promotions");
                const promotions = res.data || [];
                const today = new Date();

                // Lọc ra khuyến mãi còn hiệu lực
                const validPromos = promotions.filter(p => {
                    const startDate = p.startDate ? new Date(p.startDate) : null;
                    const endDate = p.endDate ? new Date(p.endDate) : null;
                    const isActive = p.isActive === 1 || p.isActive === true;
                    return (
                        isActive &&
                        (!startDate || startDate <= today) &&
                        (!endDate || endDate >= today)
                    );
                });

                // Áp dụng logic tự động theo số lượng ly
                let autoPromo = null;
                if (totalCups >= 6) {
                    autoPromo = validPromos.find(p => p.discountPercentage >= 25);
                } else if (totalCups >= 3) {
                    autoPromo = validPromos.find(p => p.discountPercentage >= 20);
                }

                if (autoPromo) {
                    setSelectedPromotion({ ...autoPromo, id: autoPromo.id.toString() });
                } else if (
                    selectedPromotion?.id &&
                    typeof selectedPromotion.id === "string" &&
                    selectedPromotion.id.startsWith("auto")
                ) {
                    setSelectedPromotion(null);
                }
            } catch (error) {
                console.error("Lỗi khi tải khuyến mãi:", error);
            }
        };

        fetchPromotions();
    }, [totalCups, selectedPromotion, setSelectedPromotion]);

    const discount = selectedPromotion?.discountPercentage
        ? (totalAmount * selectedPromotion.discountPercentage) / 100
        : selectedPromotion?.discountAmount || 0;

    const finalTotal = totalAmount - discount;

    return (
        <>
            <div className={styles.right}>
                <div className={styles.cartHeader}>
                    <button
                        className={`${styles.sideTab} ${!showOrderHistory ? styles.activeSideTab : ""}`}
                        onClick={() => setShowOrderHistory(false)}
                    >
                        🛒 Giỏ Hàng ({cart.length})
                    </button>
                    <button
                        className={`${styles.sideTab} ${showOrderHistory ? styles.activeSideTab : ""}`}
                        onClick={() => setShowOrderHistory(true)}
                    >
                        ⏱️ Đơn Hàng
                    </button>
                </div>

                {!showOrderHistory ? (
                    <>
                        <div className={styles.cartBody}>
                            <h2 className={styles.sectionTitle}>Đơn hàng hiện tại</h2>

                            <div className={styles.formGroup}>
                                <label>Tên khách</label>
                                <input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nhập tên khách (tùy chọn)"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Số bàn</label>
                                <div className={styles.tableSelect} onClick={() => setShowTableSelection(true)}>
                                    {selectedTable ? `Bàn ${selectedTable.number}` : "Chọn bàn..."}
                                </div>
                            </div>

                            {/* Promotion Selector */}
                            <div className={styles.formGroup}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Tag size={16} />
                                    Mã khuyến mãi{" "}
                                    {totalCups < 3 && (
                                        <span style={{ color: '#ef4444', fontSize: '12px' }}>
                                            (Cần tối thiểu 3 sản phẩm)
                                        </span>
                                    )}
                                </label>

                                <div
                                    className={styles.tableSelect}
                                    onClick={() => {
                                        if (totalCups >= 3) {
                                            setShowPromotionModal(true);
                                        } else {
                                            alert("⚠️ Bạn cần có ít nhất 3 sản phẩm trong giỏ hàng để sử dụng mã khuyến mãi!");
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: totalCups >= 3 ? 'pointer' : 'not-allowed',
                                        opacity: totalCups >= 3 ? 1 : 0.5
                                    }}
                                >
                                    {selectedPromotion ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Tag size={16} color="#10b981" />
                                            <span>{selectedPromotion.name}</span>
                                            {selectedPromotion.discountPercentage && (
                                                <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                    -{selectedPromotion.discountPercentage}%
                                                </span>
                                            )}
                                            {selectedPromotion.discountAmount && (
                                                <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                    -{selectedPromotion.discountAmount.toLocaleString('vi-VN')}đ
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#9ca3af' }}>Chọn mã giảm giá...</span>
                                    )}
                                </div>
                            </div>

                            {selectedPromotion && (
                                <div
                                    className={styles.promoInfo}
                                    style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        marginBottom: '12px'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Tag size={18} color="#10b981" />
                                            <div>
                                                <div
                                                    style={{
                                                        fontWeight: '600',
                                                        color: '#10b981',
                                                        fontSize: '14px'
                                                    }}
                                                >
                                                    {selectedPromotion.name}
                                                </div>

                                                <div
                                                    style={{
                                                        fontSize: '12px',
                                                        color: selectedPromotion.endDate &&
                                                            new Date(selectedPromotion.endDate) < new Date()
                                                            ? '#ef4444'
                                                            : '#6b7280',
                                                        marginTop: '2px'
                                                    }}
                                                >
                                                    {selectedPromotion.endDate ? (
                                                        new Date(selectedPromotion.endDate) < new Date()
                                                            ? `⚠️ Mã khuyến mãi đã hết hạn (${new Date(
                                                                selectedPromotion.endDate
                                                            ).toLocaleDateString('vi-VN')})`
                                                            : `Còn hạn đến ${new Date(
                                                                selectedPromotion.endDate
                                                            ).toLocaleDateString('vi-VN')}`
                                                    ) : (
                                                        selectedPromotion.description ||
                                                        'Đã áp dụng mã giảm giá'
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedPromotion(null)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#9ca3af',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className={styles.cartList}>
                                {cart.length === 0 ? (
                                    <p className={styles.emptyCart}>Chưa có sản phẩm nào trong giỏ hàng</p>
                                ) : (
                                    cart.map((item) => (
                                        <div
                                            key={item.id || `${item.name}-${Math.random()}`}
                                            className={styles.cartItem}
                                        >
                                            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    style={{
                                                        width: 72,
                                                        height: 72,
                                                        objectFit: "cover",
                                                        borderRadius: 8,
                                                        border: "1px solid #eee",
                                                    }}
                                                />
                                                <div>
                                                    <div className={styles.itemName}>{item.name}</div>
                                                    <div className={styles.itemPrice}>
                                                        {(item.price || 0).toLocaleString("vi-VN")}đ
                                                    </div>
                                                </div>
                                            </div>

                                            <div className={styles.itemControls}>
                                                <button
                                                    onClick={() => updateQuantity(item.id, -1)}
                                                    className={styles.qtyBtn}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className={styles.qty}>{item.quantity || 0}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, 1)}
                                                    className={styles.qtyBtn}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className={styles.trashBtn}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.cartFooter}>
                            {selectedPromotion && discount > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    color: '#6b7280'
                                }}>
                                    <span>Tạm tính:</span>
                                    <span>{originalTotal.toLocaleString("vi-VN")}đ</span>
                                </div>
                            )}
                            {selectedPromotion && discount > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                    fontSize: '14px',
                                    color: '#10b981',
                                    fontWeight: '600'
                                }}>
                                    <span>Giảm giá:</span>
                                    <span>-{discount.toLocaleString("vi-VN")}đ</span>
                                </div>
                            )}
                            <div className={styles.cartTotal}>
                                <span>Tổng cộng:</span>
                                <span>
                                    {(totalAmount || 0).toLocaleString("vi-VN")}đ
                                </span>
                            </div>
                            <button
                                className={styles.confirmBtn}
                                onClick={() =>
                                    placeOrder(finalTotal, discount, selectedPromotion)
                                }
                                disabled={cart.length === 0}
                            >
                                Xác Nhận Đơn Hàng
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.ordersPanel}>
                        <h3>Đơn hàng ({currentOrders.length})</h3>
                        {currentOrders.length === 0 ? (
                            <p className={styles.emptyOrder}>Chưa có đơn hàng nào</p>
                        ) : (
                            [...currentOrders]
                                .sort((a, b) => b.id - a.id)
                                .map((order) => (
                                    <div key={order.id || Math.random()} className={styles.orderCard}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <strong>
                                                {(() => {
                                                    if (typeof order.customer === "string") return order.customer;
                                                    if (typeof order.customer === "object")
                                                        return (
                                                            order.customer?.name ||
                                                            `Bàn ${order.customer?.number ?? order.table?.number ?? "?"}`
                                                        );
                                                    return `Khách bàn ${order.table?.number ?? "?"}`;
                                                })()}
                                            </strong>

                                            <div style={{ color: "#6b7280", fontSize: 13 }}>
                                                Bàn {typeof order.table === "object" ? order.table.number : order.table || "?"}
                                            </div>

                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ color: "#e5e7eb", fontWeight: 700 }}>
                                                    {(order.total || 0).toLocaleString("vi-VN")}đ
                                                </div>
                                                <div style={{ fontSize: 12, color: "#6b7280" }}>
                                                    {order.time || ""} - {order.date || ""}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: 8 }}>
                                            {order.items?.length > 0 ? (
                                                order.items.map((it, idx) => (
                                                    <div
                                                        key={`${order.id}-${it.id || idx}`}
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            fontSize: 14,
                                                            color: "#4b5563",
                                                        }}
                                                    >
                                                        <span>{it.name} x{it.quantity}</span>
                                                        <span>
                                                            {((it.price || 0) * (it.quantity || 0)).toLocaleString("vi-VN")}đ
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ fontSize: 13, color: "#9ca3af" }}>Không có sản phẩm</p>
                                            )}

                                            {/* Hiển thị discount nếu có */}
                                            {order.discount > 0 && (
                                                <div style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    fontSize: 13,
                                                    color: "#10b981",
                                                    marginTop: 8,
                                                    paddingTop: 8,
                                                    borderTop: "1px dashed #374151"
                                                }}>
                                                    <span>Giảm giá ({order.promotion?.name}):</span>
                                                    <span>-{order.discount.toLocaleString("vi-VN")}đ</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className={styles.orderActions}>
                                            {order.status === "pending" && (
                                                <button
                                                    onClick={() => handlePrepareOrder(order.id)}
                                                    className={styles.actionBtn}
                                                >
                                                    Chuẩn bị
                                                </button>
                                            )}
                                            {order.status === "preparing" && (
                                                <button
                                                    onClick={() => handleCompleteOrder(order.id)}
                                                    className={styles.actionBtnGreen}
                                                >
                                                    Hoàn thành
                                                </button>
                                            )}
                                            {order.status === "completed" && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setShowPaymentMethodModal(true);
                                                    }}
                                                    className={styles.actionBtnPay}
                                                >
                                                    Thanh toán
                                                </button>
                                            )}
                                            {order.status === "paid" && (
                                                <button
                                                    onClick={() => printBill(order)}
                                                    className={styles.actionBtnPrint}
                                                    style={{
                                                        background: "#8b4513",
                                                        color: "white",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "6px",
                                                        padding: "8px 16px",
                                                        borderRadius: "6px",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        fontSize: "14px",
                                                        fontWeight: "500",
                                                    }}
                                                >
                                                    <Printer size={16} />
                                                    In Bill
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                )}
            </div>

            {/* Promotion Selection Modal */}
            {showPromotionModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowPromotionModal(false)}
                >
                    <div
                        style={{
                            background: '#1f2937',
                            borderRadius: '16px',
                            padding: '24px',
                            width: '90%',
                            maxWidth: '500px',
                            maxHeight: '80vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#e5e7eb' }}>
                                Chọn mã khuyến mãi
                            </h3>
                            <button
                                onClick={() => setShowPromotionModal(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* No Promotion Option */}
                        <div
                            onClick={() => {
                                setSelectedPromotion(null);
                                setShowPromotionModal(false);
                            }}
                            style={{
                                padding: '16px',
                                background: !selectedPromotion ? 'rgba(59, 130, 246, 0.2)' : 'rgba(31, 41, 55, 0.5)',
                                border: !selectedPromotion ? '2px solid #3b82f6' : '1px solid #374151',
                                borderRadius: '12px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ color: '#e5e7eb', fontWeight: '600' }}>
                                Không sử dụng mã giảm giá
                            </div>
                        </div>

                        {/* Promotions List */}
                        {promotions.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#9ca3af'
                            }}>
                                <Tag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <p>Không có mã khuyến mãi nào</p>
                            </div>
                        ) : (
                            promotions.map((promo) => (
                                <div
                                    key={promo.id}
                                    onClick={() => {
                                        setSelectedPromotion(promo);
                                        setShowPromotionModal(false);
                                    }}
                                    style={{
                                        padding: '16px',
                                        background: selectedPromotion?.id === promo.id
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : 'rgba(31, 41, 55, 0.5)',
                                        border: selectedPromotion?.id === promo.id
                                            ? '2px solid #10b981'
                                            : '1px solid #374151',
                                        borderRadius: '12px',
                                        marginBottom: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedPromotion?.id !== promo.id) {
                                            e.currentTarget.style.borderColor = '#10b981';
                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedPromotion?.id !== promo.id) {
                                            e.currentTarget.style.borderColor = '#374151';
                                            e.currentTarget.style.background = 'rgba(31, 41, 55, 0.5)';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            background: 'rgba(16, 185, 129, 0.2)',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {promo.discountPercentage ? (
                                                <Percent size={20} color="#10b981" />
                                            ) : (
                                                <DollarSign size={20} color="#10b981" />
                                            )}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                color: '#e5e7eb',
                                                fontWeight: '600',
                                                fontSize: '16px',
                                                marginBottom: '4px'
                                            }}>
                                                {promo.name}
                                            </div>
                                            {promo.description && (
                                                <div style={{
                                                    color: '#9ca3af',
                                                    fontSize: '13px'
                                                }}>
                                                    {promo.description}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            textAlign: 'right',
                                            color: '#10b981',
                                            fontWeight: '700',
                                            fontSize: '18px'
                                        }}>
                                            {promo.discountPercentage && `-${promo.discountPercentage}%`}
                                            {promo.discountAmount && `-${promo.discountAmount.toLocaleString('vi-VN')}đ`}
                                        </div>
                                    </div>
                                    {(promo.startDate || promo.endDate) && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#6b7280',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            <Tag size={12} />
                                            <span>
                                                {promo.startDate && new Date(promo.startDate).toLocaleDateString('vi-VN')}
                                                {' - '}
                                                {promo.endDate && new Date(promo.endDate).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Payment Method Modal */}
            <PaymentMethodModal
                show={showPaymentMethodModal}
                onClose={() => {
                    setShowPaymentMethodModal(false);
                    setSelectedOrder(null);
                }}
                onSelect={(method) => {
                    console.log("💳 Selected payment method:", method);
                    setShowPaymentMethodModal(false);

                    if (method === "transfer") {
                        setShowPayOSModal(true);
                    } else if (method === "cash") {
                        payOrder(selectedOrder?.id);
                    } else if (method === "momo") {
                        setShowTransferQR(true);
                    } else if (method === "card") {
                        handleCompletePayment(selectedOrder?.id, "card");
                    }
                }}
            />

            {/* PayOS Payment Modal */}
            <TransferPaymentPayOs
                show={showPayOSModal}
                onClose={(paid) => {
                    console.log(" PayOS modal closed. Paid:", paid);
                    setShowPayOSModal(false);

                    if (paid && selectedOrder?.id) {
                        setOrders((prev) =>
                            prev.map((o) =>
                                o.id === selectedOrder.id
                                    ? { ...o, status: "paid", paymentMethod: "MOBILE" }
                                    : o
                            )
                        );

                        // HIỂN THỊ TOAST
                        showToast(
                            `Thanh toán PayOS thành công!\nĐơn #${selectedOrder.id} - ${selectedOrder.customer}`,
                            'success',
                            5000
                        );

                        setSelectedOrder(null);
                    } else {
                        setSelectedOrder(null);
                    }
                }}
                totalAmount={selectedOrder?.total || 0}
                orderId={selectedOrder?.id || ""}
            />

            {/* Old Transfer Modal (for backward compatibility) */}
            <TransferPaymentModal
                show={showTransferQR}
                onClose={(paid) => {
                    console.log(" Transfer modal closed. Paid:", paid);
                    setShowTransferQR(false);

                    if (paid && selectedOrder?.id) {
                        handleCompletePayment(selectedOrder.id, "transfer");
                    } else {
                        setSelectedOrder(null);
                    }
                }}
                totalAmount={selectedOrder?.total || 0}
                orderId={selectedOrder?.id || ""}
            />
        </>
    );
};

export default CartSection;