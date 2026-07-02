const PRIORITY_STYLES = {
  low: 'bg-slate-100 text-slateink border-slateink/20',
  medium: 'bg-signal-progress/10 text-signal-progress border-signal-progress/30',
  high: 'bg-amber/15 text-amber-dark border-amber/40',
  urgent: 'bg-signal-urgent/10 text-signal-urgent border-signal-urgent/40',
};

const STATUS_STYLES = {
  open: { color: 'bg-signal-progress', label: 'Open' },
  in_progress: { color: 'bg-amber', label: 'In progress' },
  pending_customer: { color: 'bg-signal-pending', label: 'Awaiting customer' },
  resolved: { color: 'bg-signal-resolved', label: 'Resolved' },
  closed: { color: 'bg-slateink', label: 'Closed' },
};

export function PriorityTag({ priority }) {
  const cls = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wide border ${cls}`}>
      {priority}
    </span>
  );
}

export function StatusTag({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.open;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide text-ink-700">
      <span className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
      {s.label}
    </span>
  );
}

export function PriorityEdge({ priority }) {
  const bar = {
    low: 'bg-slateink/25',
    medium: 'bg-signal-progress',
    high: 'bg-amber',
    urgent: 'bg-signal-urgent',
  }[priority] || 'bg-slateink/25';
  return <span className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />;
}

export function CategoryLabel({ category }) {
  return (
    <span className="text-[11px] font-mono uppercase tracking-wide text-slateink">
      {String(category).replace('_', ' ')}
    </span>
  );
}
