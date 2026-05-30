import { Routes, Route } from "react-router-dom";
import Header from "./layouts/Header";
import Footer from "./layouts/Footer";
import "./assets/scss/style.scss";
import Main from "./layouts/Main";
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/login/RegisterPage';
import ForgotPasswordPage from "./pages/login/ForgotPasswordPage";

import Promotions from "./pages/client/Promotions";
import Menu from "./pages/client/Menu";
import BookingDetail from "./pages/client/booking/BookingDetail";
import RestaurantLocation from "./pages/client/booking/RestaurantLocation";
import ManagerLayout from "./layouts/ManagerLayout";

import CashierLayout from "./layouts/CashierLayout";
import WaiterLayout from "./layouts/WaiterLayout";
import ChefLayout from "./layouts/ChefLayout";

// Cashier pages
import Dashboard from "./pages/employee/cashier/Dashboard";
import BillPage from "./pages/employee/cashier/BillPage";
import ReportPage from "./pages/employee/cashier/ReportPage";
import SettingPage from "./pages/employee/cashier/SettingPage";
import TablesPage from "./pages/employee/cashier/TablesPage";
import BookingPage from "./pages/employee/cashier/BookingPage";
import TableDetail from "./pages/employee/cashier/TableDetail";
import Orders from "./pages/employee/waiter/Orders";
import OrderDetail from "./pages/employee/waiter/OrderDetail";
import WaiterPaymentSuccess from "./pages/employee/waiter/PaymentSuccess";
import WaiterPaymentCancel from "./pages/employee/waiter/PaymentCancel";
import ChefDashboard from "./pages/employee/chef/ChefDashboard";
import ClientPaymentSuccess from "./pages/client/booking/PaymentSuccess";
import ClientPaymentCancel from "./pages/client/booking/PaymentCancel";
import CashierPaymentSuccess from "./pages/employee/cashier/CashierPaymentSuccess";
import CashierPaymentCancel from "./pages/employee/cashier/CashierPaymentCancel";
import PaymentRequest from "./pages/employee/waiter/PaymentRequest";
import PaymentQR from "./pages/employee/waiter/PaymentQR";
import KitchenMonitor from "./pages/employee/waiter/KitchenMonitor";
import HeroLanding from "./pages/client/HeroLanding";
import Home from "./layouts/Home";
import TuyenDung from './pages/client/TuyenDung';
import ShiftRegistration from './pages/employee/ShiftRegistration';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';

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
        {/* ===== Trang Hero — KHÔNG có Header/Footer ===== */}
        <Route path="/" element={<HeroLanding />} />

        {/* Trang đăng nhập */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Layout riêng cho admin, nhân viên, khách */}
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/manager/*" element={<ManagerLayout />} />

        {/* Client payment routes */}
        <Route path="/payment-success" element={<ClientPaymentSuccess />} />
        <Route path="/payment-cancel" element={<ClientPaymentCancel />} />

        {/* Cashier routes - Thêm trực tiếp */}
        <Route path="/cashier" element={<CashierLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bill" element={<BillPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="setting" element={<SettingPage />} />
          <Route path="tables" element={<TablesPage />} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="shift" element={<ShiftRegistration />} />
        </Route>

        {/* Route cho TableDetail - Giữ nguyên cho cashier */}
        <Route path="/cashier/tables/:id" element={<TableDetail />} />
        <Route path="/cashier/rooms/:id" element={<TableDetail />} />

        {/* Route cho OrderDetail - Dành cho waiter */}
        <Route path="/waiter/orders/:id" element={<OrderDetail />} />

        {/* Cashier payment routes */}
        <Route path="/cashier-payment-success" element={<CashierPaymentSuccess />} />
        <Route path="/cashier-payment-cancel" element={<CashierPaymentCancel />} />

        {/* Waiter Routes - Thêm trực tiếp */}
        <Route path="/waiter" element={<WaiterLayout />}>
          <Route path="orders" element={<Orders />} />
          <Route path="payment-requests" element={<PaymentRequest />} />
          <Route path="kitchen" element={<KitchenMonitor />} />
        </Route>
        <Route path="/waiter/payment-requests/:id" element={<PaymentQR />} />

        {/* Waiter payment routes */}
        <Route path="/waiter/payment-success" element={<WaiterPaymentSuccess />} />
        <Route path="/waiter/payment-cancel" element={<WaiterPaymentCancel />} />

        {/* Chef routes - Thêm trực tiếp */}
        <Route path="/chef" element={<ChefLayout><ChefDashboard /></ChefLayout>} />

        {/* Trang công khai với Header + Footer */}
        <Route path="/home" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/uu-dai" element={<PublicLayout><Promotions /></PublicLayout>} />
        <Route path="/thuc-don" element={<PublicLayout><Menu /></PublicLayout>} />
        <Route path="/dat-ban-chi-tiet" element={<PublicLayout><BookingDetail /></PublicLayout>} />
        <Route path="/dat-ban-dia-chi" element={<PublicLayout><RestaurantLocation /></PublicLayout>} />
        <Route path="/tuyen-dung" element={<PublicLayout><TuyenDung /></PublicLayout>} />

        {/* Đăng ký ca làm (dành cho nhân viên) */}
        <Route path="/shift-registration" element={<ShiftRegistration />} />
      </Routes>
    </>
  );
}

export default App;