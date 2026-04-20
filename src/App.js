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
        <Route path="/register" element={<RegisterPage />} />
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

        {/* Cashier routes - SẮP XẾP LẠI */}
        <Route path="/employee/cashier" element={<CashierLayout />}>
          <Route index element={<ShiftPage />} />
          <Route path="shift" element={<ShiftPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="booking" element={<BookingPage />} />
        </Route>

        {/* Route cho TableDetail - ĐẶT NGOÀI CashierLayout để tránh layout lồng */}
        <Route path="/employee/cashier/tables/:id" element={<TableDetail />} />
        <Route path="/employee/cashier/rooms/:id" element={<TableDetail />} />

        {/* Waiter Routes */}
        <Route path="/employee/waiter" element={<WaiterLayout />}>
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="payment-requests" element={<WaiterPaymentRequests />} />
        </Route>

        {/* Chef routes */}
        <Route path="/employee/chef" element={<ChefLayout />}>
          <Route index element={<ChefDashboard />} />
        </Route>

        {/* Stock routes */}
        <Route path="/employee/stock" element={<StockLayout />}>
          <Route index element={<StockDashboard />} />
          <Route path="inventory" element={<div>Quản lý kho</div>} />
          <Route path="import" element={<div>Nhập hàng</div>} />
          <Route path="export" element={<div>Xuất hàng</div>} />
          <Route path="check" element={<div>Kiểm kho</div>} />
          <Route path="low-stock" element={<div>Hàng sắp hết</div>} />
        </Route>

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