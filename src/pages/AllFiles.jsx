import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Search } from 'lucide-react';
import apiClient, { API_BASE_URL } from '../api/client';

function formatFileSize(bytesValue) {
  const bytes = Number(bytesValue) || 0;
  if (bytes <= 0) {
    return '0 KB';
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(value) {
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

function AllFiles() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchAllFiles = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiClient.get('/api/files/all');
        if (!data.success) {
          throw new Error(data.message || '获取资料集锦失败');
        }

        if (mounted) {
          setFiles(Array.isArray(data.files) ? data.files : []);
        }
      } catch (requestError) {
        if (mounted) {
          setFiles([]);
          setError(requestError.message || '获取资料集锦失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAllFiles();
    return () => {
      mounted = false;
    };
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredFiles = files.filter((file) => {
    if (!normalizedSearch) {
      return true;
    }
    return (file.file_name || '').toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,#eef5eb_0%,#f7fafc_45%,#f8fafc_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white/90 backdrop-blur rounded-3xl border border-[#E8EDF5] p-6 md:p-8 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                返回总览
              </button>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-slate-800">资料集锦</h1>
              <p className="text-sm text-slate-500 mt-1">聚合展示你可访问的小组共享资料，便于统一检索与下载。</p>
            </div>
            <div className="w-full md:w-auto space-y-3">
              <div className="px-4 py-3 rounded-xl bg-[#F3F7F3] border border-[#DDE7DD] text-right">
                <div className="text-xs text-slate-500">资料总数</div>
                <div className="text-xl font-semibold text-slate-800">{files.length}</div>
              </div>
              <div className="relative w-full md:w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="搜索资料名称..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? <div className="bg-white rounded-2xl p-8 text-center text-slate-500 shadow-sm">加载中...</div> : null}
        {!loading && error ? <div className="text-sm text-rose-500">{error}</div> : null}

        {!loading && !error ? (
          <section className="rounded-2xl border border-[#ECF0F6] bg-white shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.9fr_120px] px-4 py-3 bg-slate-50 text-xs tracking-wide text-slate-500">
              <span>资料名称</span>
              <span>所属小组</span>
              <span>上传者</span>
              <span>文件大小</span>
              <span>上传时间</span>
              <span className="text-right">操作</span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-400">
                {normalizedSearch ? '未找到匹配资料。' : '暂无资料。'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredFiles.map((file) => {
                  const fileUrl = resolveFileUrl(file.file_url);
                  return (
                    <article
                      key={file.id}
                      className="grid grid-cols-1 md:grid-cols-[1.3fr_0.8fr_0.8fr_0.7fr_0.9fr_120px] gap-2 px-4 py-4 text-sm transition-colors hover:bg-slate-50/70"
                    >
                      <div className="font-medium text-slate-700 flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="truncate">{file.file_name || '未命名文件'}</span>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#9BB098] text-white text-xs">
                          {file.group_name || `小组 #${file.group_id}`}
                        </span>
                      </div>
                      <div className="text-slate-600">{file.username || '未知上传者'}</div>
                      <div className="text-slate-500">{formatFileSize(file.file_size)}</div>
                      <div className="text-slate-500">{formatTime(file.created_at)}</div>
                      <div className="flex md:justify-end">
                        {fileUrl ? (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#9BB098] hover:bg-[#9BB098]/10 rounded-md px-3 py-1.5 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>获取</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">链接不可用</span>
                        )}
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

export default AllFiles;
