import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ListTodo, CheckCircle2, ArrowRight, ExternalLink, Clock3 } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import apiClient, { API_BASE_URL } from '../api/client';

const EMPTY_TASK_COUNTS = {
  pending: 0,
  inProgress: 0,
  completed: 0,
  total: 0
};

const EMPTY_DASHBOARD = {
  groupCount: 0,
  taskCounts: EMPTY_TASK_COUNTS
};

const STATUS_COLOR_MAP = {
  pending: '#FEF3C7',
  inProgress: '#F9A8D4',
  completed: '#86EFAC'
};

function normalizeTaskStatus(status) {
  const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (value === '待处理' || value === 'pending' || value === 'todo') {
    return 'pending';
  }
  if (value === '进行中' || value === 'inprogress' || value === 'in_progress' || value === 'doing') {
    return 'inProgress';
  }
  if (value === '已完成' || value === 'completed' || value === 'done') {
    return 'completed';
  }
  return null;
}

function buildTaskCounts(tasks) {
  return tasks.reduce(
    (acc, task) => {
      const statusKey = normalizeTaskStatus(task?.status);
      if (statusKey) {
        acc[statusKey] += 1;
      }
      acc.total += 1;
      return acc;
    },
    { ...EMPTY_TASK_COUNTS }
  );
}

function TechTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const item = payload[0];
  const title = item?.payload?.name || label || '数据项';
  const value = Number(item?.value) || 0;

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-xl border border-gray-100 p-3 min-w-[100px]">
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-sm font-medium text-gray-700">{value} 项</p>
    </div>
  );
}

function resolveFileUrl(fileUrl) {
  const normalized = typeof fileUrl === 'string' ? fileUrl.trim() : '';
  if (!normalized) {
    return '';
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  if (normalized.startsWith('/')) {
    return `${API_BASE_URL}${normalized}`;
  }
  return `${API_BASE_URL}/${normalized}`;
}

function formatRecentTime(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('同学');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(EMPTY_DASHBOARD);
  const [groups, setGroups] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(-1);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        return;
      }

      const user = JSON.parse(userStr);
      if (user?.username) {
        setUsername(user.username);
      }
    } catch (parseError) {
      console.error('读取用户信息失败:', parseError);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');

      const [statsRes, groupsRes, tasksRes, recentFilesRes] = await Promise.allSettled([
        apiClient.get('/api/dashboard/stats'),
        apiClient.get('/api/groups'),
        apiClient.get('/api/global/tasks'),
        apiClient.get('/api/files/recent')
      ]);

      if (!mounted) {
        return;
      }

      const statsPayload =
        statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value?.stats
          ? statsRes.value.stats
          : null;
      const groupsPayload =
        groupsRes.status === 'fulfilled' && groupsRes.value?.success && Array.isArray(groupsRes.value.groups)
          ? groupsRes.value.groups
          : [];
      const tasksPayload =
        tasksRes.status === 'fulfilled' && tasksRes.value?.success && Array.isArray(tasksRes.value.tasks)
          ? tasksRes.value.tasks
          : [];
      const recentFilesPayload =
        recentFilesRes.status === 'fulfilled' &&
        recentFilesRes.value?.success &&
        Array.isArray(recentFilesRes.value.files)
          ? recentFilesRes.value.files
          : [];

      const taskCountsFromStats = {
        pending: Number(statsPayload?.taskCounts?.pending) || 0,
        inProgress: Number(statsPayload?.taskCounts?.inProgress) || 0,
        completed: Number(statsPayload?.taskCounts?.completed) || 0,
        total: Number(statsPayload?.taskCounts?.total) || 0
      };

      const taskCountsFromTasks = buildTaskCounts(tasksPayload);
      const shouldUseTaskList = tasksRes.status === 'fulfilled' && tasksRes.value?.success;
      const finalTaskCounts = shouldUseTaskList ? taskCountsFromTasks : taskCountsFromStats;
      if (!finalTaskCounts.total) {
        finalTaskCounts.total =
          finalTaskCounts.pending + finalTaskCounts.inProgress + finalTaskCounts.completed;
      }

      const finalGroupCount =
        groupsRes.status === 'fulfilled' && groupsRes.value?.success
          ? groupsPayload.length
          : Number(statsPayload?.groupCount) || 0;

      setGroups(groupsPayload);
      setTasks(tasksPayload);
      setRecentFiles(recentFilesPayload);
      setStats({
        groupCount: finalGroupCount,
        taskCounts: finalTaskCounts
      });

      const failCount = [statsRes, groupsRes, tasksRes, recentFilesRes].filter(
        (item) => item.status === 'rejected'
      ).length;
      if (failCount === 4) {
        setError('看板数据加载失败，请稍后重试。');
      } else if (failCount > 0) {
        setError('部分数据加载失败，已展示可用内容。');
      }

      setLoading(false);
    };

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const donutData = useMemo(
    () => [
      { name: '待处理', value: stats.taskCounts.pending, color: STATUS_COLOR_MAP.pending },
      { name: '进行中', value: stats.taskCounts.inProgress, color: STATUS_COLOR_MAP.inProgress },
      { name: '已完成', value: stats.taskCounts.completed, color: STATUS_COLOR_MAP.completed }
    ],
    [stats.taskCounts.completed, stats.taskCounts.inProgress, stats.taskCounts.pending]
  );

  const statCards = [
    {
      key: 'group',
      title: '我的小组数',
      value: stats.groupCount,
      hint: '当前账号名下小组',
      icon: Users,
      color: 'from-[#F6FBF1] to-[#E9F4DA]',
      iconColor: 'text-[#7A9A58]',
      path: '/groups'
    },
    {
      key: 'pending',
      title: '待处理任务数',
      value: stats.taskCounts.pending,
      hint: '需要优先推进',
      icon: ListTodo,
      color: 'from-[#FFF8EE] to-[#FFE8CC]',
      iconColor: 'text-[#C67A2B]',
      path: '/global-tasks'
    },
    {
      key: 'inProgress',
      title: '进行中任务数',
      value: stats.taskCounts.inProgress,
      hint: '当前执行中的任务',
      icon: Clock3,
      color: 'from-[#EEF4FF] to-[#DEE9FF]',
      iconColor: 'text-[#4B6CB7]',
      path: '/global-tasks'
    },
    {
      key: 'completed',
      title: '已完成任务数',
      value: stats.taskCounts.completed,
      hint: '累计完成成果',
      icon: CheckCircle2,
      color: 'from-[#EEF8FF] to-[#DDEFFF]',
      iconColor: 'text-[#2C6FB3]',
      path: '/global-tasks'
    }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,#eaf4ff_0%,#f5f8fc_42%,#f8fafc_100%)] p-6 md:p-10 outline-none focus:outline-none focus-visible:outline-none">
      <div className="max-w-7xl mx-auto">
        <section className="bg-white/85 backdrop-blur rounded-3xl border border-[#E8EDF5] p-6 md:p-8 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">学习空间总览</h1>
              <p className="mt-2 text-sm text-gray-500">{username}，这里是你的协作看板实时快照。</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/groups')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9BB098] hover:bg-[#8A9F87] text-white transition-colors duration-200"
            >
              查看全部小组
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {loading ? (
          <div className="mt-6 bg-white rounded-2xl p-10 text-center text-gray-500 shadow-sm">看板加载中...</div>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
              {statCards.map((card) => {
                const Icon = card.icon;
                const isTaskCard = card.key !== 'group';
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => navigate(card.path)}
                    className={`bg-gradient-to-br ${card.color} rounded-2xl p-5 border border-white/70 shadow-[0_10px_24px_rgba(20,20,20,0.04)] text-left transition-all duration-300 ${
                      isTaskCard
                        ? 'cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all duration-300'
                        : 'cursor-pointer hover:scale-[1.04] hover:-translate-y-1 hover:brightness-105 hover:shadow-[0_18px_30px_rgba(20,20,20,0.09)]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{card.title}</p>
                        <p className="text-3xl font-semibold text-gray-800 mt-2">{card.value}</p>
                        <p className="text-xs text-gray-500 mt-2">{card.hint}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <article className="bg-white rounded-2xl shadow-sm p-6 border border-[#ECF0F6]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">任务状态分布</h2>
                  <span className="text-sm text-gray-500">总任务 {stats.taskCounts.total}</span>
                </div>
                {stats.taskCounts.total === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-gray-500 bg-[#F8FAFF] rounded-xl">
                    暂无任务数据
                  </div>
                ) : (
                  <div
                    className="h-80 w-full min-w-0 outline-none focus:outline-none focus-visible:outline-none [&_.recharts-wrapper]:!outline-none [&_.recharts-surface]:!outline-none [&_*:focus]:!outline-none"
                    style={{ outline: 'none' }}
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      className="outline-none focus:outline-none focus-visible:outline-none"
                      style={{ outline: 'none' }}
                    >
                      <PieChart style={{ outline: 'none' }}>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          stroke="none"
                          cursor="pointer"
                          onMouseLeave={() => setActivePieIndex(-1)}
                          onMouseEnter={(_entry, index) => setActivePieIndex(index)}
                          style={{ outline: 'none' }}
                        >
                          {donutData.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={item.color}
                              stroke="none"
                              fillOpacity={activePieIndex === index || activePieIndex === -1 ? 1 : 0.55}
                              style={{ cursor: 'pointer', transition: 'all 160ms ease', outline: 'none' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<TechTooltip />}
                          contentStyle={{ padding: 0, background: 'transparent', border: 'none' }}
                          wrapperStyle={{ outline: 'none' }}
                        />
                        <Legend verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>

              <article className="bg-white rounded-2xl shadow-sm p-6 border border-[#ECF0F6]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">最新资料速递</h2>
                  <button
                    type="button"
                    onClick={() => navigate('/all-files')}
                    className="text-sm text-slate-400 hover:text-[#9BB098] transition-colors"
                  >
                    查看更多
                  </button>
                </div>
                {recentFiles.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-slate-500 bg-[#F8FAFF] rounded-xl">
                    暂无共享资料
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {recentFiles.map((file) => {
                        const fileUrl = resolveFileUrl(file.file_url);
                        return (
                          <a
                            key={file.id}
                            href={fileUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-200 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {file.file_name || '未命名文件'}
                              </p>
                              <div className="mt-1 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#9BB098] text-white text-xs">
                                  {file.group_name || '未命名小组'}
                                </span>
                                <span className="text-xs text-slate-400">{file.username || '未知上传者'}</span>
                                <span className="text-xs text-slate-400">{formatRecentTime(file.created_at)}</span>
                              </div>
                            </div>
                            <span className="shrink-0 text-slate-400">
                              <ExternalLink className="h-4 w-4" />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            </section>

            {error ? <div className="mt-4 text-sm text-amber-600">{error}</div> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
