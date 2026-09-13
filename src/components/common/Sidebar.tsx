import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  PlusCircle,
  ListTodo,
  Search,
  User,
  Settings,
  BarChart3,
  HelpCircle,
  Shield,
  ArrowRight,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { isResolver, isStudent } = useAuth();

  const studentLinks = [
    { to: '/student/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/student/report', label: 'Report Issue', icon: PlusCircle },
    { to: '/student/issues', label: 'My Submissions', icon: ListTodo },
    { to: '/student/track', label: 'Track Issue', icon: Search },
    { to: '/student/profile', label: 'Student Profile', icon: User },
    { to: '/student/settings', label: 'Settings', icon: Settings },
  ];

  const resolverLinks = [
    { to: '/resolver/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { to: '/resolver/issues', label: 'All Campus Issues', icon: ListTodo },
    { to: '/resolver/analytics', label: 'Campus Analytics', icon: BarChart3 },
    { to: '/resolver/profile', label: 'Staff Profile', icon: User },
    { to: '/resolver/settings', label: 'Settings', icon: Settings },
  ];

  const links = isResolver ? resolverLinks : isStudent ? studentLinks : [];

  return (
    <aside className="app-sidebar flex flex-col h-full w-64 p-5 transition-colors">
      {/* Navigation links */}
      <div className="space-y-1.5 flex-1">
        <div className="px-3 mb-3 flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            {isResolver ? 'Resolver Workspace' : 'Student Portal'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00]" />
        </div>

        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `app-nav-link flex items-center justify-between px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-md font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-[#ff3b00]' : 'text-slate-400 dark:text-zinc-500'
                      }`}
                    />
                    <span>{link.label}</span>
                  </div>
                  {isActive && <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer info links */}
      <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 px-2">
        <NavLink
          to="/about"
          onClick={onCloseMobile}
          className="hover:text-[#ff3b00] transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          About
        </NavLink>
        <span>•</span>
        <NavLink
          to="/security"
          onClick={onCloseMobile}
          className="hover:text-[#ff3b00] transition-colors flex items-center gap-1"
        >
          <Shield className="w-3.5 h-3.5" />
          Security
        </NavLink>
      </div>
    </aside>
  );
};
