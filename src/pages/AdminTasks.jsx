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

function AdminTasks() {
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    task: null
  });
  const [editModal, setEditModal] = useState({
    isOpen: false,
    targetId: null
  });
  const [taskForm, setTaskForm] = useState({
    content: '',
    status: '待处理'
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    type: ''
  });

  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/admin/tasks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = response?.data || {};
      if (!data.success) {
        throw new Error(data.message || '获取任务列表失败');
      }
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (requestError) {
      setTasks([]);
      setError(requestError?.response?.data?.message || requestError.message || '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
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
      task: null
    });
  };

  const openReviewModal = (task) => {
    if (!task) {
      return;
    }
    setReviewModal({
      isOpen: true,
      task
    });
  };

  const openDeleteModal = (task) => {
    if (!task?.id || deletingId !== null) {
      return;
    }
    setDeleteModal({
      isOpen: true,
      targetId: task.id,
      targetName: task.content || `任务#${task.id}`,
      type: 'task'
    });
  };

  const openEditModal = (task) => {
    if (!task?.id) {
      return;
    }
    setError('');
    setTaskForm({
      content: task.content || '',
      status: task.status || '待处理'
    });
    setEditModal({
      isOpen: true,
      targetId: task.id
    });
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }
    setError('');
    setEditModal({
      isOpen: false,
      targetId: null
    });
    setTaskForm({
      content: '',
      status: '待处理'
    });
  };

  const handleTaskFieldChange = (field, value) => {
    setTaskForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const submitTaskForm = async () => {
    const content = taskForm.content.trim();
    const status = typeof taskForm.status === 'string' ? taskForm.status.trim() : '';

    if (!editModal.targetId) {
      return;
    }
    if (!content) {
      setError('任务内容不能为空');
      return;
    }
    if (!['待处理', '进行中', '已完成'].includes(status)) {
      setError('任务状态不合法');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/api/admin/tasks/${editModal.targetId}`,
        { content, status },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const data = response?.data || {};
      if (!data.success) {
        throw new Error(data.message || '更新任务失败');
      }

      await fetchTasks();
      closeEditModal();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || '更新任务失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTaskFormSubmit = (event) => {
    event.preventDefault();
    submitTaskForm();
  };

  const deleteTaskById = async (taskId) => {
    setDeletingId(taskId);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/api/admin/tasks/${taskId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = response?.data || {};
      if (!data.success) {
        throw new Error(data.message || '强制删除任务失败');
      }
      await fetchTasks();
      return true;
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || '强制删除任务失败');
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteTask = async () => {
    if (!deleteModal.targetId) {
      return;
    }
    const success = await deleteTaskById(deleteModal.targetId);
    if (success) {
      closeDeleteModal();
    }
  };

  const confirmDeleteFromReview = async () => {
    const task = reviewModal.task;
    if (!task?.id || deletingId !== null) {
      return;
    }
    const success = await deleteTaskById(task.id);
    if (success) {
      closeReviewModal();
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    if (!normalizedSearch) {
      return true;
    }
    const keywords = `${task.content || ''} ${task.group_name || ''}`.toLowerCase();
    return keywords.includes(normalizedSearch);
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#EEF2F6] p-6 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">全站任务监管</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eef2f7_0%,#f8fafc_45%,#f3f4f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#D8DEE8] px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">全站任务监管</h1>
          <p className="mt-1 text-sm text-[#6B7280]">全站任务审查、异常状态巡检与违规内容处置。</p>
        </section>

        <section className="bg-white rounded-2xl border border-[#D8DEE8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索任务内容或小组名..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">任务内容</th>
                  <th className="text-left px-5 py-3 font-medium">所属小组</th>
                  <th className="text-left px-5 py-3 font-medium">负责人</th>
                  <th className="text-left px-5 py-3 font-medium">状态</th>
                  <th className="text-left px-5 py-3 font-medium">创建时间</th>
                  <th className="text-right px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      正在加载任务列表...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredTasks.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      {normalizedSearch ? '未找到匹配的任务' : '当前暂无任务数据'}
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredTasks.map((task) => {
                      const statusClass =
                        task.status === '已完成'
                          ? 'bg-[#EAF6EA] text-[#3F7D47]'
                          : task.status === '进行中'
                            ? 'bg-[#EEF2FF] text-[#4F46E5]'
                            : 'bg-[#F5F5F4] text-[#57534E]';
                      return (
                        <tr key={task.id} className="hover:bg-[#FAFBFF] transition-colors">
                          <td className="px-5 py-3 max-w-[320px] truncate">{task.content || '--'}</td>
                          <td className="px-5 py-3">{task.group_name || '--'}</td>
                          <td className="px-5 py-3">{task.username || '--'}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}`}
                            >
                              {task.status || '待处理'}
                            </span>
                          </td>
                          <td className="px-5 py-3">{formatDateTime(task.created_at)}</td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openReviewModal(task)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#EEF4EE] text-[#5E755A] hover:bg-[#E4EEE4] transition-colors"
                              >
                                任务审查
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#E9EEF5] text-[#4B5E78] hover:bg-[#DEE6F0] transition-colors"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(task)}
                                disabled={deletingId === task.id}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FDECEC] text-[#B91C1C] hover:bg-[#FADADA] disabled:opacity-60 transition-colors"
                              >
                                {deletingId === task.id ? '处理中...' : '强制删除'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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

      {editModal.isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeEditModal}
        >
          <form
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6"
            onSubmit={handleTaskFormSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">编辑任务信息</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">任务内容</label>
                <textarea
                  value={taskForm.content}
                  onChange={(event) => handleTaskFieldChange('content', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098] min-h-[96px] resize-none"
                  placeholder="请输入任务内容"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">任务状态</label>
                <select
                  value={taskForm.status}
                  onChange={(event) => handleTaskFieldChange('status', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098] bg-white"
                >
                  <option value="待处理">待处理</option>
                  <option value="进行中">进行中</option>
                  <option value="已完成">已完成</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#9BB098] hover:bg-[#8A9F87] text-white transition-colors disabled:opacity-60"
              >
                {saving ? '提交中...' : '保存提交'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {reviewModal.isOpen && reviewModal.task ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeReviewModal}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">任务详情与风控审查</h3>

            <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-500">完整描述</span>
                <span className="text-slate-700 font-medium text-right break-all">{reviewModal.task.content || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">当前状态</span>
                <span className="text-slate-700 font-medium">{reviewModal.task.status || '待处理'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">所属小组</span>
                <span className="text-slate-700 font-medium">{reviewModal.task.group_name || '--'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">发布时间</span>
                <span className="text-slate-700 font-medium">{formatDateTime(reviewModal.task.created_at)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeReviewModal}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                暂不处理 (关闭)
              </button>
              <button
                type="button"
                onClick={confirmDeleteFromReview}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-60"
              >
                {deletingId === reviewModal.task.id ? '删除中...' : '确认违规并删除'}
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
                onClick={confirmDeleteTask}
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

export default AdminTasks;
