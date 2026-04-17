import React, { useState, useEffect } from 'react';
import { BarChart3, Users, ShoppingBag, Tag, LogOut, Package, ChevronLeft, DoorOpen, ChevronRight, FolderTree, MapPin, Table, MenuSquare, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.css';

// Pages
import Dashboard from '../pages/admin/Dashboard';
import Products from '../pages/admin/Products';
import Promotions from '../pages/admin/Promotions';
import Employees from '../pages/admin/Employees';
import Reports from '../pages/admin/Reports';
import Categories from '../pages/admin/Categories';

// Modal Forms
import AddProductForm from '../pages/admin/forms/AddProductForm';
import EditProductForm from '../pages/admin/forms/EditProductForm';
import AddPromotionForm from '../pages/admin/forms/AddPromotionForm';
import EditPromotionForm from '../pages/admin/forms/EditPromotionForm';
import AddEmployeeForm from '../pages/admin/forms/AddEmployeeForm';
import EditEmployeeForm from '../pages/admin/forms/EditEmployeeForm';
import AddCategoryForm from '../pages/admin/forms/AddCategoryForm';
import EditCategoryForm from '../pages/admin/forms/EditCategoryForm';
import Branches from '../pages/admin/Branches';
import AddBranch from '../pages/admin/forms/AddBranch';
import EditBranch from '../pages/admin/forms/EditBranch';
import BranchMenuDistribution from '../pages/admin/BranchMenu';
import InventoryManagement from '../pages/admin/InventoryManegement';
import TableManagement from '../pages/admin/BranchTable';
import ReservationMonitor from '../pages/admin/ReservationMonitor';
import BillsAndAuditSystem from '../pages/admin/BillsAndAudit';
import Ingredients from '../pages/admin/Ingredients';
import AddIngredientForm from '../pages/admin/forms/Addingredientform';
import EditIngredientForm from '../pages/admin/forms/Editingredientform';
import Recipes from '../pages/admin/Recipes';
import AddRecipeForm from '../pages/admin/forms/Addrecipeform';
import EditRecipeForm from '../pages/admin/forms/Editrecipeform';
import RoomManagement from '../pages/admin/BranchRoom';

export default function AdminLayout() {
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
    const [branches, setBranches] = useState([]);
    const [branchmenu, setBranchmenu] = useState([]);
    const [branchtable, setBranchtable] = useState([]);
    const [branchroom, setBranchroom] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([])

    // Modal state
    const [modalType, setModalType] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [refreshCallback, setRefreshCallback] = useState(null);

    // State để trigger refresh
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'products', label: 'Quản lý Món ăn', icon: ShoppingBag },
        { id: 'branchmenu', label: 'Phân menu cho chi nhánh', icon: MenuSquare },
        { id: 'branchtable', label: 'Quản lý Bàn', icon: Table },
        { id: 'branchroom', label: 'Quản lý Phòng', icon: DoorOpen },
        { id: 'categories', label: 'Quản lý Danh mục', icon: FolderTree },
        { id: 'ingredients', label: 'Quản lý Nguyên liệu', icon: Package },
        { id: 'recipes', label: 'Quản lý công thức', icon: Receipt },
        { id: 'inventory', label: 'Quản lý Tồn kho', icon: ShoppingBag },
        { id: 'reservations', label: 'Giám sát Đặt bàn/ Phòng', icon: Users },
        { id: 'promotions', label: 'Quản lý Khuyến mãi', icon: Tag },
        { id: 'branches', label: 'Quản lý Chi nhánh', icon: MapPin },
        { id: 'employees', label: 'Quản lý Nhân viên', icon: Users },
        { id: 'billandauditsystem', label: 'Hóa đơn & Log hệ thống', icon: FileText },
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
        console.log(' handleSave called:', type, item);

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
            case 'branch':
                modalType.startsWith('add') ? setBranches([...branches, { ...item, id: Date.now(), isActive: true }])
                    : setBranches(branches.map(b => (b.id === item.id ? item : b)));
                break;
            case 'branchmenu':
                modalType.startsWith('add') ? setBranchmenu([...branchmenu, { ...item, id: Date.now() }])
                    : setBranchmenu(branchmenu.map(b => (b.id === item.id ? item : b)));
                break;
            case 'branchtable':
                modalType.startsWith('add') ? setBranchtable([...branchtable, { ...item, id: Date.now() }])
                    : setBranchtable(branchtable.map(b => (b.id === item.id ? item : b)));
                break;
            case 'branchroom':
                modalType.startsWith('add') ? setBranchroom([...branchroom, { ...item, id: Date.now() }])
                    : setBranchroom(branchroom.map(b => (b.id === item.id ? item : b)));
                break;
            case 'ingredients':
                modalType.startsWith('add') ? setIngredients([...ingredients, { ...item, id: Date.now(), isActive: true }])
                    : setIngredients(ingredients.map(i => (i.id === item.id ? item : i)));
                break;
            case 'recipes':
                modalType.startsWith('add') ? setRecipes([...recipes, { ...item, id: Date.now(), isActive: true }])
                    : setRecipes(recipes.map(r => (r.id === item.id ? item : r)));
                break;
            case 'inventory':
                // Handle inventory logic here
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
            case 'branchmenu':
                return <BranchMenuDistribution
                    products={branchmenu}
                    openAdd={() => openAddModal('Branchmenu')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'branchtable':
                return <TableManagement
                    products={branchtable}
                    openAdd={() => openAddModal('Branchtable')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'branchroom':
                return <RoomManagement
                    products={branchroom}
                    openAdd={() => openAddModal('Branchroom')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'categories':
                return <Categories
                    categories={categories}
                    openAdd={() => openAddModal('Category')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'ingredients':
                return <Ingredients
                    ingredients={ingredients}
                    openAdd={() => openAddModal('Ingredient')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'recipes':
                return <Recipes
                    recipes={recipes}
                    openAdd={() => openAddModal('Recipes')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'inventory':
                return <InventoryManagement
                    products={products}
                    refreshTrigger={refreshTrigger}
                />;
            case 'reservations':
                return <ReservationMonitor />;
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
            case 'branches':
                return <Branches
                    branches={branches}
                    openAdd={() => openAddModal('Branch')}
                    openEdit={openEditModal}
                    refreshTrigger={refreshTrigger}
                />;
            case 'billandauditsystem': return <BillsAndAuditSystem />;
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
                    refreshCallback={refreshCallback}
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
                    refreshCallback={refreshCallback}
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
                    refreshCallback={refreshCallback}
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
                    refreshCallback={refreshCallback}
                />;
            case 'addBranch':
                return <AddBranch
                    closeForm={closeModal}
                    onSuccess={() => {
                        setRefreshTrigger(prev => prev + 1);
                        closeModal();
                    }}
                />;
            case 'editBranch':
                return <EditBranch
                    branch={selectedItem}
                    closeForm={closeModal}
                    onSuccess={() => {
                        setRefreshTrigger(prev => prev + 1);
                        closeModal();
                    }}
                    refreshCallback={refreshCallback}
                />;
            case 'addIngredient':
                return <AddIngredientForm
                    closeForm={closeModal}
                    onSave={handleSave}
                />;
            case 'editIngredient':
                return <EditIngredientForm
                    ingredientData={selectedItem}
                    closeForm={closeModal}
                    onSave={handleSave}
                    refreshCallback={refreshCallback}
                />;
            case 'addRecipes':
                return <AddRecipeForm
                    closeForm={closeModal}
                    onSave={handleSave}
                />;
            case 'editRecipe':
                return <EditRecipeForm
                    recipeData={selectedItem}
                    closeForm={closeModal}
                    onSave={handleSave}
                    refreshCallback={refreshCallback}
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
                            <div className={styles['brand-icon']}>A</div>
                            <h1 className={styles['brand-title']}>Admin Panel</h1>
                        </div>
                    )}
                    {!sidebarOpen && (
                        <div className={styles['brand-icon-collapsed']}>A</div>
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