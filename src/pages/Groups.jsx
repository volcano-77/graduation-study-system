import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Trash2 } from 'lucide-react';
import apiClient from '../api/client';
import { useMessage } from '../context/MessageContext';

const INITIAL_CONFIRM_MODAL = {
  isOpen: false,
  groupId: null,
  actionType: '',
  title: '',
  message: ''
};

function Groups() {
  const navigate = useNavigate();
  const { unreadCounts } = useMessage();
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState(null);
  const [leavingGroupId, setLeavingGroupId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(INITIAL_CONFIRM_MODAL);

  const createdGroups = useMemo(() => {
    return groups.filter((group) => Number(group.owner_id) === Number(currentUserId));
  }, [groups, currentUserId]);

  const joinedGroups = useMemo(() => {
    return groups.filter((group) => Number(group.owner_id) !== Number(currentUserId));
  }, [groups, currentUserId]);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/api/groups');
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('获取小组列表失败:', error);
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.id) {
          setCurrentUserId(Number(user.id));
        }
      }
    } catch (parseError) {
      console.error('读取当前用户失败:', parseError);
    }

    fetchGroups();
  }, []);

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : { id: 1 };

      const data = await apiClient.post('/api/groups', {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        owner_id: user.id
      });

      if (data.success) {
        await fetchGroups();
        navigate(`/groups/${data.group.id}`);
        setShowCreateGroupModal(false);
      }
    } catch (error) {
      console.error('创建小组失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirmModal = (actionType, groupId) => {
    if (!Number.isInteger(Number(groupId))) {
      return;
    }

    if (actionType === 'delete') {
      setConfirmModal({
        isOpen: true,
        groupId,
        actionType: 'delete',
        title: '确认删除小组',
        message: '删除后将同步清除相关任务、成员与讨论记录，且不可恢复。'
      });
      return;
    }

    if (actionType === 'leave') {
      setConfirmModal({
        isOpen: true,
        groupId,
        actionType: 'leave',
        title: '确认退出小组',
        message: '退出后你将不再出现在该小组成员列表中。'
      });
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal(INITIAL_CONFIRM_MODAL);
  };

  const handleConfirmAction = async () => {
    const { groupId, actionType } = confirmModal;
    if (!Number.isInteger(Number(groupId))) {
      closeConfirmModal();
      return;
    }

    try {
      if (actionType === 'delete') {
        setDeletingGroupId(groupId);
      } else if (actionType === 'leave') {
        setLeavingGroupId(groupId);
      } else {
        closeConfirmModal();
        return;
      }

      const endpoint = actionType === 'delete' ? `/api/groups/${groupId}` : `/api/groups/${groupId}/leave`;
      const data = await apiClient.delete(endpoint);
      if (data.success) {
        await fetchGroups();
        closeConfirmModal();
      }
    } catch (error) {
      console.error(actionType === 'delete' ? '删除小组失败:' : '退出小组失败:', error);
    } finally {
      setLeavingGroupId(null);
      setDeletingGroupId(null);
    }
  };

  const isConfirming =
    confirmModal.actionType === 'delete'
      ? deletingGroupId === confirmModal.groupId
      : leavingGroupId === confirmModal.groupId;

  return (
    <div className="min-h-screen bg-[#F9F8F6] p-12">
      <h1 className="text-2xl font-medium text-gray-700 mb-8">我的小组</h1>
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A3B18A]"></div>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">我创建的小组</h2>
            {createdGroups.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">暂未创建任何小组</p>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {createdGroups.map((group) => {
                const unreadCount = Number(unreadCounts[group.id] || 0);
                return (
                  <div
                    key={group.id}
                    className="relative bg-white p-6 rounded-2xl shadow-sm group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#9BB098]/50"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    {unreadCount > 0 ? (
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white z-10 animate-bounce-short">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openConfirmModal('delete', group.id);
                      }}
                      disabled={deletingGroupId === group.id}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors duration-200 disabled:opacity-60"
                      aria-label="删除小组"
                      title="删除小组"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <h2 className="text-lg font-medium text-[#A3B18A]">{group.name}</h2>
                    <p className="text-gray-500 text-sm">{group.description}</p>
                  </div>
                );
              })}

              <div
                className="border-2 border-dashed border-[#A3B18A] p-6 rounded-2xl flex flex-col items-center cursor-pointer transition-all duration-300 hover:bg-[#F4F7F5] hover:border-[#9BB098] hover:shadow-sm"
                onClick={() => setShowCreateGroupModal(true)}
              >
                <span className="text-2xl text-[#A3B18A]">+</span>
                <p className="text-[#A3B18A]">新建小组</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mt-10 mb-4">我加入的小组</h2>
            {joinedGroups.length === 0 ? (
              <p className="text-sm text-gray-400">暂未加入其他小组</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {joinedGroups.map((group) => {
                  const unreadCount = Number(unreadCounts[group.id] || 0);
                  return (
                    <div
                      key={group.id}
                      className="relative bg-white p-6 rounded-2xl shadow-sm group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#9BB098]/50"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      {unreadCount > 0 ? (
                        <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white z-10 animate-bounce-short">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          openConfirmModal('leave', group.id);
                        }}
                        disabled={leavingGroupId === group.id}
                        className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-300 hover:text-red-500 transition-colors duration-200 disabled:opacity-60"
                        aria-label="退出小组"
                        title="退出小组"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                      <h2 className="text-lg font-medium text-[#A3B18A]">{group.name}</h2>
                      <p className="text-gray-500 text-sm">{group.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[999]">
          <div className="bg-white p-8 rounded-2xl w-80 shadow-2xl">
            <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-2 bg-gray-100 rounded"
                placeholder="小组名称"
                required
              />
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                className="w-full p-2 bg-gray-100 rounded"
                placeholder="简介"
                required
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateGroupModal(false)}>
                  取消
                </button>
                <button type="submit" className="bg-[#A3B18A] text-white px-4 py-1 rounded">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen ? (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={closeConfirmModal}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-96 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800">{confirmModal.title}</h3>
            <p className="text-sm text-gray-500 mt-2">{confirmModal.message}</p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={isConfirming}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isConfirming}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg shadow-sm disabled:opacity-60"
              >
                {isConfirming ? '处理中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default Groups;
