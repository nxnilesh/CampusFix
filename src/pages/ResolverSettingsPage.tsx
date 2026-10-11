import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { LoginActivityPanel } from '../components/common/LoginActivityPanel';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Sliders,
  CheckCircle2,
  Save,
  Loader2,
} from 'lucide-react';

export const ResolverSettingsPage: React.FC = () => {
  const {
    compactMode,
    setCompactMode,
    hasStoredCompactPreference,
  } = useTheme();
  const { success, error } = useToast();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [statusAlerts, setStatusAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.getSettings();
        if (res) {
          if (res.compactMode !== undefined && !hasStoredCompactPreference) {
            setCompactMode(res.compactMode);
          }
          if (res.emailNotifications !== undefined) setEmailNotifications(res.emailNotifications);
          if (res.statusAlerts !== undefined) setStatusAlerts(res.statusAlerts);
        }
      } catch (err) {
        console.error('Settings load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [hasStoredCompactPreference, setCompactMode]);

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await api.updateSettings({
        compactMode,
        emailNotifications,
        statusAlerts,
      });
      success('Staff preferences saved.');
    } catch (err: any) {
      error(err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Resolver Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Tailor your administrative dashboard display density and notifications.
        </p>
      </div>



      {/* Density & Layout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Workspace Display Density</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimize data visibility for high-volume issue review.
          </p>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Compact Table Mode
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Reduces padding on all campus issues tables so more tickets fit on-screen.
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Dispatch & Alert Preferences</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose what alerts prompt staff notifications.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                High-Priority Issue Alerts
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Receive instant notifications when safety hazards or urgent repairs are reported.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={statusAlerts}
                onChange={(e) => setStatusAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Daily Facilities Digest Email
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Receive an automated morning summary of outstanding tickets and resolution stats.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
      <LoginActivityPanel />
    </div>
  );
};
