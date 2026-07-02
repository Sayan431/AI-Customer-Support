import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/tickets');
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment p-6">
      <div className="w-full max-w-md bg-white rounded-lg border border-ink/10 shadow-sm p-8 animate-fadeUp">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded-sm bg-amber" />
          <span className="font-display text-xl">Signal</span>
        </div>

        <h1 className="font-display text-2xl mb-1">Create your account</h1>
        <p className="text-slateink text-sm mb-6">Set up access to the support desk.</p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Full name</label>
            <input required value={form.full_name} onChange={update('full_name')}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 focus:border-amber outline-none text-sm" placeholder="Ada Lovelace" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Email</label>
            <input type="email" required value={form.email} onChange={update('email')}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 focus:border-amber outline-none text-sm" placeholder="you@company.com" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Password</label>
            <input type="password" required minLength={8} value={form.password} onChange={update('password')}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 focus:border-amber outline-none text-sm" placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Account type</label>
            <select value={form.role} onChange={update('role')}
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 focus:border-amber outline-none text-sm bg-white">
              <option value="customer">Customer — submit &amp; track tickets</option>
              <option value="agent">Agent — respond &amp; resolve tickets</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>

          {error && (
            <div className="text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-md bg-ink text-paper font-medium text-sm hover:bg-ink-700 transition-colors disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-slateink mt-6 text-center">
          Already have one?{' '}
          <Link to="/login" className="text-ink font-medium underline decoration-amber decoration-2 underline-offset-2">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
