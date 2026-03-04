import React, { useState, useMemo, useEffect } from "react";
import styles from "./CafeCusSystem.module.css";
import TableSelectionModal from "./TableSelectionModal";
import axiosClient from "../../api/axiosClient";
import CustomerLayout from './../../layouts/CustomerLayout';
import io from 'socket.io-client';
import ToastNotification from "../employee/ToastNotification";

const socket = io('http://localhost:3001');

const CafeCusSystem = () => {
    const [activeTab, setActiveTab] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showTableSelection, setShowTableSelection] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);

    const [tables, setTables] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const newToast = { id, message, type, duration };
        setToasts(prev => [...prev, newToast]);

        // Phát âm thanh
        try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Cannot play sound:', err));
        } catch (err) {
            console.log('Audio not supported');
        }
    };
    const removeToast = (id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    // Kiểm tra token
    const checkToken = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            alert("Vui lòng đăng nhập để tiếp tục!");
            // Redirect to login page if needed
            // window.location.href = '/login';
            return false;
        }
        return true;
    };

    // Load danh sách bàn
    const fetchTables = async () => {
        if (!checkToken()) return;

        try {
            const res = await axiosClient.get("/customer/tables");
            setTables(
                res.data.map((t) => ({
                    id: t.id,
                    number: t.number,
                    branchId: t.branch?.id,
                    branchName: t.branch?.name,
                    status: t.status === "FREE" ? "available" : "occupied",
                }))
            );
        } catch (err) {
            console.error("❌ Lỗi khi tải danh sách bàn:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                // window.location.href = '/login';
            }
        }
    };

    // Load sản phẩm theo chi nhánh
    const fetchProductsByBranch = async (branchId) => {
        if (!checkToken()) return;

        try {
            // Sử dụng endpoint customer để lấy sản phẩm theo chi nhánh với khuyến mãi
            const res = await axiosClient.get(`/branch-products/branch/${branchId}/with-promotions`);
            const data = res.data || [];

            console.log("📦 Raw backend data:", data);

            // Chuyển đổi dữ liệu từ BranchProduct sang Product format
            const formattedProducts = data
                .filter(bp => bp.isActive !== false) // Chỉ lấy sản phẩm đang active
                .map(bp => {
                    // Log để debug structure
                    console.log("🔍 Processing item:", bp);

                    // Backend có thể trả về nhiều field giá khác nhau
                    // Ưu tiên: discountedPrice (có KM) > finalPrice > branchPrice > basePrice > price
                    const currentPrice = bp.discountedPrice || bp.finalPrice || bp.branchPrice || bp.basePrice || bp.price || bp.product?.price || 0;
                    const originalPrice = bp.branchPrice || bp.basePrice || bp.price || bp.product?.price || 0;

                    console.log("💰 Prices:", {
                        discountedPrice: bp.discountedPrice,
                        finalPrice: bp.finalPrice,
                        branchPrice: bp.branchPrice,
                        basePrice: bp.basePrice,
                        price: bp.price,
                        selected: currentPrice,
                        original: originalPrice
                    });

                    return {
                        id: bp.product?.id || bp.id,
                        name: bp.product?.name || bp.name,
                        price: currentPrice,
                        originalPrice: originalPrice,
                        imageUrl: bp.product?.imageUrl || bp.imageUrl,
                        category: bp.product?.category || bp.category,
                        categoryName: bp.categoryName || bp.product?.category?.name,
                        hasPromotion: bp.hasPromotion || false,
                        promotionName: bp.promotionName || null,
                        discountPercentage: bp.discountPercentage || 0
                    };
                });

            console.log("Formatted products:", formattedProducts);
            setProducts(formattedProducts);

            // Tạo danh mục từ sản phẩm (có thể dùng categoryName hoặc category.name)
            const cats = [
                "Tất cả sản phẩm",
                ...new Set(formattedProducts.map((p) => p.categoryName || p.category?.name).filter(Boolean)),
            ];
            setCategories(cats);
            setActiveTab("Tất cả sản phẩm");
        } catch (err) {
            console.error("Lỗi load sản phẩm theo chi nhánh:", err);
            console.error("Error details:", err.response?.data);
            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                // window.location.href = '/login';
            } else {
                alert("Không thể tải sản phẩm của chi nhánh này!");
            }
        }
    };

    // Load dữ liệu khi mount
    useEffect(() => {
        // Kiểm tra token trước khi load dữ liệu
        if (checkToken()) {
            fetchTables();
            socket.emit('register-role', 'customer');
        }

        // Đăng ký bàn khi khách chọn bàn
        if (selectedTable) {
            console.log("📋 Registering customer for table:", selectedTable);
            socket.emit('register-customer', selectedTable);
        }

        // Lắng nghe thông báo cập nhật trạng thái
        socket.on("order-status-notification", (data) => {
            console.log(" Nhận thông báo cập nhật đơn hàng:", data);

            // MAP STATUS SANG TIẾNG VIỆT
            const statusMessages = {
                'PENDING': 'Chờ xử lý',
                'PREPARING': 'Đang chuẩn bị',
                'COMPLETED': 'Hoàn thành',
                'PAID': 'Đã thanh toán',
                'CANCELED': 'Đã hủy'
            };

            const statusText = statusMessages[data.newStatus] || data.newStatus;

            // HIỂN THỊ TOAST
            showToast(
                ` Đơn hàng #${data.orderId}\n${data.message || `Trạng thái: ${statusText}`}`,
                data.newStatus === 'COMPLETED' ? 'success' :
                    data.newStatus === 'CANCELED' ? 'warning' : 'info',
                6000
            );
        });

        // Lắng nghe sự kiện cập nhật bàn
        socket.on("update-tables", fetchTables);

        // Dọn sạch khi unmount
        return () => {
            socket.off("order-status-notification");
            socket.off("update-tables", fetchTables);
        };
    }, [selectedTable]);

    // Load sản phẩm khi chọn bàn (theo chi nhánh của bàn)
    useEffect(() => {
        if (selectedTable && selectedTable.branchId) {
            console.log("🏪 Loading products for branch:", selectedTable.branchId);
            fetchProductsByBranch(selectedTable.branchId);
        }
    }, [selectedTable]);

    // Lọc sản phẩm theo danh mục và tìm kiếm
    const filteredProducts = useMemo(() => {
        return products
            .filter((p) =>
                activeTab === "Tất cả sản phẩm"
                    ? true
                    : (p.categoryName || p.category?.name) === activeTab
            )
            .filter((p) =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [products, activeTab, searchTerm]);

    // Xử lý khi chọn bàn
    const handleSelectTable = (tableData) => {
        console.log("Selected table:", tableData);
        setSelectedTable(tableData);
        setShowTableSelection(false);
    };

    // Đặt món - gửi đơn hàng
    const handleOrderProduct = async (product) => {
        if (!checkToken()) return;

        if (!selectedTable) {
            alert("Vui lòng chọn bàn trước!");
            setShowTableSelection(true);
            return;
        }

        try {
            const orderData = {
                customerName: `Khách bàn ${selectedTable.number}`,
                table: { id: selectedTable.id },
                branch: { id: selectedTable.branchId },
                items: [
                    {
                        product: { id: product.id },
                        quantity: 1,
                        price: product.price || 0
                    }
                ],
                status: "PENDING",
            };

            console.log("📤 Sending order data:", orderData);

            const res = await axiosClient.post("/customer/orders", orderData);
            const backendOrder = res.data;

            console.log("📥 Received backend order:", backendOrder);

            if (!backendOrder || !backendOrder.id) {
                console.error("Backend trả về order không có id:", backendOrder);
                alert("Lỗi: backend không trả về ID đơn hàng.");
                return;
            }

            // Tạo socket order từ dữ liệu backend trả về
            const socketOrder = {
                id: backendOrder.id,
                customerName: backendOrder.customerName || orderData.customerName,
                table: backendOrder.table || { number: selectedTable.number },
                items: backendOrder.items?.map((item) => ({
                    product: {
                        id: item.product?.id,
                        name: item.product?.name,
                        price: item.price,
                        imageUrl: item.product?.imageUrl?.startsWith("http")
                            ? item.product.imageUrl
                            : `http://localhost:8080/${item.product?.imageUrl || ''}`,
                    },
                    quantity: item.quantity,
                    price: item.price
                })) || [],
                totalAmount: backendOrder.totalAmount || 0,
                status: backendOrder.status || "PENDING",
            };

            console.log("📤 Gửi đơn hàng qua socket:", socketOrder);
            socket.emit("place-order", socketOrder);

            // Cập nhật danh sách bàn
            await fetchTables();
            socket.emit("update-tables");

            alert(`Đơn hàng đã được gửi thành công!\nSản phẩm: ${product.name}\nBàn: ${selectedTable.number}`);
        } catch (err) {
            console.error("❌ Lỗi khi gửi đơn hàng:", err);
            console.error("Error response:", err.response?.data);

            if (err.response?.status === 401 || err.response?.status === 403) {
                alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                // window.location.href = '/login';
            } else {
                alert("Không thể gửi đơn hàng. Vui lòng thử lại!");
            }
        }
    };

    // Đổi bàn
    const handleChangeTable = () => {
        setShowTableSelection(true);
    };

    return (
        <CustomerLayout>
            <div className={styles.wrapperFullWidth}>
                <div className={styles.leftFullWidth}>
                    <h1 className={styles.title}>Đặt món</h1>

                    {/* Button chọn bàn hoặc hiển thị bàn đã chọn */}
                    <div style={{ marginBottom: 16 }}>
                        {selectedTable ? (
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{
                                    padding: '10px 20px',
                                    background: '#D4AF37',
                                    color: '#121212',
                                    borderRadius: 8,
                                    fontWeight: 'bold',
                                    fontSize: 16
                                }}>
                                    🪑 Bàn {selectedTable.number} - {selectedTable.branchName || 'Chi nhánh'}
                                </div>
                                <button
                                    onClick={handleChangeTable}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'transparent',
                                        border: '2px solid #D4AF37',
                                        color: '#D4AF37',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: 14
                                    }}
                                >
                                    Đổi bàn
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowTableSelection(true)}
                                style={{
                                    padding: '12px 24px',
                                    background: '#D4AF37',
                                    border: 'none',
                                    color: '#121212',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: 16
                                }}
                            >
                                🪑 Chọn bàn
                            </button>
                        )}
                    </div>

                    {!selectedTable && (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            color: '#9ca3af',
                            fontSize: '18px'
                        }}>
                            👆 Vui lòng chọn bàn để xem menu
                        </div>
                    )}

                    {selectedTable && (
                        <>
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
                                        className={`${styles.tabBtn} ${activeTab === tab ? styles.activeTab : ""
                                            }`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <div className={styles.productGrid}>
                                {filteredProducts.length === 0 ? (
                                    <div style={{
                                        gridColumn: '1 / -1',
                                        textAlign: 'center',
                                        padding: '40px',
                                        color: '#9ca3af',
                                        fontSize: '16px'
                                    }}>
                                        Không tìm thấy sản phẩm nào
                                    </div>
                                ) : (
                                    filteredProducts.map((p) => (
                                        <div
                                            key={p.id}
                                            className={styles.productCard}
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
                                            {p.hasPromotion && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 8,
                                                    right: 8,
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                    fontWeight: 'bold'
                                                }}>
                                                    -{p.discountPercentage}%
                                                </div>
                                            )}
                                            <h3 className={styles.productName}>{p.name}</h3>
                                            <div className={styles.productFooter}>
                                                <div>
                                                    <p className={styles.productPrice}>
                                                        {Number(p.price).toLocaleString("vi-VN")}đ
                                                    </p>
                                                    {p.hasPromotion && (
                                                        <p style={{
                                                            fontSize: 12,
                                                            color: '#9ca3af',
                                                            textDecoration: 'line-through'
                                                        }}>
                                                            {Number(p.originalPrice).toLocaleString("vi-VN")}đ
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    className={styles.addToCartBtn}
                                                    onClick={() => handleOrderProduct(p)}
                                                >
                                                    Đặt món
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {showTableSelection && (
                    <TableSelectionModal
                        key={Date.now()}
                        show={showTableSelection}
                        tables={tables}
                        selectTable={handleSelectTable}
                        onClose={() => setShowTableSelection(false)}
                    />
                )}
            </div>

            {/* Toast Notifications Container */}
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

            {showTableSelection && (
                <TableSelectionModal
                    key={Date.now()}
                    show={showTableSelection}
                    tables={tables}
                    selectTable={handleSelectTable}
                    onClose={() => setShowTableSelection(false)}
                />
            )}
        </CustomerLayout>
    );
};

export default CafeCusSystem;