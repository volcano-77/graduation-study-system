import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Clock3,
  Database,
  Server,
  ShieldAlert,
  Users
} from 'lucide-react';
import { API_BASE_URL } from '../api/client';

function formatRelativeTime(timestamp) {
  const timeValue = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  if (Number.isNaN(timeValue)) {
    return '--';
  }

  const diff = Date.now() - timeValue;
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} 分钟前`;
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} 小时前`;
  }
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))} 天前`;
}

function buildActivityTitle(item) {
  if (item?.type === 'group_create') {
    return `小组 ${item.group_name || '未命名小组'} 被创建`;
  }
  return `用户 ${item?.username || '未知用户'} 注册了新账号`;
}

function AdminOverview() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGroups: 0,
    totalTasks: 0,
    totalFiles: 0
  });
  const [topGroups, setTopGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [statsResponse, activeGroupsResponse, activitiesResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/stats`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/active-groups`, { headers }),
          axios.get(`${API_BASE_URL}/api/admin/activities`, { headers })
        ]);

        const statsData = statsResponse?.data || {};
        const activeGroupsData = activeGroupsResponse?.data || {};
        const activitiesData = activitiesResponse?.data || {};

        if (!statsData.success || !statsData.stats) {
          throw new Error(statsData.message || '获取统计数据失败');
        }
        setStats({
          totalUsers: Number(statsData.stats.totalUsers) || 0,
          totalGroups: Number(statsData.stats.totalGroups) || 0,
          totalTasks: Number(statsData.stats.totalTasks) || 0,
          totalFiles: Number(statsData.stats.totalFiles) || 0
        });

        if (!activeGroupsData.success || !Array.isArray(activeGroupsData.groups)) {
          throw new Error(activeGroupsData.message || '获取活跃小组排行失败');
        }
        setTopGroups(activeGroupsData.groups);

        if (!activitiesData.success || !Array.isArray(activitiesData.activities)) {
          throw new Error(activitiesData.message || '获取平台动态失败');
        }
        setActivities(activitiesData.activities);
      } catch (requestError) {
        const fallbackMessage = '获取后台数据失败';
        setTopGroups([]);
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            fallbackMessage
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const cards = [
    {
      key: 'users',
      label: '全站总用户数',
      value: stats.totalUsers,
      icon: Users,
      route: '/admin/users',
      shell: 'from-[#F2F7F1] to-[#FAFCF8]',
      iconBg: 'bg-[#E2EBDD]',
      iconColor: 'text-[#5C7058]',
      valueColor: 'text-[#4B5E47]'
    },
    {
      key: 'groups',
      label: '全站总小组数',
      value: stats.totalGroups,
      icon: ShieldAlert,
      route: '/admin/groups',
      shell: 'from-[#F4F2F8] to-[#FBFAFD]',
      iconBg: 'bg-[#E9E3F4]',
      iconColor: 'text-[#6E5D85]',
      valueColor: 'text-[#5A4D71]'
    },
    {
      key: 'tasks',
      label: '全站总任务数',
      value: stats.totalTasks,
      icon: BarChart3,
      route: '/admin/tasks',
      shell: 'from-[#FBF8EE] to-[#FEFCF6]',
      iconBg: 'bg-[#F2EBD9]',
      iconColor: 'text-[#8A6F3D]',
      valueColor: 'text-[#6F572E]'
    },
    {
      key: 'files',
      label: '全站总资料数',
      value: stats.totalFiles,
      icon: Database,
      route: '/admin/files',
      shell: 'from-[#EFF4F7] to-[#F9FBFD]',
      iconBg: 'bg-[#DEE7EC]',
      iconColor: 'text-[#55707A]',
      valueColor: 'text-[#405861]'
    }
  ];
  const leaderboardData = topGroups.slice(0, 10);
  const maxScore = leaderboardData.reduce((max, group) => {
    const currentScore = Number(group.score ?? group.task_count) || 0;
    return currentScore > max ? currentScore : max;
  }, 0);

  const getRankBadgeClassName = (index) => {
    if (index === 0) {
      return 'bg-yellow-400 text-white';
    }
    if (index === 1) {
      return 'bg-slate-300 text-white';
    }
    if (index === 2) {
      return 'bg-orange-400 text-white';
    }
    return 'bg-slate-100 text-slate-500';
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#EEF2F6] p-6 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">数据大盘</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#edf3fb_0%,#f7f9fc_46%,#eef2f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-[#D7E0EC] bg-[#9BB098] px-6 py-6 md:px-8">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-20 left-8 h-48 w-48 rounded-full bg-[#CFE0CC]/45 blur-2xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-wide">平台数据中枢</h1>
              <p className="mt-2 text-sm text-[#ECF5E9]">实时掌控全站规模、资源负载与平台动态。</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-[#F3F8F2]">
              <Server className="h-4 w-4" />
              <span>系统运行稳定</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;
            const isClickable = Boolean(card.route);
            return (
              <article
                key={card.key}
                className={`bg-gradient-to-br ${card.shell} rounded-2xl border border-[#DCE5F0] p-5 shadow-[0_10px_24px_rgba(30,41,59,0.08)] ${
                  isClickable ? 'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg' : ''
                }`}
                onClick={isClickable ? () => navigate(card.route) : undefined}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#64748B]">{card.label}</p>
                    <p className={`mt-2 text-3xl font-semibold ${card.valueColor}`}>{loading ? '--' : card.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
          <article className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F2937]">全站活跃星锐榜 (Top 10)</h2>
              <button
                type="button"
                onClick={() => navigate('/admin/all-group-rankings')}
                className="text-sm text-slate-400 hover:text-[#9BB098] transition-colors"
              >
                查看更多
              </button>
            </div>
            <div className="mt-5 space-y-3 max-h-[380px] overflow-y-auto pr-2">
              {loading ? (
                <div className="py-3 text-sm text-slate-500">正在加载榜单...</div>
              ) : null}
              {!loading && leaderboardData.length === 0 ? (
                <div className="py-3 text-sm text-slate-500">暂无可展示的小组数据</div>
              ) : null}
              {!loading
                ? leaderboardData.map((group, index) => {
                    const score = Number(group.score) || 0;
                    const groupName = group.name || group.group_name || '未命名小组';
                    const widthPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    return (
                      <div
                        key={group.id ?? `${groupName}-${index}`}
                        onClick={() => navigate('/admin/groups')}
                        className="group cursor-pointer hover:bg-slate-50 rounded-xl transition-all duration-300 p-2 -mx-2 flex items-center gap-3"
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getRankBadgeClassName(index)}`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-slate-700 truncate">{groupName}</span>
                            <span className="text-xs text-slate-500 shrink-0">{score} 🔥</span>
                          </div>
                          <div className="mt-2 h-2.5 rounded-full bg-slate-50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#9BB098] transition-all duration-500 group-hover:brightness-105"
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                : null}
            </div>
          </article>

          <article className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1F2937]">最新平台动态</h2>
              <span className="text-xs px-2 py-1 rounded-full bg-[#EDF7EE] text-[#3F7D47]">Activity Log</span>
            </div>
            <div className="mt-5 relative pl-6">
              <div className="absolute left-[9px] top-1 bottom-1 w-px bg-[#DDE5F0]" />
              <div className="space-y-4">
                {!loading && activities.length === 0 ? (
                  <div className="rounded-xl border border-[#E8EDF5] bg-[#FBFCFE] px-3 py-3 text-sm text-[#64748B]">
                    暂无最新动态
                  </div>
                ) : null}
                {activities.map((item) => {
                  const isGroupCreate = item.type === 'group_create';
                  const iconShell = isGroupCreate
                    ? 'bg-green-50 text-[#9BB098]'
                    : 'bg-slate-100 text-slate-500';
                  const pointShell = isGroupCreate
                    ? 'bg-[#9BB098] shadow-[0_0_0_3px_#EEF6EC]'
                    : 'bg-slate-400 shadow-[0_0_0_3px_#F1F5F9]';
                  const ItemIcon = isGroupCreate ? ShieldAlert : Users;

                  return (
                    <div key={item.id || `${item.type}-${item.created_at}`} className="relative">
                      <span className={`absolute -left-[22px] top-1.5 h-3 w-3 rounded-full ${pointShell}`} />
                      <div className="rounded-xl border border-[#E8EDF5] bg-[#FBFCFE] px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconShell}`}>
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-[#1F2937]">{buildActivityTitle(item)}</p>
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#6B7280]">
                              <Clock3 className="h-3.5 w-3.5" />
                              <span>{formatRelativeTime(item.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </section>

        {error ? (
          <div className="rounded-xl border border-[#F5C2C7] bg-[#FDECEC] text-[#9B1C1C] px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AdminOverview;
