import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import Shell from '../components/Shell';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const CATEGORIES = ['billing', 'technical', 'account', 'general', 'complaint', 'feature_request'];

export default function NewTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', description: '', priority: 'medium', category: 'general' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.description.trim().length < 20) {
      setError('Description needs at least 20 characters so the AI has enough context to triage it.');
      return;
    }
    setLoading(true);
    try {
      const ticket = await api.createTicket(form);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message || 'Could not create ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="h-screen overflow-y-auto">
        <header className="border-b border-ink/8 px-8 py-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slateink hover:text-ink mb-4">
            <ArrowLeft size={14} /> Back
          </button>
          <h1 className="font-display text-2xl">New ticket</h1>
          <p className="text-sm text-slateink mt-0.5">Describe the issue — our AI will help route and prioritize it.</p>
        </header>

        <form onSubmit={submit} className="max-w-2xl px-8 py-8 space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Subject</label>
            <input
              required minLength={5} maxLength={500} value={form.subject} onChange={update('subject')}
              placeholder="Brief summary of the issue"
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Description</label>
            <textarea
              required rows={6} value={form.description} onChange={update('description')}
              placeholder="What happened? Include any steps to reproduce, error messages, or context that will help us resolve it quickly."
              className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm resize-none"
            />
            <p className="text-[11px] font-mono text-slateink/70 mt-1">{form.description.length} characters (min 20)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Priority</label>
              <select value={form.priority} onChange={update('priority')}
                className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm capitalize">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-slateink mb-1.5">Category</label>
              <select value={form.category} onChange={update('category')}
                className="w-full px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-md bg-ink text-paper font-medium text-sm hover:bg-ink-700 transition-colors disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit ticket'}
            </button>
            <button type="button" onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-md border border-ink/15 text-sm hover:border-ink/30 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
