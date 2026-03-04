import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export const useOrderSocket = () => {
    const stompClient = useRef(null);

    useEffect(() => {
        const socket = new SockJS("http://localhost:8080/ws");
        const client = new Client({
            webSocketFactory: () => socket,
            reconnectDelay: 5000,
            onConnect: () => {
                console.log("✅ Connected to WebSocket server");
            },
            onStompError: (frame) =>
                console.error("❌ STOMP error:", frame.headers["message"]),
        });
        client.activate();
        stompClient.current = client;

        return () => {
            if (stompClient.current) stompClient.current.deactivate();
        };
    }, []);

    const sendOrderWS = (order) => {
        if (stompClient.current?.connected) {
            stompClient.current.publish({
                destination: "/app/orders/new",
                body: JSON.stringify(order),
            });
        }
    };

    return { sendOrderWS };
};
