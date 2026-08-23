import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';
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

function AdminGroups() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editModal, setEditModal] = useState({
    isOpen: false,
    targetId: null
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: ''
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    type: ''
  });

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get('/api/admin/groups');
      if (!data.success) {
        throw new Error(data.message || '获取小组列表失败');
      }
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (requestError) {
      setGroups([]);
      setError(requestError.message || '获取小组列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      targetId: null,
      targetName: '',
      type: ''
    });
  };

  const handleForceDismissGroup = (group) => {
    if (!group?.id) {
      return;
    }
    if (deletingId !== null) {
      return;
    }
    setDeleteModal({
      isOpen: true,
      targetId: group.id,
      targetName: group.name || `小组#${group.id}`,
      type: 'group'
    });
  };

  const handleOpenGroupDetail = (group) => {
    if (!group?.id) {
      return;
    }
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleCloseGroupDetail = () => {
    setIsModalOpen(false);
    setSelectedGroup(null);
  };

  const openEditGroupModal = (group) => {
    if (!group?.id) {
      return;
    }
    setError('');
    setGroupForm({
      name: group.name || '',
      description: group.description || ''
    });
    setEditModal({
      isOpen: true,
      targetId: group.id
    });
  };

  const closeEditGroupModal = () => {
    if (saving) {
      return;
    }
    setError('');
    setEditModal({
      isOpen: false,
      targetId: null
    });
    setGroupForm({
      name: '',
      description: ''
    });
  };

  const handleGroupFieldChange = (field, value) => {
    setGroupForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const submitGroupForm = async () => {
    const name = groupForm.name.trim();
    const description = groupForm.description.trim();

    if (!editModal.targetId) {
      return;
    }
    if (!name) {
      setError('小组名称不能为空');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const data = await apiClient.put(`/api/admin/groups/${editModal.targetId}`, {
        name,
        description
      });

      if (!data?.success) {
        throw new Error(data?.message || '更新小组信息失败');
      }

      await fetchGroups();
      closeEditGroupModal();
    } catch (requestError) {
      setError(requestError.message || '更新小组信息失败');
    } finally {
      setSaving(false);
    }
  };

  const handleGroupFormSubmit = (event) => {
    event.preventDefault();
    submitGroupForm();
  };

  const confirmDeleteGroup = async () => {
    if (!deleteModal.targetId) {
      return;
    }
    setDeletingId(deleteModal.targetId);
    setError('');
    try {
      const data = await apiClient.delete(`/api/admin/groups/${deleteModal.targetId}`);
      if (!data.success) {
        throw new Error(data.message || '强制解散失败');
      }
      await fetchGroups();
      closeDeleteModal();
    } catch (requestError) {
      setError(requestError.message || '强制解散失败');
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredGroups = groups.filter((group) => {
    if (!normalizedSearch) {
      return true;
    }
    const keywords = `${group.name || ''} ${group.description || ''}`.toLowerCase();
    return keywords.includes(normalizedSearch);
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#EEF2F6] p-6 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">小组监督</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eef2f7_0%,#f8fafc_45%,#f3f4f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#D8DEE8] px-6 py-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">小组监督</h1>
          <p className="mt-1 text-sm text-[#6B7280]">监控全站小组运行状态，并支持管理员强制解散。</p>
        </section>

        <section className="bg-white rounded-2xl border border-[#D8DEE8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索小组名称或简介..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">小组ID</th>
                  <th className="text-left px-5 py-3 font-medium">小组名称</th>
                  <th className="text-left px-5 py-3 font-medium">创建者ID</th>
                  <th className="text-left px-5 py-3 font-medium">创建者昵称</th>
                  <th className="text-left px-5 py-3 font-medium">创建时间</th>
                  <th className="text-right px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      正在加载小组列表...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredGroups.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={6}>
                      {normalizedSearch ? '未找到匹配的小组' : '当前暂无小组数据'}
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredGroups.map((group) => (
                      <tr key={group.id} className="hover:bg-[#FAFBFF] transition-colors">
                        <td className="px-5 py-3">{group.id}</td>
                        <td className="px-5 py-3">{group.name}</td>
                        <td className="px-5 py-3">{group.owner_id ?? '--'}</td>
                        <td className="px-5 py-3">{group.owner_username || '--'}</td>
                        <td className="px-5 py-3">{formatDateTime(group.created_at)}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenGroupDetail(group)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#9BB098] text-white hover:bg-[#8A9F87] transition-colors"
                            >
                              查看详情
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditGroupModal(group)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#E9EEF5] text-[#4B5E78] hover:bg-[#DEE6F0] transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleForceDismissGroup(group)}
                              disabled={deletingId === group.id}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FDECEC] text-[#B91C1C] hover:bg-[#FADADA] disabled:opacity-60 transition-colors"
                            >
                              {deletingId === group.id ? '处理中...' : '强制解散'}
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

      {editModal.isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeEditGroupModal}
        >
          <form
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6"
            onSubmit={handleGroupFormSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">编辑小组信息</h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">小组名称</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(event) => handleGroupFieldChange('name', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098]"
                  placeholder="请输入小组名称"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">小组简介</label>
                <textarea
                  value={groupForm.description}
                  onChange={(event) => handleGroupFieldChange('description', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098] min-h-[96px] resize-none"
                  placeholder="请输入小组简介"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditGroupModal}
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

      {isModalOpen && selectedGroup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={handleCloseGroupDetail}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">小组详细信息</h3>
            <div className="mt-5 space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="grid grid-cols-[92px_1fr] gap-2 text-sm">
                <span className="text-slate-500">小组名称</span>
                <span className="text-slate-800 font-medium break-all">{selectedGroup.name || '--'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2 text-sm">
                <span className="text-slate-500">小组简介</span>
                <span className="text-slate-700 break-all">{selectedGroup.description || '--'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2 text-sm">
                <span className="text-slate-500">创建者</span>
                <span className="text-slate-700">{selectedGroup.owner_username || '--'}</span>
              </div>
              <div className="grid grid-cols-[92px_1fr] gap-2 text-sm">
                <span className="text-slate-500">创建时间</span>
                <span className="text-slate-700">{formatDateTime(selectedGroup.created_at)}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseGroupDetail}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseGroupDetail();
                  handleForceDismissGroup(selectedGroup);
                }}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                强制解散该小组
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
                onClick={confirmDeleteGroup}
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

export default AdminGroups;
