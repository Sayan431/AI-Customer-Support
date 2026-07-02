import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Sparkles, Plus, Trash2, MessageSquareText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Shell from '../components/Shell';

export default function Chat() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggested, setSuggested] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
    } catch (err) {
      setError(err.message || 'Could not load conversations');
    } finally {
      setLoadingConvos(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = async (id) => {
    setActiveId(id);
    setSuggested([]);
    try {
      const detail = await api.getConversation(id);
      setMessages(detail.messages);
    } catch (err) {
      setError(err.message || 'Could not load conversation');
    }
  };

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setSuggested([]);
    setInput('');
  };

  const removeConversation = async (id, e) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      setConversations((c) => c.filter((x) => x.id !== id));
      if (activeId === id) startNew();
    } catch (err) {
      setError(err.message || 'Could not delete conversation');
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError('');
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: 'user', content: text, created_at: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await api.sendChatMessage(text, activeId);
      setActiveId(res.conversation_id);
      setMessages((m) => [...m, res.message]);
      setSuggested(res.suggested_actions || []);
      loadConversations();
    } catch (err) {
      setError(err.message || 'The assistant could not respond');
    } finally {
      setSending(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <Shell>
      <div className="h-screen flex overflow-hidden">
        {/* Conversation list */}
        <aside className="w-72 shrink-0 border-r border-ink/8 bg-parchment/50 flex flex-col">
          <div className="p-4 border-b border-ink/8">
            <button onClick={startNew}
              className="w-full flex items-center gap-2 justify-center text-sm font-medium px-3 py-2.5 rounded-md bg-ink text-paper hover:bg-ink-700 transition-colors">
              <Plus size={15} /> New conversation
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConvos && <p className="text-xs text-slateink px-3 py-2">Loading…</p>}
            {!loadingConvos && conversations.length === 0 && (
              <p className="text-xs text-slateink px-3 py-4 text-center">No conversations yet</p>
            )}
            {conversations.map((c) => (
              <button
                key={c.id} onClick={() => openConversation(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm group flex items-center justify-between gap-2 transition-colors ${
                  activeId === c.id ? 'bg-white border border-amber/40' : 'hover:bg-white/60'
                }`}
              >
                <span className="truncate flex-1">{c.title}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-slateink/60">{c.message_count}</span>
                  <span onClick={(e) => removeConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slateink hover:text-signal-urgent transition-opacity">
                    <Trash2 size={12} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-ink/8 px-8 py-5 flex items-center gap-2.5">
            <Sparkles size={16} className="text-amber-dark" />
            <div>
              <h1 className="font-display text-xl">AI Assistant</h1>
              <p className="text-xs text-slateink">Ask about your tickets, or get help before filing one.</p>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <MessageSquareText size={28} className="text-slateink/30 mb-3" />
                <p className="font-display text-lg text-ink/70">How can I help?</p>
                <p className="text-sm text-slateink mt-1">Describe an issue and I'll help you troubleshoot it or route it to the right place.</p>
              </div>
            )}

            <div className="space-y-4 max-w-2xl mx-auto">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeUp`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-ink text-paper' : 'bg-amber/10 border border-amber/25 text-ink'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-amber/10 border border-amber/25 rounded-lg px-4 py-3 flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-dark animate-pulseDot" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-dark animate-pulseDot" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-dark animate-pulseDot" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {suggested.length > 0 && (
              <div className="max-w-2xl mx-auto mt-3 flex flex-wrap gap-2">
                {suggested.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => (s.toLowerCase().includes('ticket') ? navigate('/tickets/new') : setInput(s))}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-amber/40 text-amber-dark hover:bg-amber/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="max-w-2xl mx-auto mt-3 text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <form onSubmit={send} className="border-t border-ink/8 px-8 py-4">
            <div className="max-w-2xl mx-auto flex gap-2">
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question…"
                className="flex-1 px-3.5 py-2.5 rounded-md border border-ink/15 bg-white focus:border-amber outline-none text-sm"
              />
              <button type="submit" disabled={sending || !input.trim()}
                className="px-4 rounded-md bg-ink text-paper hover:bg-ink-700 disabled:opacity-40 transition-colors flex items-center justify-center">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Shell>
  );
}
