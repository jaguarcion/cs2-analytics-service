'use client';

import { useState } from 'react';
import { setToken } from '@/lib/auth';
import axios from 'axios';

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [token, setTokenValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/auth/login', { token });
      setToken(token);
      onSuccess();
    } catch {
      setError('Неверный токен');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950">
      <div className="w-full max-w-sm rounded-2xl bg-dark-900 border border-dark-700/50 p-8">
        <h1 className="mb-2 text-2xl font-bold text-dark-50">CS2 Analytics</h1>
        <p className="mb-6 text-sm text-dark-400">Введите токен для доступа</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={token}
            onChange={(e) => setTokenValue(e.target.value)}
            placeholder="Токен доступа"
            className="w-full rounded-lg border border-dark-700 bg-dark-800 px-4 py-3 text-sm text-dark-100 placeholder-dark-500 outline-none focus:border-accent-blue transition-colors"
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-accent-red">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="mt-4 w-full rounded-lg bg-accent-blue px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
