import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.css';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.message || 'Đăng nhập thất bại');
                return;
            }

            const data = await response.json();
            // Lưu token và thông tin user
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data));

            // Chuyển hướng về Dashboard
            navigate('/');
        } catch (err) {
            console.error('Lỗi khi đăng nhập:', err);
            setError('Lỗi server hoặc mạng');
        }
    };

    return (
        <div className={styles.loginWrapper} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' }}>
            <form onSubmit={handleSubmit} style={{ padding: '32px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '360px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Đăng nhập Admin</h2>

                {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

                <div style={{ marginBottom: '16px' }}>
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                    Đăng nhập
                </button>
            </form>
        </div>
    );
}
