import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Users, Clock, CheckCircle, XCircle, Plus, Minus, Trash2, Printer } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import io from 'socket.io-client';
import styles from "./TableDetail.module.css";

const socket = io('http://localhost:3001');

const TableDetail = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const table = state?.table;
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

    const branchId = JSON.parse(localStorage.getItem('user') || '{}')?.branch?.id;
    const API_BASE_URL = 'http://localhost:8080';

    useEffect(() => {
        if (table) {
            fetchProducts();
            fetchPromotions();
            checkExistingOrder();
        }
    }, [table]);

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

                const cats = ["Tất cả", ...new Set(activeProducts.map(p => p.categoryName).filter(Boolean))];
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
            setPromotions(res.data || []);
        } catch (err) {
            console.error("Lỗi tải khuyến mãi:", err);
        }
    };

    const checkExistingOrder = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const existingOrder = res.data.find(o => o.table?.id === table.id && o.status !== "PAID");

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
                image: product.imageUrl
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

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleConfirmOrder = async () => {
        if (cart.length === 0) {
            alert("Vui lòng chọn món!");
            return;
        }

        try {
            const orderData = {
                customerName: customerName || `Khách bàn ${table.number}`,
                table: { id: table.id },
                branch: { id: branchId },
                items: cart.map(item => ({
                    product: { id: item.id },
                    quantity: item.quantity,
                    price: item.price
                })),
                status: "PENDING"
            };

            const res = await axiosClient.post("/customer/orders", orderData);
            const newOrder = res.data;

            setOrder(newOrder);
            socket.emit("new-order", newOrder);

            alert("Đơn hàng đã được gửi đến bếp!");

            // Cập nhật trạng thái bàn
            socket.emit("update-tables");

        } catch (err) {
            console.error("Lỗi tạo đơn:", err);
            alert("Không thể tạo đơn hàng!");
        }
    };

    const printBill = () => {
        const billContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Hóa đơn bàn ${table.number}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>HÓA ĐƠN BÀN ${table.number}</h2>
                <p>${new Date().toLocaleString('vi-VN')}</p>
            </div>
            <table>
                <thead>
                    <tr><th>Sản phẩm</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                </thead>
                <tbody>
                    ${cart.map(item => `
                        <tr>
                            <td>${item.name}</td>
                            <td>${item.quantity}</td>
                            <td class="text-right">${item.price.toLocaleString('vi-VN')}đ</td>
                            <td class="text-right">${(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total">
                Tổng cộng: ${totalAmount.toLocaleString('vi-VN')}đ
            </div>
            <p style="text-align: center; margin-top: 30px;">Cảm ơn quý khách!</p>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(billContent);
        printWindow.document.close();
        printWindow.print();
    };

    const filteredProducts = products.filter(p => {
        if (activeTab !== "Tất cả" && p.categoryName !== activeTab) return false;
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <div className={styles.tableInfo}>
                    <h1>Bàn {table.number}</h1>
                    <div className={`${table.status === "FREE" ? styles.available : styles.occupied}`}>
                        {table.status === "FREE" ? "🟢 Trống" : "🔴 Đã có khách"}
                    </div>
                </div>
                <div className={styles.stats}>
                    <div className={styles.statItem}>
                        <ShoppingCart size={18} />
                        <span>{totalItems} món</span>
                    </div>
                    <div className={styles.statItem}>
                        <Users size={18} />
                        <span>{table.capacity || 4} người</span>
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
                                <div className={styles.totalRow}>
                                    <span>Tổng cộng:</span>
                                    <span className={styles.totalAmount}>{totalAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <button className={styles.orderBtn} onClick={handleConfirmOrder}>
                                    Xác nhận đơn
                                </button>
                                {order && order.status === "COMPLETED" && (
                                    <button className={styles.printBtn} onClick={printBill}>
                                        <Printer size={18} /> In hóa đơn
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TableDetail;