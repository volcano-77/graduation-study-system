import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import apiClient from '../api/client';

function extractHttpUrlFromText(value) {
  const raw = typeof value === 'string' ? value : '';
  if (!raw.trim()) {
    return '';
  }

  const matched = raw.match(/https?:\/\/[^\s<>"']+/i);
  if (!matched) {
    return '';
  }

  return matched[0].replace(/[.,!?;:)\]}>，。！？；：、）】》]+$/u, '');
}

function formatTime(value) {
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

function GlobalFiles() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchFiles = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get('/api/global/files');
        if (!data.success) {
          throw new Error(data.message || '获取全局资料失败');
        }

        if (mounted) {
          setFiles(Array.isArray(data.files) ? data.files : []);
        }
      } catch (requestError) {
        if (mounted) {
          setFiles([]);
          setError(requestError.message || '获取全局资料失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchFiles();
    return () => {
      mounted = false;
    };
  }, []);

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
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-gray-800">全局资料库</h1>
              <p className="text-sm text-gray-500 mt-1">统一查看你参与小组的共享资料。</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[#F4F7EF] border border-[#E4E9DA] text-right">
              <div className="text-xs text-gray-500">资料总数</div>
              <div className="text-xl font-semibold text-[#6F8F5D]">{files.length}</div>
            </div>
          </div>
        </section>

        {loading ? <div className="bg-white rounded-2xl p-8 text-center text-gray-500">加载中...</div> : null}
        {!loading && error ? <div className="text-sm text-red-500">{error}</div> : null}

        {!loading && !error ? (
          <section className="rounded-2xl border border-[#ECEBE8] bg-white shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.2fr_0.9fr_0.8fr_1.1fr_0.9fr_110px] px-4 py-3 bg-[#F8FAF5] text-xs tracking-wide text-gray-500">
              <span>资料名称</span>
              <span>所属小组</span>
              <span>上传者</span>
              <span>资料链接</span>
              <span>上传时间</span>
              <span className="text-right">跳转</span>
            </div>

            {files.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-400">暂无共享资料。</div>
            ) : (
              <div className="divide-y divide-[#ECEBE8]">
                {files.map((item) => {
                  const href = extractHttpUrlFromText(item.file_url);
                  return (
                    <article
                      key={item.id}
                      className="grid grid-cols-1 md:grid-cols-[1.2fr_0.9fr_0.8fr_1.1fr_0.9fr_110px] gap-2 px-4 py-4 text-sm"
                    >
                      <div className="font-medium text-gray-800 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#7D8F6B]" />
                        <span>{item.file_name}</span>
                      </div>
                      <div className="text-gray-600">{item.group_name || `小组 #${item.group_id}`}</div>
                      <div className="text-gray-600">{item.username || '未知用户'}</div>
                      <div>
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#6F8F5D] hover:text-[#5B774A] hover:underline break-all"
                          >
                            {href}
                          </a>
                        ) : (
                          <span className="text-gray-400">未识别到有效链接</span>
                        )}
                      </div>
                      <div className="text-gray-500">{formatTime(item.created_at)}</div>
                      <div className="flex md:justify-end">
                        <button
                          type="button"
                          onClick={() => navigate(`/groups/${item.group_id}`)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E3E7DC] text-xs text-gray-600 hover:bg-[#F6F8F3] transition-colors"
                        >
                          查看
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default GlobalFiles;
