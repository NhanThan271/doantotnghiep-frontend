import { Routes, Route } from "react-router-dom";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import "./assets/scss/style.scss";
import Main from "./layouts/Main";
import CafeStaffSystem from "./pages/employee/CafeStaffSystem";
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/login/RegisterPage';
import ForgotPasswordPage from "./pages/login/ForgotPasswordPage";
import CafeCusSystem from "./pages/customer/CafeCusSystem";
import MomoReturn from './pages/employee/MomoReturn';

import Promotions from "./pages/client/Promotions";
import Menu from "./pages/client/Menu";
import BookingDetail from "./pages/client/booking/BookingDetail";
import RestaurantLocation from "./pages/client/booking/RestaurantLocation";
import ManagerLayout from "./layouts/ManagerLayout";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";

import CashierLayout from "./layouts/CashierLayout";
import WaiterLayout from "./layouts/WaiterLayout";
import ChefLayout from "./layouts/ChefLayout";
import StockLayout from "./layouts/StockLayout";

import ShiftPage from "./pages/employee/cashier/ShiftPage";
import TablesPage from "./pages/employee/cashier/TablesPage";
import BookingPage from "./pages/employee/cashier/BookingPage";
import TableDetail from "./pages/employee/cashier/TableDetail";

import Orders from "./pages/employee/waiter/Orders";
import OrderDetail from "./pages/employee/waiter/OrderDetail";
import WaiterPaymentRequests from "./pages/employee/waiter/WaiterPaymentRequests";

import ChefDashboard from "./pages/employee/chef/ChefDashboard";
import StockDashboard from "./pages/employee/stock/StockDashboard";
import PaymentSuccess from "./pages/client/booking/PaymentSuccess";
import PaymentCancel from "./pages/client/booking/PaymentCancel";

// Layout wrapper cho trang công khai
const PublicLayout = ({ children }) => (
  <>
    <Header />
    {children}
    <Footer />
  </>
);

function App() {
  return (
    <>
      <Routes>
        {/* Trang đăng nhập */}
        <Route path="/login" element={<LoginPage />} />
        {/* Trang đăng ký */}
        <Route path="/register" element={<RegisterPage />} />
        {/* Trang Quên mật khẩu */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Layout riêng cho admin, nhân viên, khách */}
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/manager/*" element={<ManagerLayout />} />
        <Route path="/employee/*" element={<CafeStaffSystem />} />
        <Route path="/kitchen/*" element={<KitchenDashboard />} />
        <Route path="/menu/*" element={<CafeCusSystem />} />
        <Route path="/momo-return" element={<MomoReturn />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />

        {/* 🆕 Employee routes theo position */}
        <Route path="/employee/cashier/*" element={<CashierLayout><ShiftPage /></CashierLayout>} />
        <Route path="/employee/waiter/*" element={<WaiterLayout>< Orders /></WaiterLayout>} />
        <Route path="/employee/chef/*" element={<ChefLayout><ChefDashboard /></ChefLayout>} />
        <Route path="/employee/stock/*" element={<StockLayout><StockDashboard /></StockLayout>} />

        {/* Cashier sub-routes */}
        <Route path="/employee/cashier" element={<CashierLayout />}>
          <Route index element={<ShiftPage />} /> {/* mặc định */}
          <Route path="shift" element={<ShiftPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="booking" element={<BookingPage />} />
        </Route>
        <Route path="/employee/cashier/tables/:id" element={<TableDetail />} />

        {/* Waiter Routes */}
        <Route path="/employee/waiter/orders" element={<WaiterLayout><Orders /></WaiterLayout>} />
        <Route path="/employee/waiter/orders/:id" element={<WaiterLayout><OrderDetail /></WaiterLayout>} />
        <Route path="/employee/waiter/payment-requests" element={<WaiterLayout><WaiterPaymentRequests /></WaiterLayout>} />

        {/* Chef sub-routes */}
        <Route path="/employee/chef" element={<ChefLayout><ChefDashboard /></ChefLayout>} />

        {/* Stock sub-routes */}
        <Route path="/employee/stock" element={<StockLayout><StockDashboard /></StockLayout>} />
        <Route path="/employee/stock/inventory" element={<StockLayout><div>Quản lý kho</div></StockLayout>} />
        <Route path="/employee/stock/import" element={<StockLayout><div>Nhập hàng</div></StockLayout>} />
        <Route path="/employee/stock/export" element={<StockLayout><div>Xuất hàng</div></StockLayout>} />
        <Route path="/employee/stock/check" element={<StockLayout><div>Kiểm kho</div></StockLayout>} />
        <Route path="/employee/stock/low-stock" element={<StockLayout><div>Hàng sắp hết</div></StockLayout>} />

        {/* Trang công khai với Header + Footer */}
        <Route path="/" element={<PublicLayout><Main /></PublicLayout>} />
        <Route path="/uu-dai" element={<PublicLayout><Promotions /></PublicLayout>} />
        <Route path="/thuc-don" element={<PublicLayout><Menu /></PublicLayout>} />
        <Route path="/dat-ban-chi-tiet" element={<PublicLayout><BookingDetail /></PublicLayout>} />
        <Route path="/dat-ban-dia-chi" element={<PublicLayout><RestaurantLocation /></PublicLayout>} />
      </Routes>
    </>
  );
}

export default App;