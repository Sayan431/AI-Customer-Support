import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Send, Wand2, Lock, Star, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PriorityTag, StatusTag, CategoryLabel } from '../components/Badges';
import Shell from '../components/Shell';

const STATUSES = ['open', 'in_progress', 'pending_customer', 'resolved', 'closed'];
const TONES = ['professional', 'friendly', 'formal', 'empathetic'];

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const SENDER_STYLE = {
  customer: { align: 'items-start', bubble: 'bg-white border border-ink/10', label: 'Customer' },
  agent: { align: 'items-end', bubble: 'bg-ink text-paper', label: 'Agent' },
  ai: { align: 'items-start', bubble: 'bg-amber/10 border border-amber/30', label: 'AI' },
  system: { align: 'items-center', bubble: 'bg-parchment text-slateink text-xs', label: 'System' },
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'agent' || user?.role === 'admin';

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [tone, setTone] = useState('professional');
  const [draft, setDraft] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const threadEndRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const t = await api.getTicket(id);
      setTicket(t);
      setRating(t.satisfaction_score || 0);
    } catch (err) {
      setError(err.message || 'Could not load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.addMessage(id, { content: reply, is_internal_note: isInternal });
      setReply('');
      setIsInternal(false);
      await load();
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const runSummarize = async () => {
    setSummarizing(true);
    setError('');
    try {
      await api.summarizeTicket(id);
      await load();
    } catch (err) {
      setError(err.message || 'AI summarization failed');
    } finally {
      setSummarizing(false);
    }
  };

  const runAutoResponse = async () => {
    setDrafting(true);
    setError('');
    try {
      const res = await api.autoResponse(id, tone);
      setDraft(res.response);
    } catch (err) {
      setError(err.message || 'Could not generate a draft');
    } finally {
      setDrafting(false);
    }
  };

  const changeStatus = async (status) => {
    setStatusSaving(true);
    try {
      const t = await api.updateTicket(id, { status });
      setTicket((prev) => ({ ...prev, status: t.status, resolved_at: t.resolved_at }));
    } catch (err) {
      setError(err.message || 'Could not update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const submitRating = async (score) => {
    setRating(score);
    try {
      await api.updateTicket(id, { satisfaction_score: score });
    } catch (err) {
      setError(err.message || 'Could not save rating');
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="h-screen flex items-center justify-center text-slateink">
          <Loader2 className="animate-spin" size={20} />
        </div>
      </Shell>
    );
  }

  if (error && !ticket) {
    return (
      <Shell>
        <div className="h-screen flex flex-col items-center justify-center gap-3">
          <p className="text-signal-urgent text-sm">{error}</p>
          <button onClick={() => navigate('/tickets')} className="text-sm underline">Back to tickets</button>
        </div>
      </Shell>
    );
  }

  if (!ticket) return null;

  const visibleMessages = ticket.messages || [];

  return (
    <Shell>
      <div className="h-screen flex overflow-hidden">
        {/* Main thread */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="border-b border-ink/8 px-8 py-5">
            <button onClick={() => navigate('/tickets')} className="flex items-center gap-1.5 text-sm text-slateink hover:text-ink mb-3">
              <ArrowLeft size={14} /> All tickets
            </button>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-slateink mb-1">{ticket.ticket_number}</p>
                <h1 className="font-display text-2xl text-ink truncate">{ticket.subject}</h1>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityTag priority={ticket.priority} />
                <CategoryLabel category={ticket.category} />
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {isStaff ? (
                <select
                  value={ticket.status} disabled={statusSaving} onChange={(e) => changeStatus(e.target.value)}
                  className="text-xs font-mono uppercase tracking-wide border border-ink/15 rounded-md px-2.5 py-1.5 bg-white"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              ) : (
                <StatusTag status={ticket.status} />
              )}
              <span className="text-xs text-slateink">Opened {formatTime(ticket.created_at)}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
            {/* Original description */}
            <div className="bg-white border border-ink/10 rounded-lg p-4">
              <p className="text-[11px] font-mono uppercase tracking-wide text-slateink mb-2">Original request</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {visibleMessages.map((m) => {
              const style = SENDER_STYLE[m.sender_type] || SENDER_STYLE.customer;
              if (m.sender_type === 'system') {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="text-[11px] font-mono text-slateink/70 bg-parchment px-3 py-1 rounded-full">{m.content}</span>
                  </div>
                );
              }
              return (
                <div key={m.id} className={`flex flex-col ${style.align} animate-fadeUp`}>
                  <div className={`max-w-[75%] rounded-lg px-4 py-3 ${style.bubble} ${m.is_internal_note ? 'border-dashed border-amber' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono uppercase tracking-wide ${m.sender_type === 'agent' ? 'text-white/60' : 'text-slateink'}`}>
                        {style.label}
                      </span>
                      {m.is_internal_note && (
                        <span className="flex items-center gap-1 text-[10px] font-mono uppercase text-amber-dark">
                          <Lock size={9} /> internal
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slateink/60 mt-1 px-1">{formatTime(m.created_at)}</span>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>

          {/* Reply box */}
          {ticket.status !== 'closed' && (
            <form onSubmit={sendReply} className="border-t border-ink/8 px-8 py-4">
              {draft && (
                <div className="mb-3 bg-amber/8 border border-amber/30 rounded-md p-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-ink flex-1 whitespace-pre-wrap">{draft}</p>
                  <button type="button" onClick={() => { setReply(draft); setDraft(''); }}
                    className="shrink-0 text-xs font-medium text-amber-dark hover:underline">
                    Use draft
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={reply} onChange={(e) => setReply(e.target.value)} rows={2}
                  placeholder={isStaff ? 'Write a reply…' : 'Add to your ticket…'}
                  className="flex-1 px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
                />
                <button type="submit" disabled={sending || !reply.trim()}
                  className="px-4 rounded-md bg-ink text-paper hover:bg-ink-700 disabled:opacity-40 transition-colors flex items-center justify-center">
                  <Send size={16} />
                </button>
              </div>
              {isStaff && (
                <label className="flex items-center gap-2 mt-2 text-xs text-slateink cursor-pointer">
                  <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="accent-amber" />
                  Internal note (not visible to customer)
                </label>
              )}
            </form>
          )}
        </div>

        {/* AI margin panel */}
        <aside className="w-80 shrink-0 border-l border-ink/8 bg-parchment/50 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-2 text-ink">
              <Sparkles size={15} className="text-amber-dark" />
              <h2 className="font-display text-lg">AI notes</h2>
            </div>

            {/* Summary card */}
            <div className="bg-amber/8 border border-amber/25 rounded-lg p-4 relative">
              <div className="absolute -left-px top-4 bottom-4 w-1 bg-amber rounded-full" />
              {ticket.ai_summary ? (
                <>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-amber-dark mb-2">Summary</p>
                  <p className="text-sm text-ink leading-relaxed mb-3">{ticket.ai_summary}</p>
                  {ticket.ai_sentiment && (
                    <p className="text-[11px] font-mono text-slateink">
                      sentiment: <span className="text-ink">{ticket.ai_sentiment}</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slateink">No summary yet. Generate one to get a quick read on this ticket.</p>
              )}
              {isStaff && (
                <button onClick={runSummarize} disabled={summarizing}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md bg-ink text-paper hover:bg-ink-700 disabled:opacity-50 transition-colors">
                  {summarizing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {ticket.ai_summary ? 'Re-summarize' : 'Summarize with AI'}
                </button>
              )}
            </div>

            {/* Auto-response */}
            {isStaff && (
              <div className="bg-white border border-ink/10 rounded-lg p-4">
                <p className="text-[10px] font-mono uppercase tracking-wide text-slateink mb-2">Draft a response</p>
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full text-xs border border-ink/15 rounded-md px-2.5 py-1.5 mb-2 bg-white capitalize">
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={runAutoResponse} disabled={drafting}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-ink/20 hover:border-amber hover:bg-amber/5 disabled:opacity-50 transition-colors">
                  {drafting ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                  Generate draft
                </button>
              </div>
            )}

            {/* Ticket meta */}
            <div className="bg-white border border-ink/10 rounded-lg p-4 space-y-2.5">
              <p className="text-[10px] font-mono uppercase tracking-wide text-slateink mb-1">Details</p>
              <MetaRow label="Category"><CategoryLabel category={ticket.category} /></MetaRow>
              <MetaRow label="Priority"><PriorityTag priority={ticket.priority} /></MetaRow>
              <MetaRow label="Created">{formatTime(ticket.created_at)}</MetaRow>
              {ticket.resolved_at && <MetaRow label="Resolved">{formatTime(ticket.resolved_at)}</MetaRow>}
            </div>

            {/* Satisfaction */}
            {!isStaff && ['resolved', 'closed'].includes(ticket.status) && (
              <div className="bg-white border border-ink/10 rounded-lg p-4">
                <p className="text-[10px] font-mono uppercase tracking-wide text-slateink mb-2">Rate this resolution</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => submitRating(n)}>
                      <Star size={20} className={n <= rating ? 'fill-amber text-amber' : 'text-ink/15'} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function MetaRow({ label, children }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slateink">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
