import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ListTodo, Search } from 'lucide-react';
import apiClient from '../api/client';

const STATUS_ORDER = ['待处理', '进行中', '已完成'];

function GlobalTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchTasks = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get('/api/global/tasks');
        if (!data.success) {
          throw new Error(data.message || '获取全局任务失败');
        }

        if (mounted) {
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        }
      } catch (requestError) {
        if (mounted) {
          setTasks([]);
          setError(requestError.message || '获取全局任务失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTasks();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return tasks;
    }
    return tasks.filter((task) => {
      const content = (task.content || '').toLowerCase();
      const groupName = (task.group_name || '').toLowerCase();
      return content.includes(normalizedSearch) || groupName.includes(normalizedSearch);
    });
  }, [tasks, searchTerm]);

  const groupedTasks = useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      acc[status] = filteredTasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [filteredTasks]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#f0f6e8_0%,#f9f8f6_45%,#f9f8f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white/85 backdrop-blur rounded-3xl border border-[#E8E7E4] p-6 md:p-8 shadow-[0_14px_30px_rgba(20,20,20,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                返回学习空间
              </button>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-gray-800">全局任务中心</h1>
              <p className="text-sm text-gray-500 mt-1">聚合你参与的所有小组任务。</p>
            </div>
            <div className="w-full md:w-auto space-y-3">
              <div className="px-4 py-3 rounded-xl bg-[#F4F7EF] border border-[#E4E9DA] text-right">
                <div className="text-xs text-gray-500">任务总数</div>
                <div className="text-xl font-semibold text-[#6F8F5D]">{tasks.length}</div>
              </div>
              <div className="relative w-full md:w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜索任务内容或小组..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? <div className="bg-white rounded-2xl p-8 text-center text-gray-500">加载中...</div> : null}
        {!loading && error ? <div className="text-sm text-red-500">{error}</div> : null}

        {!loading && !error ? (
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {STATUS_ORDER.map((status) => (
              <article key={status} className="rounded-2xl border border-[#ECEBE8] bg-white p-4 shadow-sm min-h-[320px]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium text-gray-700">{status}</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#F1F3ED] text-gray-600">
                    {(groupedTasks[status] || []).length}
                  </span>
                </div>

                <div className="space-y-2">
                  {(groupedTasks[status] || []).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => navigate(`/groups/${task.group_id}`)}
                      className="w-full text-left rounded-xl border border-[#ECEBE8] bg-[#FCFCFB] p-3 hover:border-[#D9E1CE] hover:bg-[#F9FBF6] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-gray-700 break-words">{task.content}</p>
                        <ListTodo className="h-4 w-4 text-gray-400 shrink-0" />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">{task.group_name || `小组 #${task.group_id}`}</p>
                    </button>
                  ))}

                  {(groupedTasks[status] || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#DFE3D8] bg-[#FBFCF9] px-3 py-5 text-center text-xs text-gray-400">
                      暂无任务
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default GlobalTasks;
