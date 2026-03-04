import React, { useState, useEffect } from 'react';
import { BarChart3, Users, ShoppingBag, Tag, LogOut, ChevronLeft, ChevronRight, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';

// Pages
import Dashboard from '../pages/manage/Dashboard';
import Products from '../pages/manage/Products';
import Promotions from '../pages/manage/Promotions';
import Employees from '../pages/manage/Employees';
import Reports from '../pages/manage/Reports';
import ManagerOrderManagement from '../pages/manage/ManagerOrder';

// Modal Forms
import AddProductForm from '../pages/manage/forms/AddProductForm';
import EditProductForm from '../pages/manage/forms/EditProductForm';
import AddPromotionForm from '../pages/manage/forms/AddPromotionForm';
import EditPromotionForm from '../pages/manage/forms/EditPromotionForm';
import AddEmployeeForm from '../pages/manage/forms/AddEmployeeForm';
import EditEmployeeForm from '../pages/manage/forms/EditEmployeeForm';
import AddCategoryForm from '../pages/manage/forms/AddCategoryForm';
import EditCategoryForm from '../pages/manage/forms/EditCategoryForm';
import ManagerTableManagement from '../pages/manage/ManagerTable';
import ManagerInventoryManagement from '../pages/manage/ManagerInventory';
import BranchReservationManager from '../pages/manage/BranchReservation';

export default function ManagerLayout() {
    const navigate = useNavigate();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);

    // Kiểm tra login
    useEffect(() => {
        const loggedUser = JSON.parse(localStorage.getItem('user'));
        if (!loggedUser) {
            navigate('/login');
        } else {
            setUser(loggedUser);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        navigate('/login');
    };

    // Data tạm thời
    const [products, setProducts] = useState([]);
    const [promotions, setPromotions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [categories, setCategories] = useState([]);

    // Modal state
    const [modalType, setModalType] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [refreshCallback, setRefreshCallback] = useState(null);

    // State để trigger refresh
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'products', label: 'Quản lý Sản phẩm', icon: ShoppingBag },
        { id: 'manageroders', label: 'Quản lý Đơn hàng', icon: ShoppingBag },
        { id: 'managerables', label: 'Quản lý Bàn', icon: Table },
        { id: 'ManagerInventory', label: 'Quản lý Kho', icon: ShoppingBag },
        { id: 'promotions', label: 'Quản lý Khuyến mãi', icon: Tag },
        { id: 'employees', label: 'Quản lý Nhân viên', icon: Users },
        { id: 'branchreservation', label: 'Đặt bàn Chi nhánh', icon: Table },
        { id: 'reports', label: 'Báo cáo Tổng quan', icon: BarChart3 },
    ];

    // Modal handlers
    const openAddModal = (type) => { setModalType(`add${type}`); setSelectedItem(null); };

    // Sửa lại openEditModal để nhận thêm refreshCallback
    const openEditModal = (type, item, refreshFn) => {
        setModalType(`edit${type}`);
        setSelectedItem(item);
        setRefreshCallback(() => refreshFn); // Lưu callback
    };

    const closeModal = () => {
        setModalType('');
        setSelectedItem(null);
        setRefreshCallback(null);
    };

    const handleSave = (item, type) => {
        console.log('💾 handleSave called:', type, item);

        switch (type) {
            case 'product':
                modalType.startsWith('add') ? setProducts([...products, { ...item, id: Date.now(), status: 'Còn hàng' }])
                    : setProducts(products.map(p => (p.id === item.id ? item : p)));
                break;
            case 'promotion':
                modalType.startsWith('add') ? setPromotions([...promotions, { ...item, id: Date.now(), status: 'Hoạt động' }])
                    : setPromotions(promotions.map(p => (p.id === item.id ? item : p)));
                break;
            case 'employee':
                modalType.startsWith('add') ? setEmployees([...employees, { ...item, id: Date.now(), status: 'Hoạt động' }])
                    : setEmployees(employees.map(e => (e.id === item.id ? item : e)));
                break;
            case 'category':
                modalType.startsWith('add') ? setCategories([...categories, { ...item, id: Date.now() }])
                    : setCategories(categories.map(c => (c.id === item.id ? item : c)));
                break;
            default: break;
        }

        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
        closeModal();
    };

    // Render page content
    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <Dashboard />;
            case 'products':
                return <Products
                    products={products}
                    openAdd={() => openAddModal('Product')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'manageroders':
                return <ManagerOrderManagement />;

            case 'managerables':
                return <ManagerTableManagement />;

            case 'ManagerInventory':
                return <ManagerInventoryManagement
                    products={products}
                    refreshTrigger={refreshTrigger}
                />;
            case 'promotions':
                return <Promotions
                    promotions={promotions}
                    openAdd={() => openAddModal('Promotion')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'employees':
                return <Employees
                    employees={employees}
                    openAdd={() => openAddModal('Employee')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'branchreservation':
                return <BranchReservationManager />;
            case 'reports': return <Reports />;
            default: return null;
        }
    };

    const renderModal = () => {
        switch (modalType) {
            case 'addProduct':
                return <AddProductForm
                    closeForm={closeModal}
                    onSave={handleSave}
                />;
            case 'editProduct':
                return <EditProductForm
                    product={selectedItem}
                    closeForm={closeModal}
                    onSave={handleSave}
                    refreshCallback={refreshCallback} // Truyền callback
                />;
            case 'addCategory':
                return <AddCategoryForm
                    onClose={closeModal}
                    onSuccess={handleSave}
                />;
            case 'editCategory':
                return <EditCategoryForm
                    category={selectedItem}
                    onClose={closeModal}
                    onSuccess={handleSave}
                    refreshCallback={refreshCallback} // Truyền callback
                />;
            case 'addPromotion':
                return <AddPromotionForm
                    closeForm={closeModal}
                    onSave={handleSave}
                />;
            case 'editPromotion':
                return <EditPromotionForm
                    promotion={selectedItem}
                    closeForm={closeModal}
                    onSave={handleSave}
                    refreshCallback={refreshCallback} // Truyền callback
                />;
            case 'addEmployee':
                return <AddEmployeeForm
                    closeForm={closeModal}
                    onSave={handleSave}
                />;
            case 'editEmployee':
                return <EditEmployeeForm
                    employee={selectedItem}
                    closeForm={closeModal}
                    onSave={handleSave}
                    refreshCallback={refreshCallback} // Truyền callback
                />;
            default: return null;
        }
    };

    return (
        <div className={styles.wrapper}>
            {/* Sidebar */}
            <div className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
                <div className={styles['sidebar-header']}>
                    {sidebarOpen && (
                        <div className={styles['brand-container']}>
                            <div className={styles['brand-icon']}>M</div>
                            <h1 className={styles['brand-title']}>Management Panel</h1>
                        </div>
                    )}
                    {!sidebarOpen && (
                        <div className={styles['brand-icon-collapsed']}>M</div>
                    )}
                </div>

                <nav className={styles['sidebar-nav']}>
                    {menuItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                className={`${styles['nav-button']} ${activeMenu === item.id ? styles.active : ''}`}
                                onClick={() => setActiveMenu(item.id)}
                            >
                                <Icon size={20} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <button
                    className={styles['toggle-button']}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </button>
            </div>

            {/* Main content */}
            <div className={styles.main}>
                {/* Topbar */}
                <div className={styles.topbar}>
                    <div className={styles['topbar-left']}>
                        <h2 className={styles['page-title']}>
                            {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
                        </h2>
                    </div>
                    <div className={styles['topbar-right']}>
                        {user && (
                            <>
                                <div className={styles['user-info']}>
                                    <div className={styles['user-avatar']}>
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={styles['user-name']}>{user.username}</span>
                                </div>
                                <button onClick={handleLogout} className={styles['logout-button']}>
                                    <LogOut size={18} />
                                    <span>Đăng xuất</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Nội dung chính */}
                <div className={styles.content}>
                    {renderContent()}
                </div>
            </div>

            {/* Modals */}
            {renderModal()}
        </div>
    );
}