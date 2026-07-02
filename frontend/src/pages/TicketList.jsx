import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Inbox, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PriorityTag, StatusTag, PriorityEdge, CategoryLabel } from '../components/Badges';
import Shell from '../components/Shell';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending_customer', label: 'Awaiting customer' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TicketList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.listTickets({ status: status || undefined, page, page_size: pageSize });
      setTickets(res.tickets);
      setTotal(res.total);
    } catch (err) {
      setError(err.message || 'Could not load tickets');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter(
    (t) => !query || t.subject.toLowerCase().includes(query.toLowerCase()) || t.ticket_number.toLowerCase().includes(query.toLowerCase())
  );

  const isStaff = user?.role === 'agent' || user?.role === 'admin';

  return (
    <Shell>
      <div className="h-screen overflow-y-auto">
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink/8 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl">{isStaff ? 'All tickets' : 'Your tickets'}</h1>
              <p className="text-sm text-slateink mt-0.5">{total} total</p>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slateink" />
              <input
                value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by subject or number…"
                className="pl-9 pr-4 py-2 w-72 rounded-md border border-ink/15 bg-white text-sm focus:border-amber outline-none"
              />
            </div>
          </div>

          <div className="flex gap-1.5 mt-4">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatus(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  status === f.value ? 'bg-ink text-paper' : 'bg-white text-slateink border border-ink/10 hover:border-ink/25'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        <div className="px-8 py-6">
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-white border border-ink/8 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-4 py-3">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Inbox size={32} className="text-slateink/40 mb-3" />
              <p className="font-display text-lg text-ink/70">Nothing here</p>
              <p className="text-sm text-slateink mt-1">
                {query ? 'No tickets match your search.' : 'When a ticket comes in, it lands here.'}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {filtered.map((t, i) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                style={{ animationDelay: `${i * 25}ms` }}
                className="animate-fadeUp relative w-full text-left bg-white border border-ink/8 rounded-lg pl-5 pr-5 py-4 hover:border-amber/50 hover:shadow-sm transition-all group overflow-hidden"
              >
                <PriorityEdge priority={t.priority} />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="font-mono text-[11px] text-slateink">{t.ticket_number}</span>
                      <StatusTag status={t.status} />
                      {t.ai_summary && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide text-amber-dark">
                          <Sparkles size={10} /> AI reviewed
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base text-ink group-hover:text-amber-dark transition-colors truncate">
                      {t.subject}
                    </h3>
                    {t.ai_summary && (
                      <p className="text-sm text-slateink mt-1 line-clamp-1">{t.ai_summary}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <PriorityTag priority={t.priority} />
                    <CategoryLabel category={t.category} />
                    <span className="text-[11px] font-mono text-slateink/70">{timeAgo(t.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30">
                Previous
              </button>
              <span className="text-sm font-mono text-slateink">Page {page} of {Math.ceil(total / pageSize)}</span>
              <button disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm rounded-md border border-ink/15 disabled:opacity-30 hover:border-ink/30">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
