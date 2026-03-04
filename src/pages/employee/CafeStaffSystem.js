import React, { useState, useMemo, useEffect } from "react";
import styles from "./CafeStaffSystem.module.css";
import CartSection from "./CartSection";
import TableSelectionModal from "./TableSelectionModal";
import PaymentModal from "./PaymentModal";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import axiosClient from "../../api/axiosClient";
import io from 'socket.io-client';
import ToastNotification from './ToastNotification';

const socket = io('http://localhost:3001');

const CafeStaffSystem = () => {
    const [activeTab, setActiveTab] = useState("");
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [orders, setOrders] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [selectedTable, setSelectedTable] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [showOrderHistory, setShowOrderHistory] = useState(false);
    const [showTableSelection, setShowTableSelection] = useState(false);
    const [cashReceived, setCashReceived] = useState("");
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);

    const [currentBranch, setCurrentBranch] = useState(null);
    const [loadingBranch, setLoadingBranch] = useState(true);

    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [error, setError] = useState(null);

    const API_BASE_URL = 'http://localhost:8080';

    const fetchCurrentBranch = async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                setError('Vui lòng đăng nhập lại');
                setLoadingBranch(false);
                return;
            }

            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            let branchId = user?.branch?.id || user?.branchId;

            if (!branchId) {
                const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!userRes.ok) {
                    if (userRes.status === 401) {
                        setError('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
                        // Tự động chuyển về login sau 2 giây
                        setTimeout(() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            window.location.href = '/login';
                        }, 10000);
                    } else {
                        setError('Không thể lấy thông tin tài khoản');
                    }
                    setLoadingBranch(false);
                    return;
                }

                const userData = await userRes.json();
                branchId = userData.branch?.id;

                if (branchId) {
                    localStorage.setItem('user', JSON.stringify({
                        ...user,
                        branchId,
                        branch: userData.branch
                    }));
                }
            }

            if (!branchId) {
                alert('Tài khoản của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản trị viên.');
                setLoadingBranch(false);
                return;
            }

            const branchRes = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (branchRes.ok) {
                const branchData = await branchRes.json();
                setCurrentBranch(branchData);
            }

        } catch (error) {
            console.error('Lỗi khi lấy thông tin chi nhánh:', error);
            alert('Không thể lấy thông tin chi nhánh. Vui lòng thử lại.');
        } finally {
            setLoadingBranch(false);
        }
    };

    // Get initial from name
    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return null;

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        if (imageUrl.startsWith('/')) {
            return `${API_BASE_URL}${imageUrl}`;
        }

        return `${API_BASE_URL}/${imageUrl}`;
    };

    // Load danh sách bàn
    const fetchTables = async () => {
        try {
            const res = await axiosClient.get("/customer/tables");
            setTables(
                res.data.map((t) => ({
                    id: t.id,
                    number: t.number,
                    status: t.status === "FREE" ? "available" : "occupied",
                }))
            );
        } catch (err) {
            console.error("Lỗi khi tải danh sách bàn:", err);
        }
    };

    // Load sản phẩm và danh mục
    const fetchProducts = async () => {
        if (!currentBranch?.id) return;

        try {
            // ĐỔI ENDPOINT: Lấy products theo branch với promotions
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_BASE_URL}/api/branch-products/branch/${currentBranch.id}/with-promotions`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (!res.ok) {
                throw new Error('Không thể tải menu chi nhánh');
            }

            const data = await res.json();
            console.log('Products by branch:', data);

            // LỌC CHỈ LẤY SẢN PHẨM ĐANG ACTIVE
            const activeProducts = data.filter(p => p.isActive);
            setProducts(activeProducts);

            // TẠO DANH SÁCH CATEGORIES TỪ DATA
            const cats = [
                "Tất cả sản phẩm",
                ...new Set(activeProducts.map((p) => p.categoryName).filter(Boolean)),
            ];
            setCategories(cats);
            setActiveTab("Tất cả sản phẩm");
        } catch (err) {
            console.error("Lỗi load sản phẩm theo chi nhánh:", err);
        }
    };

    const fetchPromotions = async () => {
        try {
            const res = await axiosClient.get("/promotions");
            setPromotions(res.data || []);
        } catch (err) {
            console.error("Lỗi tải danh sách mã giảm giá:", err);
        }
    };

    // Load các đơn hàng chưa thanh toán
    const fetchUnpaidOrders = async () => {
        try {
            const res = await axiosClient.get("/customer/orders");
            const allOrders = res.data || [];

            const ordersData = allOrders
                .map(order => ({
                    id: order.id,
                    customer: order.customerName || `Khách bàn ${order.table?.number || "?"}`,
                    table: order.table?.number || "?",
                    items: order.items?.map(item => ({
                        id: item.product?.id,
                        name: item.product?.name,
                        // LẤY GIÁ TỪ ORDERITEM (giá tại thời điểm đặt)
                        price: item.price || 0,
                        quantity: item.quantity || 0,
                        image: item.product?.imageUrl
                            ? item.product.imageUrl.startsWith("http")
                                ? item.product.imageUrl
                                : `http://localhost:8080/${item.product.imageUrl}`
                            : "/default.jpg",
                    })) || [],
                    total: order.totalAmount || 0,
                    discount: order.discountAmount || 0,
                    promotion: order.promotion ? {
                        id: order.promotion.id,
                        name: order.promotion.name,
                        discountPercentage: order.promotion.discountPercentage,
                        discountAmount: order.promotion.discountAmount
                    } : null,
                    status: order.status ? order.status.toLowerCase() : "pending",
                    paymentMethod: order.paymentMethod || null,
                    time: new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    date: new Date(order.createdAt).toLocaleDateString("vi-VN"),
                }))
                .sort((a, b) => b.id - a.id);

            setOrders(ordersData);
            console.log(`Đã tải ${ordersData.length} đơn hàng`);
        } catch (err) {
            console.error("Lỗi khi tải đơn hàng:", err);
        }
    };

    // Hàm thêm toast notification
    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const newToast = { id, message, type, duration };

        setToasts(prev => [...prev, newToast]);

        // Tự động phát âm thanh thông báo
        try {
            const audio = new Audio('/notification-sound.mp3'); // Hoặc dùng base64 sound
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Cannot play sound:', err));
        } catch (err) {
            console.log('Audio not supported');
        }
    };

    // Hàm xóa toast
    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    useEffect(() => {
        const initializeData = async () => {
            await fetchCurrentBranch();
            await fetchTables();
            await fetchPromotions();
            await fetchUnpaidOrders();
            console.log("Đã load xong tất cả dữ liệu ban đầu");
        };
        const handleMessage = (event) => {
            if (event.data.type === 'PAYMENT_SUCCESS') {
                console.log("Nhận thông báo thanh toán thành công");

                // Reload lại danh sách đơn hàng
                fetchUnpaidOrders();

                // Reload lại danh sách bàn
                fetchTables();

                // Emit socket để đồng bộ với các client khác
                if (event.data.shouldUpdateTables) {
                    socket.emit("update-tables");
                }

                // Hiển thị toast
                showToast(
                    `Thanh toán thành công!\nĐơn #${event.data.orderId}`,
                    'success',
                    5000
                );
            } else if (event.data.type === 'PAYMENT_ERROR') {
                showToast(
                    event.data.message,
                    'warning',
                    5000
                );
            }
        };
        initializeData();
        socket.emit("register-role", "employee");
        window.addEventListener('message', handleMessage);

        socket.on("update-tables", () => {
            console.log("🔄 Nhận tín hiệu cập nhật bàn từ server");
            fetchTables();
        });

        socket.on("order-for-staff", (orderData) => {
            console.log("📦 Nhận đơn hàng từ khách:", orderData);

            // BACKEND ĐÃ GỘP ĐƠN RỒI -> CHỈ CẬP NHẬT LẠI STATE
            const itemsArray = orderData.items || orderData.orderItems || [];

            const formattedItems = itemsArray.map((it) => ({
                id: it.product?.id,
                name: it.product?.name,
                quantity: it.quantity, // Lấy số lượng CHÍNH XÁC từ backend
                price: it.price || 0,
                image: it.product?.imageUrl
                    ? it.product.imageUrl.startsWith("http")
                        ? it.product.imageUrl
                        : `http://localhost:8080/${it.product.imageUrl}`
                    : "/default.jpg",
            }));
            // TÍNH TỔNG TIỀN TỪ ITEMS NẾU BACKEND KHÔNG TRẢ VỀ
            const calculatedTotal = orderData.totalAmount ||
                formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            setOrders((prev) => {
                // TÌM ĐƠN THEO ID (vì backend đã gộp rồi)
                const existingOrderIndex = prev.findIndex((o) => o.id === orderData.id);

                if (existingOrderIndex !== -1) {
                    // ĐƠN ĐÃ TỒN TẠI -> CẬP NHẬT THÔNG TIN TỪ BACKEND
                    console.log(`🔄 Cập nhật đơn #${orderData.id} từ backend`);

                    const oldStatus = prev[existingOrderIndex].status;
                    const newStatus = (orderData.status || "PENDING").toLowerCase();

                    const updatedOrder = {
                        ...prev[existingOrderIndex],
                        items: formattedItems, // Dùng data từ backend
                        total: calculatedTotal,
                        discount: orderData.discountAmount || 0,
                        promotion: orderData.promotion || null,
                        status: (orderData.status || "PENDING").toLowerCase(),
                        time: new Date().toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                    };

                    const updatedOrders = [...prev];
                    updatedOrders[existingOrderIndex] = updatedOrder;

                    // HIỂN THỊ TOAST NOTIFICATION
                    if (oldStatus === "completed" && newStatus === "preparing") {
                        showToast(
                            `🔄 Khách bàn ${orderData.table?.number || "?"} gọi thêm món!`,
                            'warning',
                            6000
                        );
                    } else {
                        showToast(
                            `🔄 Đơn #${orderData.id} (Bàn ${orderData.table?.number}) đã được cập nhật!`,
                            'info',
                            4000
                        );
                    }
                    return updatedOrders;
                } else {
                    // ĐƠN MỚI -> THÊM VÀO DANH SÁCH
                    console.log(`Tạo đơn mới #${orderData.id} cho bàn ${orderData.table?.number}`);

                    const formattedOrder = {
                        id: orderData.id,
                        customer:
                            orderData.customerName ||
                            orderData.customer?.name ||
                            `Khách bàn ${orderData.table?.number || "?"}`,
                        table: orderData.table?.number || "?",
                        items: formattedItems,
                        total: calculatedTotal,
                        discount: orderData.discountAmount || 0,
                        promotion: orderData.promotion || null,
                        status: (orderData.status || "PENDING").toLowerCase(),
                        time: new Date().toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                        }),
                        date: new Date().toLocaleDateString("vi-VN"),
                    };

                    showToast(
                        `🧾 Đơn mới #${formattedOrder.id}\nTừ ${formattedOrder.customer} - Bàn ${formattedOrder.table}`,
                        'success',
                        6000
                    );
                    return [formattedOrder, ...prev];
                }
            });
        });

        socket.on("update-order-status", (updatedOrder) => {
            console.log("🔄 Cập nhật trạng thái đơn:", updatedOrder);

            setOrders((prev) =>
                prev.map((o) => {
                    if (o.id === updatedOrder.id) {
                        return {
                            ...o,
                            status: updatedOrder.status.toLowerCase(),
                            total: updatedOrder.totalAmount || o.total,
                            items: updatedOrder.items?.map(item => ({
                                id: item.product?.id,
                                name: item.product?.name,
                                quantity: item.quantity,
                                price: item.price,
                                image: item.product?.imageUrl
                                    ? item.product.imageUrl.startsWith("http")
                                        ? item.product.imageUrl
                                        : `http://localhost:8080/${item.product.imageUrl}`
                                    : "/default.jpg",
                            })) || o.items,
                        };
                    }
                    return o;
                })
            );
        });

        return () => {
            window.removeEventListener('message', handleMessage);
            socket.off("order-for-staff");
            socket.off("update-order-status");
            socket.off("update-tables");
        };
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchProducts();
        }
    }, [currentBranch]);

    const filteredProducts = useMemo(() => {
        return products
            .filter((p) =>
                activeTab === "Tất cả sản phẩm"
                    ? true
                    : p.categoryName === activeTab
            )
            .filter((p) =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [products, activeTab, searchTerm]);

    const totalAmount = useMemo(() => {
        let sum = cart.reduce((s, it) => s + it.price * (it.quantity || 1), 0);
        if (selectedPromotion) {
            if (selectedPromotion.discountPercentage) {
                sum -= sum * (selectedPromotion.discountPercentage / 100);
            } else if (selectedPromotion.discountAmount) {
                sum -= selectedPromotion.discountAmount;
            }
        }
        return sum < 0 ? 0 : sum;
    }, [cart, selectedPromotion]);

    const addToCart = (product) => {
        const existing = cart.find((i) => i.id === product.id);

        const price = product.finalPrice;

        const imageUrl = product.imageUrl
            ? product.imageUrl.startsWith("http")
                ? product.imageUrl
                : `http://localhost:8080/${product.imageUrl}`
            : "/default.jpg";

        if (existing) {
            setCart(
                cart.map((i) =>
                    i.id === product.id
                        ? { ...i, quantity: (i.quantity || 1) + 1 }
                        : i
                )
            );
        } else {
            setCart([...cart, { ...product, price: price, image: imageUrl, quantity: 1 }]);
        }
    };

    const updateQuantity = (id, delta) => {
        setCart(
            cart
                .map((item) => {
                    if (item.id === id) {
                        const newQ = (item.quantity || 1) + delta;
                        return newQ > 0 ? { ...item, quantity: newQ } : null;
                    }
                    return item;
                })
                .filter(Boolean)
        );
    };

    const removeFromCart = (id) => setCart(cart.filter((i) => i.id !== id));

    const selectTable = (tableData) => {
        setSelectedTable(tableData);
        setShowTableSelection(false);
    };

    const confirmOrder = async (finalTotal, discount = 0, promotion = null) => {
        if (cart.length === 0) {
            alert("Giỏ hàng trống!");
            return;
        }
        if (!selectedTable) {
            alert("Vui lòng chọn bàn!");
            return;
        }

        try {
            const tableId = selectedTable?.id || selectedTable;
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const orderData = {
                customerName: customerName || "Khách lẻ",
                table: { id: tableId },
                branch: currentBranch ? { id: currentBranch.id } : null,
                items: cart.map((item) => ({
                    product: { id: item.id },
                    quantity: item.quantity,
                    price: item.price
                })),
                status: "PENDING",
                ...(promotion && { promotion: { id: promotion.id } })
            };
            console.log('📤 Sending order data:', JSON.stringify(orderData, null, 2));

            const res = await axiosClient.post("/customer/orders", orderData);
            const backendOrder = res.data;

            console.log('Backend response:', backendOrder);

            if (!backendOrder || !backendOrder.id) {
                alert("Lỗi: backend không trả về ID đơn hàng.");
                return;
            }

            const localOrder = {
                id: backendOrder.id,
                customer: backendOrder.customerName || customerName || `Khách bàn ${backendOrder.table?.number || selectedTable}`,
                table: backendOrder.table?.number || selectedTable?.number || selectedTable || "?",
                items: backendOrder.items?.map((item) => ({
                    id: item.product?.id,
                    name: item.product?.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.product?.imageUrl
                        ? item.product.imageUrl.startsWith("http")
                            ? item.product.imageUrl
                            : `http://localhost:8080/${item.product.imageUrl}`
                        : "/default.jpg",
                })) || [],
                total: backendOrder.totalAmount || finalTotal ||
                    backendOrder.items?.reduce((sum, item) =>
                        sum + (item.price * item.quantity), 0) || 0,
                discount: discount || 0,
                promotion: promotion ? {
                    id: promotion.id,
                    name: promotion.name,
                    discountPercentage: promotion.discountPercentage,
                    discountAmount: promotion.discountAmount
                } : null,
                status: backendOrder.status ? backendOrder.status.toLowerCase() : "pending",
                time: new Date().toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
                date: new Date().toLocaleDateString("vi-VN"),
            };

            setOrders((prev) => [localOrder, ...prev]);
            setTables((prev) =>
                prev.map((t) =>
                    t.id === tableId || t.number === selectedTable
                        ? { ...t, status: "occupied", orderId: backendOrder.id }
                        : t
                )
            );

            setCart([]);
            setCustomerName("");
            setSelectedTable(null);
            setSelectedPromotion(null);

            await fetchTables();
            socket.emit("update-tables");

            alert("Đơn hàng đã được tạo thành công!");
        } catch (err) {
            console.error("Lỗi khi tạo đơn hàng:", err);
            console.error("Response data:", err.response?.data);
            console.error("Response status:", err.response?.status);

            if (err.response?.data?.message) {
                alert(`Lỗi: ${err.response.data.message}`);
            } else if (err.response?.data) {
                alert(`Lỗi: ${JSON.stringify(err.response.data)}`);
            } else {
                alert("Không thể tạo đơn hàng. Vui lòng thử lại!");
            }
        }
    };

    const prepareOrder = async (orderId) => {
        try {
            await axiosClient.put(`/customer/orders/${orderId}/status`, null, {
                params: { status: "PREPARING" }
            });

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, status: "preparing" } : o
                )
            );
        } catch (err) {
            console.error("Lỗi khi cập nhật trạng thái:", err);
            alert("Không thể cập nhật trạng thái đơn hàng!");
        }
    };

    const completeOrder = async (orderId) => {
        try {
            await axiosClient.put(`/customer/orders/${orderId}/status`, null, {
                params: { status: "COMPLETED" }
            });

            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId ? { ...o, status: "completed" } : o
                )
            );
        } catch (err) {
            console.error("Lỗi khi hoàn thành đơn:", err);
            alert("Không thể hoàn thành đơn hàng!");
        }
    };

    const payOrder = (orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;

        setSelectedOrderForPayment(order);
        setShowPaymentModal(true);
        setCashReceived("");
    };

    const completePayment = async (orderId, method = "CASH") => {
        try {
            console.log("💳 Processing payment for order #" + orderId);
            console.log("💳 Payment method:", method);

            const response = await axiosClient.put(
                `/customer/orders/${orderId}/pay?paymentMethod=${method.toUpperCase()}`
            );

            console.log("Payment response:", response.data);

            // CẬP NHẬT STATE
            setOrders((prev) =>
                prev.map((o) =>
                    o.id === orderId
                        ? { ...o, status: "paid", paymentMethod: method.toUpperCase() }
                        : o
                )
            );

            // GIẢI PHÓNG BÀN
            setTables((prev) =>
                prev.map((t) =>
                    t.orderId === orderId
                        ? { ...t, status: "available", orderId: null }
                        : t
                )
            );

            // ĐÓNG MODAL
            setShowPaymentModal(false);
            setSelectedOrderForPayment(null);
            setCashReceived("");

            // CẬP NHẬT BẢNG
            await fetchTables();
            socket.emit("update-tables");

            alert("Thanh toán thành công!");

        } catch (err) {
            console.error("Lỗi khi thanh toán:", err);
            console.error("Response:", err.response?.data);
            console.error("Status:", err.response?.status);

            const errorMsg = err.response?.data?.error
                || err.response?.data?.message
                || "Không thể cập nhật trạng thái thanh toán!";

            alert(`Lỗi thanh toán:\n${errorMsg}`);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    };

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (loadingBranch || !currentBranch) {
        return (
            <EmployeeLayout>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #e5e7eb',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ fontSize: '16px', color: '#6b7280' }}>
                        Đang tải thông tin chi nhánh...
                    </p>
                </div>
            </EmployeeLayout>
        );
    }

    return (
        <EmployeeLayout>
            <div className={styles.wrapper}>
                <div className={styles.left}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        padding: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div>
                            <h1 className={styles.title} style={{ margin: 0 }}>
                                {currentBranch.name}
                            </h1>
                            {currentBranch.address && (
                                <p style={{
                                    fontSize: '14px',
                                    color: '#9ca3af',
                                    margin: '4px 0 0 0'
                                }}>
                                    📍 {currentBranch.address}
                                </p>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            {/* User Info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 16px',
                                borderRadius: '8px'
                            }}>
                                {user.imageUrl ? (
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                        }}
                                    >
                                        <img
                                            src={getImageUrl(user.imageUrl)}
                                            alt={user.fullName || user.username}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                            onError={(e) => {
                                                console.error('Image load error:', user.imageUrl);
                                                const parent = e.target.parentElement;
                                                e.target.style.display = 'none';

                                                const span = document.createElement('span');
                                                span.style.fontWeight = '700';
                                                span.style.fontSize = '14px';
                                                span.style.color = '#000';
                                                span.textContent = getInitials(user.fullName || user.username);
                                                parent.appendChild(span);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            flexShrink: 0,
                                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: '700',
                                                fontSize: '14px',
                                                color: '#000'
                                            }}
                                        >
                                            {getInitials(user.fullName || user.username)}
                                        </span>
                                    </div>
                                )}
                                <span style={{
                                    color: '#e5e7eb',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}>
                                    {user.fullName || user.username || 'Nhân viên'}
                                </span>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 16px',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#dc2626';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(239, 68, 68, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    </div>

                    <div className={styles.searchWrap}>
                        <input
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm kiếm sản phẩm..."
                        />
                    </div>

                    <div className={styles.tabs}>
                        {categories.map((tab) => (
                            <button
                                key={tab}
                                className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ""}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className={styles.productGrid}>
                        {filteredProducts.map((p) => (
                            <div
                                key={p.id}
                                className={styles.productCard}
                                onClick={() => addToCart(p)}
                            >
                                <img
                                    src={
                                        p.imageUrl
                                            ? p.imageUrl.startsWith("http")
                                                ? p.imageUrl
                                                : `http://localhost:8080/${p.imageUrl}`
                                            : "/default.jpg"
                                    }
                                    alt={p.name}
                                    className={styles.productImg}
                                />
                                <h3 className={styles.productName}>{p.name}</h3>
                                <p className={styles.productPrice}>
                                    {Number(p.finalPrice || p.basePrice || 0).toLocaleString("vi-VN")}đ
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <CartSection
                    cart={cart}
                    setCart={setCart}
                    selectedTable={selectedTable}
                    setShowTableSelection={setShowTableSelection}
                    setSelectedTable={selectTable}
                    placeOrder={confirmOrder}
                    currentOrders={orders}
                    prepareOrder={prepareOrder}
                    completeOrder={completeOrder}
                    payOrder={payOrder}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    totalAmount={totalAmount}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    showOrderHistory={showOrderHistory}
                    setShowOrderHistory={setShowOrderHistory}
                    promotions={promotions}
                    selectedPromotion={selectedPromotion}
                    setSelectedPromotion={setSelectedPromotion}
                    showToast={showToast}
                    orders={orders}
                    setOrders={setOrders}
                    currentBranch={currentBranch}
                />

                {showTableSelection && (
                    <TableSelectionModal
                        show={showTableSelection}
                        branchId={currentBranch?.id}
                        selectTable={selectTable}
                        onClose={() => setShowTableSelection(false)}
                    />
                )}

                {showPaymentModal && selectedOrderForPayment && (
                    <PaymentModal
                        show={showPaymentModal}
                        selectedOrder={selectedOrderForPayment}
                        cashReceived={cashReceived}
                        setCashReceived={setCashReceived}
                        calculateChange={() => {
                            if (!selectedOrderForPayment || !cashReceived) return 0;
                            const change =
                                parseFloat(cashReceived) -
                                selectedOrderForPayment.total;
                            return change > 0 ? change : 0;
                        }}
                        completePayment={completePayment}
                        onClose={() => setShowPaymentModal(false)}
                    />
                )}
            </div>
            {/* TOAST NOTIFICATIONS CONTAINER */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                zIndex: 9999,
                pointerEvents: 'none'
            }}>
                {toasts.map((toast, index) => (
                    <div
                        key={toast.id}
                        style={{
                            marginTop: index > 0 ? '10px' : '0',
                            pointerEvents: 'auto'
                        }}
                    >
                        <ToastNotification
                            message={toast.message}
                            type={toast.type}
                            duration={toast.duration}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
        </EmployeeLayout>
    );
};

export default CafeStaffSystem;