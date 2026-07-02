import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Loader2, TrendingUp, Clock, Star, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import Shell from '../components/Shell';

const PIE_COLORS = ['#E8A33D', '#3B7FC4', '#2F9E6E', '#D64545', '#8B5FBF', '#5B6478'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getDashboard(days)
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load dashboard'))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <Shell>
      <div className="h-screen overflow-y-auto">
        <header className="sticky top-0 z-10 bg-paper/90 backdrop-blur border-b border-ink/8 px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl">Dashboard</h1>
            <p className="text-sm text-slateink mt-0.5">Operational read on the support desk.</p>
          </div>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-ink/15 rounded-md px-3 py-2 bg-white">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </header>

        <div className="px-8 py-6">
          {loading && (
            <div className="flex items-center justify-center py-32 text-slateink">
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}
          {error && (
            <div className="text-sm text-signal-urgent bg-signal-urgent/8 border border-signal-urgent/20 rounded-md px-4 py-3">{error}</div>
          )}

          {data && (
            <div className="space-y-6 animate-fadeUp">
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-4">
                <StatCard label="Open tickets" value={data.ticket_stats.open_tickets} icon={TrendingUp} accent="text-signal-progress" />
                <StatCard label="In progress" value={data.ticket_stats.in_progress_tickets} icon={Clock} accent="text-amber-dark" />
                <StatCard label="Avg. resolution" value={`${data.ticket_stats.avg_resolution_time_hours}h`} icon={Clock} accent="text-signal-resolved" />
                <StatCard label="Avg. satisfaction" value={`${data.ticket_stats.avg_satisfaction_score.toFixed(1)} / 5`} icon={Star} accent="text-amber-dark" />
              </div>

              <div className="grid grid-cols-3 gap-5">
                {/* Volume chart */}
                <div className="col-span-2 bg-white border border-ink/10 rounded-lg p-5">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-slateink mb-4">Ticket volume</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={data.daily_volume}>
                      <defs>
                        <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E8A33D" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#E8A33D" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2F9E6E" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2F9E6E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0F172915" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: '#0F172920' }} />
                      <YAxis tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip contentStyle={{ fontSize: 12, fontFamily: 'Inter', borderRadius: 8, border: '1px solid #0F172920' }} />
                      <Area type="monotone" dataKey="created" stroke="#E8A33D" fill="url(#created)" strokeWidth={2} name="Created" />
                      <Area type="monotone" dataKey="resolved" stroke="#2F9E6E" fill="url(#resolved)" strokeWidth={2} name="Resolved" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Category breakdown */}
                <div className="bg-white border border-ink/10 rounded-lg p-5">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-slateink mb-4">By category</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data.category_breakdown} dataKey="count" nameKey="category" innerRadius={45} outerRadius={70} paddingAngle={2}>
                        {data.category_breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #0F172920' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {data.category_breakdown.map((c, i) => (
                      <div key={c.category} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slateink capitalize">
                          <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          {c.category.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-ink">{c.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Agent performance */}
                <div className="bg-white border border-ink/10 rounded-lg p-5">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-slateink mb-4">Agent performance</p>
                  <div className="space-y-3">
                    {data.agent_performance.length === 0 && <p className="text-sm text-slateink">No resolved tickets yet.</p>}
                    {data.agent_performance.map((a) => (
                      <div key={a.agent_id} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{a.agent_name}</span>
                        <div className="flex items-center gap-4 font-mono text-xs text-slateink">
                          <span>{a.tickets_handled} tickets</span>
                          <span>{a.avg_resolution_time_hours}h avg</span>
                          <span className="flex items-center gap-1 text-amber-dark">
                            <Star size={11} className="fill-amber-dark" /> {a.avg_satisfaction_score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI usage */}
                <div className="bg-ink text-paper rounded-lg p-5 relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber/10 rounded-full blur-2xl" />
                  <div className="flex items-center gap-2 mb-4 relative">
                    <Sparkles size={14} className="text-amber" />
                    <p className="text-[11px] font-mono uppercase tracking-wide text-white/60">AI usage</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 relative">
                    <AiStat label="Summaries generated" value={data.ai_usage.total_summaries_generated} />
                    <AiStat label="Auto-responses drafted" value={data.ai_usage.total_auto_responses_generated} />
                    <AiStat label="Chatbot messages" value={data.ai_usage.total_chatbot_messages} />
                    <AiStat label="Avg. msgs / session" value={data.ai_usage.avg_chatbot_messages_per_session} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-mono uppercase tracking-wide text-slateink">{label}</p>
        <Icon size={14} className={accent} />
      </div>
      <p className="font-display text-3xl text-ink">{value}</p>
    </div>
  );
}

function AiStat({ label, value }) {
  return (
    <div>
      <p className="font-display text-2xl">{value}</p>
      <p className="text-[11px] text-white/50 mt-0.5">{label}</p>
    </div>
  );
}
