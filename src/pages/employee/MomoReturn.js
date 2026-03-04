import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MomoReturn() {
    const navigate = useNavigate();

    useEffect(() => {
        // MoMo sẽ trả về query ?orderId=...&resultCode=...
        const params = new URLSearchParams(window.location.search);
        const resultCode = params.get("resultCode");

        if (resultCode === "0") {
            alert("Thanh toán thành công!");
        } else {
            alert("Thanh toán thất bại hoặc bị hủy");
        }

        navigate("/employee"); // quay về trang chính
    }, []);

    return <h2>Đang xử lý...</h2>;
}
