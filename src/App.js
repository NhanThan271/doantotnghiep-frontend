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
import PaymentSuccess from './pages/employee/PaymentSuccess';
import PaymentCancel from './pages/employee/PaymentCancel';
import Promotions from "./pages/client/Promotions";
import Menu from "./pages/client/Menu";
import BookingDetail from "./pages/client/booking/BookingDetail";
import RestaurantLocation from "./pages/client/booking/RestaurantLocation";
import ManagerLayout from "./layouts/ManagerLayout";
import KitchenDashboard from "./pages/kitchen/KitchenDashboard";

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