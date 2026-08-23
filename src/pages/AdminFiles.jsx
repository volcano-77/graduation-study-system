import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/client';
import { Search } from 'lucide-react';

function formatDateTime(value) {
  if (!value) {
    return '--';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatFileSize(sizeInBytes) {
  const size = Number(sizeInBytes) || 0;
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function AdminFiles() {
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    file: null
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    type: ''
  });

  const fetchFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/files`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = response?.data || {};
      if (!data.success) {
        throw new Error(data.message || '获取资料列表失败');
      }
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (requestError) {
      setFiles([]);
      setError(requestError?.response?.data?.message || requestError.message || '获取资料列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      targetId: null,
      targetName: '',
      type: ''
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      file: null
    });
  };

  const openReviewModal = (file) => {
    if (!file) {
      return;
    }
    setReviewModal({
      isOpen: true,
      file
    });
  };

  const openDeleteModal = (file) => {
    if (!file?.id || deletingId !== null) {
      return;
    }
    setDeleteModal({
      isOpen: true,
      targetId: file.id,
      targetName: file.file_name || `资料#${file.id}`,
      type: 'file'
    });
  };

  const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) {
      return '#';
    }
    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }
    return `${API_BASE_URL}${fileUrl}`;
  };

  const openDeleteFromReview = () => {
    const file = reviewModal.file;
    if (!file?.id) {
      return;
    }
    closeReviewModal();
    openDeleteModal(file);
  };

  const confirmDeleteFile = async () => {
    if (!deleteModal.targetId) {
      return;
    }
    setDeletingId(deleteModal.targetId);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/admin/files/${deleteModal.targetId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = response?.data || {};
      if (!data.success) {
        throw new Error(data.message || '彻底销毁资料失败');
      }
      await fetchFiles();
      closeDeleteModal();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || '彻底销毁资料失败');
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredFiles = files.filter((file) => {
    if (!normalizedSearch) {
      return true;
    }
    const uploaderName = file.uploader_name || file.username || '';
    const keywords = `${file.file_name || ''} ${uploaderName}`.toLowerCase();
    return keywords.includes(normalizedSearch);
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#EEF2F6] p-6 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">全站资料审查</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eef2f7_0%,#f8fafc_45%,#f3f4f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#D8DEE8] px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">全站资料审查</h1>
          <p className="mt-1 text-sm text-[#6B7280]">全站资料内容巡检、违规文件处置与风控治理。</p>
        </section>

        <section className="bg-white rounded-2xl border border-[#D8DEE8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索文件名或上传者..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">资料名称</th>
                  <th className="text-left px-5 py-3 font-medium">大小</th>
                  <th className="text-left px-5 py-3 font-medium">所属小组</th>
                  <th className="text-left px-5 py-3 font-medium">上传者</th>
                  <th className="text-left px-5 py-3 font-medium">上传时间</th>
                  <th className="text-right px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      正在加载资料列表...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredFiles.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      {normalizedSearch ? '未找到匹配的资料' : '当前暂无资料数据'}
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredFiles.map((file) => (
                      <tr key={file.id} className="hover:bg-[#FAFBFF] transition-colors">
                        <td className="px-5 py-3 max-w-[320px] truncate">{file.file_name || '--'}</td>
                        <td className="px-5 py-3">{formatFileSize(file.file_size)}</td>
                        <td className="px-5 py-3">{file.group_name || '--'}</td>
                        <td className="px-5 py-3">{file.username || '--'}</td>
                        <td className="px-5 py-3">{formatDateTime(file.created_at)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openReviewModal(file)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#EEF4EE] text-[#5E755A] hover:bg-[#E4EEE4] transition-colors"
                            >
                              文件审查
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(file)}
                              disabled={deletingId === file.id}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FDECEC] text-[#B91C1C] hover:bg-[#FADADA] disabled:opacity-60 transition-colors"
                            >
                              {deletingId === file.id ? '处理中...' : '彻底销毁'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-[#F5C2C7] bg-[#FDECEC] text-[#9B1C1C] px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
      </div>

      {reviewModal.isOpen && reviewModal.file ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeReviewModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">文件审查与追踪</h3>
            <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">完整文件名</span>
                <span className="text-slate-700 font-medium text-right break-all">{reviewModal.file.file_name || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">文件大小</span>
                <span className="text-slate-700 font-medium">{formatFileSize(reviewModal.file.file_size)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">上传者 ID / 姓名</span>
                <span className="text-slate-700 font-medium">
                  {reviewModal.file.uploader_id || '--'} / {reviewModal.file.username || '--'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">所属小组</span>
                <span className="text-slate-700 font-medium">{reviewModal.file.group_name || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">上传时间</span>
                <span className="text-slate-700 font-medium">{formatDateTime(reviewModal.file.created_at)}</span>
              </div>
            </div>

            <a
              href={resolveFileUrl(reviewModal.file.file_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#9BB098]/20 px-4 py-2.5 text-sm font-semibold text-[#4F654C] hover:bg-[#9BB098]/30 transition-colors"
            >
              预览/下载源文件
            </a>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeReviewModal}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                暂不处理(关闭)
              </button>
              <button
                type="button"
                onClick={openDeleteFromReview}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                确认违规并销毁
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModal.isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeDeleteModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-96 transform transition-all"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 text-lg font-semibold">
              !
            </div>
            <h3 className="text-center text-lg font-semibold text-slate-800">高危操作确认</h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              确定要永久删除「{deleteModal.targetName}」吗？此操作将清空其所有关联数据且不可恢复！
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-60"
              >
                {deletingId !== null ? '销毁中...' : '确认销毁'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminFiles;
