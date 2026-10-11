import React, { useEffect, useState } from 'react';
import { Clock3, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { api } from '../../lib/api';
import { LoginActivityItem } from '../../types';

type LoginDetails = {
  device?: {
    type?: string;
    userAgent?: string;
  };
};

function parseDetails(details: string | null): LoginDetails {
  if (!details) return {};
  try {
    return JSON.parse(details) as LoginDetails;
  } catch {
    return {};
  }
}

export const LoginActivityPanel: React.FC = () => {
  const [activity, setActivity] = useState<LoginActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLoginActivity()
      .then(setActivity)
      .catch((error) => console.error('Login activity load error:', error))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock3 className="w-4 h-4 text-blue-600" />
          <span>Recent Login Activity</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review recent sign-ins to your CampusFix account.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-5">
          <Loader2 className="w-5 h-5 text-[#ff3b00] animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activity.map((entry) => {
            const device = parseDetails(entry.details).device;
            const DeviceIcon = device?.type === 'Mobile'
              ? Smartphone
              : device?.type === 'Tablet'
              ? Tablet
              : Monitor;
            return (
              <div key={entry.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <DeviceIcon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {device?.type || 'Device'} sign-in
                  </p>
                  {device?.userAgent && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 break-words">
                      {device.userAgent}
                    </p>
                  )}
                </div>
                <time className="text-[10px] text-slate-400 font-mono text-right shrink-0">
                  {new Date(entry.createdAt).toLocaleString()}
                </time>
              </div>
            );
          })}
          {activity.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">No login activity yet.</p>
          )}
        </div>
      )}
    </section>
  );
};
