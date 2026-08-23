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

const INITIAL_USER_FORM = {
  id: null,
  username: '',
  email: '',
  password: '',
  role: 'user'
};

function AdminUsers() {
  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }, []);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formModal, setFormModal] = useState({
    isOpen: false,
    mode: 'create'
  });
  const [userForm, setUserForm] = useState(INITIAL_USER_FORM);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: '',
    type: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get('/api/admin/users');
      if (!data.success) {
        throw new Error(data.message || '获取用户列表失败');
      }
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (requestError) {
      setUsers([]);
      setError(requestError.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      targetId: null,
      targetName: '',
      type: ''
    });
  };

  const handleDeleteUser = (target) => {
    if (!target?.id) {
      return;
    }
    if (deletingId !== null) {
      return;
    }
    setDeleteModal({
      isOpen: true,
      targetId: target.id,
      targetName: target.username || `用户#${target.id}`,
      type: 'user'
    });
  };

  const handleOpenUserDetail = (target) => {
    if (!target?.id) {
      return;
    }
    setSelectedUser(target);
    setIsModalOpen(true);
  };

  const handleCloseUserDetail = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const openCreateUserModal = () => {
    setError('');
    setUserForm(INITIAL_USER_FORM);
    setFormModal({
      isOpen: true,
      mode: 'create'
    });
  };

  const openEditUserModal = (target) => {
    if (!target?.id) {
      return;
    }
    setError('');
    setUserForm({
      id: target.id,
      username: target.username || '',
      email: target.email || '',
      password: '',
      role: target.role === 'admin' ? 'admin' : 'user'
    });
    setFormModal({
      isOpen: true,
      mode: 'edit'
    });
  };

  const closeUserFormModal = () => {
    setError('');
    setFormModal({
      isOpen: false,
      mode: 'create'
    });
    setUserForm(INITIAL_USER_FORM);
  };

  const handleFormFieldChange = (field, value) => {
    setUserForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const submitUserForm = async () => {
    const username = userForm.username.trim();
    const email = userForm.email.trim();
    const password = userForm.password.trim();
    const role = userForm.role === 'admin' ? 'admin' : 'user';
    const isCreateMode = formModal.mode === 'create';

    if (!username) {
      setError('用户名不能为空');
      return;
    }
    if (!email) {
      setError('邮箱不能为空');
      return;
    }
    if (isCreateMode && !password) {
      setError('新增用户时密码不能为空');
      return;
    }

    const payload = {
      username,
      email,
      role
    };
    if (password) {
      payload.password = password;
    }

    setSaving(true);
    setError('');
    try {
      let data;
      if (isCreateMode) {
        // POST /api/admin/users
        // payload: { username: string, email: string, password: string, role: 'user' | 'admin' }
        data = await apiClient.post('/api/admin/users', payload);
      } else {
        // PUT /api/admin/users/:id
        // payload: { username: string, email: string, role: 'user' | 'admin', password?: string }
        data = await apiClient.put(`/api/admin/users/${userForm.id}`, payload);
      }

      if (!data?.success) {
        throw new Error(data?.message || '保存用户信息失败');
      }

      await fetchUsers();
      closeUserFormModal();
    } catch (requestError) {
      setError(requestError.message || '保存用户信息失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUserFormSubmit = (event) => {
    event.preventDefault();
    submitUserForm();
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.targetId) {
      return;
    }
    setDeletingId(deleteModal.targetId);
    setError('');
    try {
      const data = await apiClient.delete(`/api/admin/users/${deleteModal.targetId}`);
      if (!data.success) {
        throw new Error(data.message || '删除用户失败');
      }
      await fetchUsers();
      closeDeleteModal();
    } catch (requestError) {
      setError(requestError.message || '删除用户失败');
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }
    const keywords = [
      String(item.id ?? ''),
      item.username || '',
      item.email || '',
      item.role || ''
    ]
      .join(' ')
      .toLowerCase();
    return keywords.includes(normalizedSearch);
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#EEF2F6] p-6 md:p-10">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl border border-[#D8DEE8] p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[#1F2937]">用户管理</h1>
          <p className="mt-2 text-sm text-[#6B7280]">你没有访问该后台页面的权限。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(120deg,#eef2f7_0%,#f8fafc_45%,#f3f4f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl border border-[#D8DEE8] px-6 py-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-[#1F2937]">用户管理</h1>
              <p className="mt-1 text-sm text-[#6B7280]">全站用户审核与违规账号处理。</p>
            </div>
            <button
              type="button"
              onClick={openCreateUserModal}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-[#9BB098] text-white hover:bg-[#8A9F87] transition-colors"
            >
              + 新增用户
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#D8DEE8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="搜索名称、邮箱或关键字..."
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#9BB098] focus:ring-2 focus:ring-[#9BB098]/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F8FAFC] text-[#64748B]">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">ID</th>
                  <th className="text-left px-5 py-3 font-medium">昵称</th>
                  <th className="text-left px-5 py-3 font-medium">邮箱</th>
                  <th className="text-left px-5 py-3 font-medium">角色</th>
                  <th className="text-right px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={5}>
                      正在加载用户列表...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-5 py-6 text-[#6B7280]" colSpan={5}>
                      {normalizedSearch ? '未找到匹配的用户' : '暂无用户数据'}
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? filteredUsers.map((item) => {
                      const isCurrentUser = Number(item.id) === Number(currentUser?.id);
                      return (
                        <tr key={item.id} className="hover:bg-[#FAFBFF] transition-colors">
                          <td className="px-5 py-3">{item.id}</td>
                          <td className="px-5 py-3">{item.username}</td>
                          <td className="px-5 py-3">{item.email}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                item.role === 'admin'
                                  ? 'bg-[#E5ECFF] text-[#2C4DA6]'
                                  : 'bg-[#EEF2F7] text-[#475569]'
                              }`}
                            >
                              {item.role || 'user'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenUserDetail(item)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#9BB098] text-white hover:bg-[#8A9F87] transition-colors"
                              >
                                用户画像
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditUserModal(item)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#E9EEF5] text-[#4B5E78] hover:bg-[#DEE6F0] transition-colors"
                              >
                                编辑
                              </button>
                              {!isCurrentUser ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(item)}
                                  disabled={deletingId === item.id}
                                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FDECEC] text-[#B91C1C] hover:bg-[#FADADA] disabled:opacity-60 transition-colors"
                                >
                                  {deletingId === item.id ? '处理中...' : '封禁/删除'}
                                </button>
                              ) : (
                                <span className="text-xs text-[#94A3B8]">当前账号</span>
                              )}
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

      {formModal.isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={closeUserFormModal}
        >
          <form
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6"
            onSubmit={handleUserFormSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">
              {formModal.mode === 'create' ? '新增系统用户' : '编辑用户信息'}
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">用户名 (Username)</label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(event) => handleFormFieldChange('username', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098]"
                  placeholder="请输入用户名"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">邮箱 (Email)</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) => handleFormFieldChange('email', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098]"
                  placeholder="请输入邮箱"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">密码 (Password)</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) => handleFormFieldChange('password', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098]"
                  placeholder={formModal.mode === 'create' ? '请输入密码' : '留空表示不修改密码'}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">角色 (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(event) => handleFormFieldChange('role', event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#9BB098] bg-white"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeUserFormModal}
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

      {isModalOpen && selectedUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all"
          onClick={handleCloseUserDetail}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-slate-800">用户详细档案</h3>
            <div className="mt-5 space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">用户 ID</span>
                <span className="text-slate-800">{selectedUser.id}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">用户名</span>
                <span className="text-slate-800 font-medium break-all">{selectedUser.username || '--'}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">邮箱</span>
                <span className="text-slate-700 break-all">{selectedUser.email || '--'}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">注册时间</span>
                <span className="text-slate-700">{formatDateTime(selectedUser.created_at)}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">用户角色</span>
                <span className="text-slate-700">{selectedUser.role || 'user'}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">参与小组数</span>
                <span className="text-slate-700">{Number(selectedUser.joined_group_count) || 0}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseUserDetail}
                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseUserDetail();
                  handleDeleteUser(selectedUser);
                }}
                disabled={Number(selectedUser.id) === Number(currentUser?.id)}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition-colors disabled:opacity-60"
              >
                确认封禁/删除
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
                onClick={confirmDeleteUser}
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

export default AdminUsers;
