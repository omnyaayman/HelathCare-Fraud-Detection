
import { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, XCircle, Info, ShieldAlert, Trash2 } from 'lucide-react';

const mockNotifications = [
  { id: 1, type: 'alert', title: 'High Risk Claim Detected', message: 'Claim #5678 has a fraud score of 92%', timestamp: '5 minutes ago', read: false },
  { id: 2, type: 'success', title: 'Model Training Complete', message: 'Fraud detection model v2.1 successfully trained and deployed', timestamp: '1 hour ago', read: false },
  { id: 3, type: 'warning', title: 'Provider Anomaly', message: 'Provider #123 showing unusual billing patterns', timestamp: '2 hours ago', read: true },
  { id: 4, type: 'info', title: 'System Update', message: 'Scheduled maintenance on July 20th 2024', timestamp: '1 day ago', read: true },
  { id: 5, type: 'alert', title: 'Duplicate Claims Found', message: '3 potential duplicate claim submissions detected', timestamp: '2 days ago', read: true },
];

const typeConfig = {
  alert: { icon: ShieldAlert, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
  success: { icon: CheckCircle, bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  info: { icon: Info, bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-primary">
            <Bell size={14} />
            Alerts Center
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-textPrimary">Notifications</h1>
          <p className="mt-2 text-sm text-textSecondary">Stay updated with critical system events</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-bold text-textPrimary hover:border-primary/40 hover:bg-primary/5"
          >
            <CheckCircle size={16} />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h3 className="text-sm font-black text-textPrimary">Recent Notifications</h3>
          <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black text-white">{unreadCount} Unread</span>
        </div>
        <div className="mt-6 space-y-4">
          {notifications.map((notification) => {
            const config = typeConfig[notification.type];
            const Icon = config.icon;
            return (
              <div
                key={notification.id}
                className={`group flex items-start gap-4 rounded-2xl border p-4 transition-all duration-200 ${
                  notification.read ? 'border-border bg-bg/30' : `${config.border} bg-surface shadow-sm`
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} ${config.text}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-textPrimary">{notification.title}</h4>
                      <p className="mt-1 text-xs text-textSecondary">{notification.message}</p>
                      <p className="mt-2 text-[11px] text-textSecondary/70">{notification.timestamp}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20"
                          title="Mark as read"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="rounded-lg bg-danger/10 p-2 text-danger hover:bg-danger/20"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
                {!notification.read && (
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

