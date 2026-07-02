import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/tickets');
    } catch (err) {
      setError(err.message || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm animate-fadeUp bg-white border border-ink/10 rounded-lg p-8">
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-6 h-6 rounded-sm bg-amber" />
          <span className="font-display text-xl">Signal</span>
        </div>

        <h1 className="font-display text-2xl mb-1 text-center">Sign in</h1>
        <p className="text-slateink text-sm mb-8 text-center">Pick up where the last shift left off.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-md bg-ink text-paper font-medium text-sm hover:bg-ink-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-slateink mt-6 text-center">
          No account yet?{' '}
          <Link to="/register" className="text-ink font-medium underline decoration-amber decoration-2 underline-offset-2">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}