import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Users, Clock, CheckCircle, XCircle, Plus, Minus, Trash2, Printer, Tag, X, Percent, DollarSign } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import PaymentMethodModal from "./PaymentMethodModal";
import TransferPaymentPayOs from "./TransferPaymentPayOs";
import ToastNotification from "./ToastNotification";
import styles from "./TableDetail.module.css";

const socket = io('http://localhost:3001');

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
    const [activeTab, setActiveTab] = useState("Tất cả sản phẩm");
    const [searchTerm, setSearchTerm] = useState("");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [customerName, setCustomerName] = useState("");
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [promotions, setPromotions] = useState([]);
    const [showPromotionModal, setShowPromotionModal] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [showPayOSModal, setShowPayOSModal] = useState(false);
    const [toasts, setToasts] = useState([]);

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const API_BASE_URL = 'http://localhost:8080';

    // Helper functions for toasts
    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Fetch products with promotions
    const fetchProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/branch-products/branch/${branchId}/with-promotions`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                const activeProducts = data.filter(p => p.isActive);
                setProducts(activeProducts);

                const cats = ["Tất cả sản phẩm", ...new Set(activeProducts.map(p => p.categoryName).filter(Boolean))];
                setCategories(cats);
            }
        } catch (err) {
            console.error("Lỗi tải sản phẩm:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPromotions = async () => {
        try {
            const res = await axiosClient.get("/promotions");
            const validPromos = (res.data || []).filter(p => {
                const today = new Date();
                const endDate = p.endDate ? new Date(p.endDate) : null;
                const isActive = p.isActive === 1 || p.isActive === true;
                return isActive && (!endDate || endDate >= today);
            });
            setPromotions(validPromos);
        } catch (err) {
            console.error("Lỗi tải khuyến mãi:", err);
        }
    };

    const checkExistingOrder = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const existingOrder = res.data.find(o => {
                if (isRoom) {
                    return o.room?.id === entity.id && o.status !== "PAID";
                }
                return o.table?.id === entity.id && o.status !== "PAID";
            });

            if (existingOrder) {
                setOrder(existingOrder);
                setCustomerName(existingOrder.customerName || "");

                const items = existingOrder.items.map(item => ({
                    id: item.product?.id,
                    name: item.product?.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.product?.imageUrl
                }));
                setCart(items);
            }
        } catch (err) {
            console.error("Lỗi kiểm tra đơn hàng:", err);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        const price = product.finalPrice || product.basePrice;

        if (existing) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, {
                id: product.id,
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

    // Calculate discount
    const discount = selectedPromotion?.discountPercentage
        ? (originalTotal * selectedPromotion.discountPercentage) / 100
        : selectedPromotion?.discountAmount || 0;

    const finalTotal = originalTotal - discount;

    const handleConfirmOrder = async () => {
        if (cart.length === 0) {
            alert("Vui lòng chọn món!");
            return;
        }

        try {
            const orderData = {
                customerName: customerName || `Khách ${entityType.toLowerCase()} ${entityNumber}`,
                ...(isRoom ? { room: { id: entity.id } } : { table: { id: entity.id } }),
                branch: { id: branchId },
                items: cart.map(item => ({
                    product: { id: item.id },
                    quantity: item.quantity,
                    price: item.price
                })),
                status: "PENDING",
                ...(selectedPromotion && { promotion: { id: selectedPromotion.id } })
            };

            const res = await axiosClient.post("/customer/orders", orderData);
            const newOrder = res.data;

            setOrder(newOrder);
            socket.emit("new-order", newOrder);
            socket.emit("update-tables");

            showToast(`Đơn hàng đã được gửi đến bếp!`, 'success', 4000);

        } catch (err) {
            console.error("Lỗi tạo đơn:", err);
            alert("Không thể tạo đơn hàng!");
        }
    };

    const handleCompletePayment = async (orderId, method) => {
        try {
            const backendMethod = method === 'cash' ? 'CASH' : 'MOBILE';

            await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${backendMethod}`
            );

            setOrder(prev => prev ? { ...prev, status: "PAID" } : null);
            setCart([]);

            socket.emit("update-tables");

            showToast(`Thanh toán thành công!`, 'success', 4000);

            setTimeout(() => {
                navigate(-1);
            }, 2000);
        } catch (err) {
            console.error("Lỗi thanh toán:", err);
            alert("Không thể thanh toán!");
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
            .filter(p => activeTab === "Tất cả sản phẩm" ? true : p.categoryName === activeTab)
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, activeTab, searchTerm]);

    useEffect(() => {
        if (entity) {
            fetchProducts();
            fetchPromotions();
            checkExistingOrder();
        }
    }, [entity]);

    // Auto-apply promotion based on quantity
    useEffect(() => {
        if (totalItems >= 6) {
            const autoPromo = promotions.find(p => p.discountPercentage >= 25);
            if (autoPromo && !selectedPromotion) {
                setSelectedPromotion(autoPromo);
                showToast(`Đã tự động áp dụng khuyến mãi ${autoPromo.name} (${autoPromo.discountPercentage}%)`, 'info', 3000);
            }
        } else if (totalItems >= 3) {
            const autoPromo = promotions.find(p => p.discountPercentage >= 20);
            if (autoPromo && !selectedPromotion) {
                setSelectedPromotion(autoPromo);
                showToast(`Đã tự động áp dụng khuyến mãi ${autoPromo.name} (${autoPromo.discountPercentage}%)`, 'info', 3000);
            }
        }
    }, [totalItems, promotions]);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.tableInfo}>
                    <h1>{entityType} {entityNumber}</h1>
                    <div className={`${entity?.status === "FREE" ? styles.available : styles.occupied}`}>
                        {entity?.status === "FREE" ? "🟢 Trống" : "🔴 Đã có khách"}
                    </div>
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

            {/* Customer Name Input */}
            <div className={styles.customerSection}>
                <input
                    type="text"
                    className={styles.customerInput}
                    placeholder="Tên khách hàng (tùy chọn)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                />
            </div>

            {/* Promotion Selector */}
            <div className={styles.promotionSection}>
                <div className={styles.formGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Tag size={16} />
                        Mã khuyến mãi
                        {totalItems < 3 && (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>
                                (Cần tối thiểu 3 sản phẩm)
                            </span>
                        )}
                    </label>

                    <div
                        className={styles.promotionSelect}
                        onClick={() => {
                            if (totalItems >= 3) {
                                setShowPromotionModal(true);
                            } else {
                                alert("⚠️ Bạn cần có ít nhất 3 sản phẩm để sử dụng mã khuyến mãi!");
                            }
                        }}
                        style={{
                            cursor: totalItems >= 3 ? 'pointer' : 'not-allowed',
                            opacity: totalItems >= 3 ? 1 : 0.5
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

            {/* Search & Categories */}
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

            {/* Products Grid & Cart */}
            <div className={styles.content}>
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
                                        {(product.finalPrice || product.basePrice || 0).toLocaleString('vi-VN')}đ
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Sidebar */}
                <div className={styles.cartSidebar}>
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

                                {order?.status !== "PAID" && (
                                    <button className={styles.orderBtn} onClick={handleConfirmOrder}>
                                        Xác nhận đơn
                                    </button>
                                )}

                                {(order?.status === "COMPLETED" || order?.status === "PAID") && (
                                    <button className={styles.printBtn} onClick={printBill}>
                                        <Printer size={18} /> In hóa đơn
                                    </button>
                                )}

                                {order?.status === "COMPLETED" && order?.status !== "PAID" && (
                                    <button
                                        className={styles.payBtn}
                                        onClick={() => setShowPaymentMethodModal(true)}
                                    >
                                        Thanh toán
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Promotion Modal */}
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

            {/* Payment Method Modal */}
            <PaymentMethodModal
                show={showPaymentMethodModal}
                onClose={() => setShowPaymentMethodModal(false)}
                onSelect={(method) => {
                    setShowPaymentMethodModal(false);
                    if (method === "transfer" || method === "momo") {
                        setShowPayOSModal(true);
                    } else if (method === "cash") {
                        handleCompletePayment(order?.id, "cash");
                    }
                }}
            />

            {/* PayOS Payment Modal */}
            <TransferPaymentPayOs
                show={showPayOSModal}
                onClose={(paid) => {
                    setShowPayOSModal(false);
                    if (paid && order?.id) {
                        handleCompletePayment(order.id, "transfer");
                    }
                }}
                totalAmount={finalTotal}
                orderId={order?.id || ""}
            />

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

export default TableDetail;