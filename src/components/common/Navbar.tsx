import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from './BrandLogo';
import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout, isResolver } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const homeNavigationTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (homeNavigationTimer.current !== null) {
      window.clearTimeout(homeNavigationTimer.current);
    }

    const navigateHome = () => {
      navigate('/');
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    if (window.scrollY <= 2) {
      navigateHome();
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    homeNavigationTimer.current = window.setTimeout(navigateHome, 320);
  };



  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Security', path: '/security' },
    ...(user
      ? [
          {
            label: isResolver ? 'Resolver Portal' : 'Student Portal',
            path: isResolver ? '/resolver/dashboard' : '/student/dashboard',
          },
        ]
      : [
          { label: 'Student Login', path: '/student/login' },
          { label: 'Resolver Login', path: '/resolver/login' },
        ]),
  ];

  return (
    <header className="site-navbar sticky top-0 z-40 flex h-20 items-center justify-between px-6 sm:px-12 backdrop-blur-xl border-b transition-colors">
      <div className="flex items-center gap-6">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 lg:hidden transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <Link
          to="/"
          onClick={handleLogoClick}
          aria-label="CampusFix Home"
          title="CampusFix Home"
          className="flex items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff3b00] group"
        >
          <BrandLogo />
        </Link>
      </div>

      {/* Center Nav Links (Matching reference) */}
      <nav className="hidden lg:flex items-center gap-8 text-xs font-medium text-slate-700 dark:text-slate-300">
        {navLinks.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative py-1 tracking-tight transition-colors hover:text-black dark:hover:text-white ${
                isActive ? 'text-black dark:text-white font-bold' : ''
              }`}
            >
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#ff3b00] shadow-[0_0_6px_#ff3b00]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell (Only when logged in) */}
        {user && <NotificationDropdown />}



        {/* Account or Sign in pill */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 py-1.5 pl-2 pr-3.5 rounded-full border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md transition-all text-left"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#d61800] to-[#ff6600] text-white font-bold text-[11px] shadow-sm">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-black dark:text-white leading-tight">
                  {user.name.split(' ')[0]}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">{user.userId}</p>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800">
                    <p className="text-xs font-bold text-black dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {user.userId} • {user.role}
                    </p>
                  </div>

                  <Link
                    to={isResolver ? '/resolver/profile' : '/student/profile'}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile & Credentials
                  </Link>

                  <Link
                    to={isResolver ? '/resolver/settings' : '/student/settings'}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Settings
                  </Link>

                  <div className="border-t border-slate-100 dark:border-zinc-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <Link
              to="/student/login"
              className="px-5 py-2.5 rounded-full border border-black dark:border-white text-xs font-semibold text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
            >
              Sign in
            </Link>
            <Link
              to="/student/report"
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:opacity-90 shadow-md transition-all group"
            >
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00] group-hover:scale-125 transition-transform" />
              <span>Report Issue</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
