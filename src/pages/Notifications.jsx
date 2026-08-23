import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, Check, Clock3, Trash2, X } from 'lucide-react';
import apiClient from '../api/client';
import { getNotificationBadgeCount } from '../utils/notifications';

function formatNotificationTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusLabel(status) {
  if (status === 'accepted') {
    return '已同意';
  }
  if (status === 'rejected') {
    return '已拒绝';
  }
  return '待处理';
}

function getStatusClassName(status) {
  if (status === 'accepted') {
    return 'bg-[#E8F4E6] text-[#50753F]';
  }
  if (status === 'rejected') {
    return 'bg-[#FBECEC] text-[#A04A4A]';
  }
  return 'bg-[#F7F2E6] text-[#9A7A34]';
}

function getUserAvatarText(username) {
  const name = typeof username === 'string' ? username.trim() : '';
  return name ? name.charAt(0).toUpperCase() : '?';
}

function isPendingInvite(item) {
  return item?.type === 'invite' && item?.status === 'pending';
}

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actingNotificationId, setActingNotificationId] = useState(null);

  const unreadCount = useMemo(() => {
    return getNotificationBadgeCount(notifications);
  }, [notifications]);

  const emitNotificationUpdate = (rows) => {
    const count = getNotificationBadgeCount(rows);
    window.dispatchEvent(
      new CustomEvent('notifications-updated', { detail: { unreadCount: count } })
    );
  };

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.put('/api/notifications/mark-read', {});
      window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { unreadCount: 0 } }));
    } catch (requestError) {
      // 静默失败，避免影响消息列表展示
    }
  }, []);

  const fetchNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const data = await apiClient.get('/api/notifications');
      const rows = data?.success && Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(rows);
      emitNotificationUpdate(rows);
    } catch (requestError) {
      setNotifications([]);
      if (!silent) {
        setError(requestError.message || '加载消息失败');
      }
      emitNotificationUpdate([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      await markAllAsRead();
      await fetchNotifications();
    };

    initializePage();

    const pollTimer = window.setInterval(() => {
      fetchNotifications({ silent: true });
    }, 3000);

    return () => {
      window.clearInterval(pollTimer);
    };
  }, [fetchNotifications, markAllAsRead]);

  const handleRespond = async (notificationId, action) => {
    if (!Number.isInteger(Number(notificationId))) {
      return;
    }

    setActingNotificationId(notificationId);
    setError('');

    try {
      const data = await apiClient.post(`/api/notifications/${notificationId}/respond`, { action });
      if (!data.success) {
        throw new Error(data.message || '处理邀请失败');
      }
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.message || '处理邀请失败');
    } finally {
      setActingNotificationId(null);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!Number.isInteger(Number(notificationId))) {
      return;
    }

    setActingNotificationId(notificationId);
    setError('');

    try {
      const data = await apiClient.delete(`/api/notifications/${notificationId}`);
      if (!data?.success) {
        throw new Error(data?.message || '删除消息失败');
      }

      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.message || '删除消息失败');
    } finally {
      setActingNotificationId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,#edf5ea_0%,#f8f8f6_45%,#f8f8f6_100%)] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="rounded-3xl border border-[#E7E8E2] bg-white/90 backdrop-blur p-6 md:p-8 shadow-[0_14px_32px_rgba(15,15,15,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 flex items-center gap-3">
                <Bell className="h-6 w-6 text-[#6F8F5D]" />
                <span>消息通知</span>
              </h1>
              <p className="text-sm text-gray-500">处理小组邀请与系统协作提醒。</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#F4F8EE] border border-[#E1E8D6] px-4 py-2.5">
              <Clock3 className="h-4 w-4 text-[#6F8F5D]" />
              <span className="text-sm text-gray-600">未读消息：{unreadCount}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#ECEBE8] bg-white p-5 md:p-6 shadow-sm">
          {loading ? <div className="text-sm text-gray-500">消息加载中...</div> : null}
          {!loading && error ? <div className="text-sm text-red-500">{error}</div> : null}

          {!loading && !error && notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DFE3D8] bg-[#FBFCF9] px-4 py-7 text-center text-sm text-gray-400">
              当前没有通知消息。
            </div>
          ) : null}

          {!loading && !error && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((item) => {
                const pendingInvite = isPendingInvite(item);
                const acting = actingNotificationId === item.id;
                const messageText =
                  typeof item.message === 'string' && item.message.trim()
                    ? item.message.trim()
                    : `${item.sender_username || '系统'} 给你发送了一条通知`;

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#ECEBE8] bg-[#FCFCFB] p-4 md:p-5 space-y-3 transition-colors duration-300 hover:bg-slate-50"
                  >
                    {pendingInvite ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.sender_avatar ? (
                            <img
                              src={item.sender_avatar}
                              alt="发送者头像"
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#A3B18A] text-white flex items-center justify-center font-medium">
                              {getUserAvatarText(item.sender_username)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {item.sender_username || '未知用户'} 邀请你加入小组
                            </div>
                            <div className="text-sm text-[#6F8F5D] truncate">
                              {item.group_name || `小组 #${item.group_id}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusClassName(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleDeleteNotification(item.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-[#B44A4A] hover:bg-[#FBECEC] disabled:opacity-60 transition-colors"
                            title="删除消息"
                            aria-label="删除消息"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{messageText}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusClassName(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleDeleteNotification(item.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-[#B44A4A] hover:bg-[#FBECEC] disabled:opacity-60 transition-colors"
                            title="删除消息"
                            aria-label="删除消息"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="text-xs text-gray-400">接收时间：{formatNotificationTime(item.created_at)}</div>
                      {pendingInvite ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleRespond(item.id, 'accept')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#6F8F5D] text-white hover:bg-[#5E7A4E] disabled:opacity-60 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            同意
                          </button>
                          <button
                            type="button"
                            disabled={acting}
                            onClick={() => handleRespond(item.id, 'reject')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F7ECEC] text-[#A44A4A] hover:bg-[#F4DDDD] disabled:opacity-60 transition-colors"
                          >
                            <X className="h-4 w-4" />
                            拒绝
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">系统消息</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default Notifications;
