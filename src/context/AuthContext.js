'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('nexora_token');
    if (token) {
      api.get('/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => Cookies.remove('nexora_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    Cookies.set('nexora_token', data.token, { expires: 1 / 3 }); // 8 hours
    setUser(data.user);
    return data.user;
  }

  function logout() {
    Cookies.remove('nexora_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
