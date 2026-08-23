import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

function AllGroupRankings() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAllRankings = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE_URL}/api/admin/active-groups/all`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        const data = response?.data || {};
        if (!data.success || !Array.isArray(data.groups)) {
          throw new Error(data.message || '获取全量活跃榜失败');
        }

        setGroups(data.groups);
      } catch (requestError) {
        setGroups([]);
        setError(requestError?.response?.data?.message || requestError.message || '获取全量活跃榜失败');
      } finally {
        setLoading(false);
      }
    };

    fetchAllRankings();
  }, []);

  const maxScore = groups.reduce((max, group) => {
    const current = Number(group.score) || 0;
    return current > max ? current : max;
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
          <h1 className="text-2xl font-semibold text-[#1F2937]">全站小组活跃度总榜</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#edf3fb_0%,#f7f9fc_46%,#eef2f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/admin/overview')}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回后台首页
              </button>
              <h1 className="text-2xl font-semibold text-[#1F2937]">全站小组活跃度总榜</h1>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-[#EEF4EE] text-[#5E755A]">All Rankings</span>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#D8DEE8] p-6 shadow-sm">
          <div className="space-y-3">
            {loading ? <div className="py-3 text-sm text-slate-500">正在加载全量活跃榜...</div> : null}
            {!loading && groups.length === 0 ? (
              <div className="py-3 text-sm text-slate-500">暂无可展示的小组数据</div>
            ) : null}

            {!loading
              ? groups.map((group, index) => {
                  const score = Number(group.score) || 0;
                  const groupName = group.name || '未命名小组';
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

export default AllGroupRankings;
