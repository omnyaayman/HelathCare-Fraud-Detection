
import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  Mail,
  Search,
  Filter,
  Archive,
  Trash2,
  Settings,
} from "lucide-react";
import api from '../api';
import Skeleton from '../components/Skeleton';

const categoryFilters = [
  { id: "all", label: "All", icon: Bell },
  { id: "critical", label: "Critical", icon: AlertTriangle },
  { id: "fraud", label: "Fraud", icon: ShieldAlert },
  { id: "system", label: "System", icon: Info },
  { id: "policy", label: "Policy", icon: CheckCircle },
];

const severityColors = {
  critical:
    "border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500/50",
  warning:
    "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-500/50",
  info: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500/50",
  success:
    "border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-500/50",
};

const severityIconColors = {
  critical: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
  success: "text-green-600 dark:text-green-400",
};

const getSeverityIcon = (type) => {
  switch (type) {
    case "critical":
      return AlertTriangle;
    case "warning":
      return AlertTriangle;
    case "info":
      return Info;
    case "success":
      return CheckCircle;
    default:
      return Bell;
  }
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      // Map API response to our notification format
      const mapped = res.map((item, idx) => ({
        id: item.id || idx,
        title: item.title,
        description: item.message,
        type: item.type === 'high_risk' ? 'critical' : item.type || 'info',
        category: item.type || 'system',
        timestamp: item.created_at || new Date().toISOString(),
        read: item.read,
        actions: [],
      }));
      setNotifications(mapped);
      setFilteredNotifications(mapped);
    } catch (err) {
      console.error(err);
      setNotifications([]);
      setFilteredNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    let result = [...notifications];

    if (filter !== "all") {
      if (filter === "critical") {
        result = result.filter((n) => n.type === "critical");
      } else {
        result = result.filter((n) => n.category === filter);
      }
    }

    if (searchQuery) {
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotifications(result);
  }, [filter, searchQuery, notifications]);

  const markAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const archiveAll = () => {
    setFilteredNotifications([]);
  };

  const markAsRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = (id) => {
    setFilteredNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = filteredNotifications.filter((n) => !n.read).length;

  if (loading) {
    return <Skeleton rows={8} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Notification Center
          </h1>
          <p className="text-sm text-slate-500">
            Manage all alerts, fraud warnings, and system notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <CheckCircle size={16} />
            Mark All Read
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
            <Settings size={16} />
            Preferences
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Filter by Category
              </h3>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {categoryFilters.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilter(cat.id)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                      filter === cat.id
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={16}
                        className={
                          filter === cat.id
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />
                      <span>{cat.label}</span>
                    </div>
                    {cat.id === "all" && unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {filteredNotifications.length} notifications
            </p>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                <Filter size={14} />
                Sort
              </button>
              <button
                onClick={archiveAll}
                className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Archive size={14} />
                Archive All
              </button>
            </div>
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <Bell className="h-12 w-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                No notifications
              </h3>
              <p className="text-sm text-slate-500">
                You're all caught up! No new notifications at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const Icon = getSeverityIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-slate-900 rounded-xl border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow ${
                      severityColors[notification.type]
                    } ${!notification.read ? "ring-1 ring-blue-500/20" : ""}`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full bg-white dark:bg-slate-800 shadow-sm ${
                          severityIconColors[notification.type]
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4
                                className={`font-semibold text-slate-900 dark:text-white ${
                                  !notification.read ? "font-bold" : ""
                                }`}
                              >
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {notification.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              title="Mark as read"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Mail size={12} />
                            <span>Email sent to investigators</span>
                            <span className="mx-2 h-1 w-1 rounded-full bg-slate-300"></span>
                            <span>{formatTime(notification.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {notification.actions.map((action, idx) => (
                              <button
                                key={idx}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                              >
                                {action}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

