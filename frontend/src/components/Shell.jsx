import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, Inbox, MessageSquareText, BarChart3, LogOut, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItemsBase = [
  { to: '/tickets', label: 'Tickets', icon: Inbox },
  { to: '/chat', label: 'AI Assistant', icon: MessageSquareText },
];

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isStaff = user?.role === 'agent' || user?.role === 'admin';

  const items = isStaff
    ? [...navItemsBase, { to: '/dashboard', label: 'Dashboard', icon: BarChart3 }]
    : navItemsBase;

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-ink text-paper flex flex-col">
        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-sm bg-amber flex items-center justify-center">
              <LayoutGrid size={15} className="text-ink" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl tracking-tight">Signal</span>
          </div>
          <p className="text-[11px] font-mono text-white/40 mt-1.5 uppercase tracking-wide">Support Desk</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-paper font-medium'
                    : 'text-white/55 hover:text-paper hover:bg-white/5'
                }`
              }
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => navigate('/tickets/new')}
            className="w-full mt-4 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm bg-amber text-ink font-medium hover:bg-amber-light transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New ticket
          </button>
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display text-sm">
              {user?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate">{user?.full_name}</p>
              <p className="text-[11px] font-mono text-white/40 uppercase">{user?.role}</p>
            </div>
            <button onClick={logout} title="Log out" className="text-white/40 hover:text-amber transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
