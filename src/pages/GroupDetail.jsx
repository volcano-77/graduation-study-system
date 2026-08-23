import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Plus,
  SendHorizonal,
  Trash2,
  Users,
  ArrowLeft,
  X
} from 'lucide-react';
import { Mention, MentionsInput } from 'react-mentions';
import { io } from 'socket.io-client';
import axios from 'axios';
import apiClient, { API_BASE_URL } from '../api/client';
import { useMessage } from '../context/MessageContext';

const STATUS_OPTIONS = ['待处理', '进行中', '已完成'];

function getTaskStatusBadgeClass(status) {
  if (status === '进行中') {
    return 'bg-blue-50 text-blue-700';
  }
  if (status === '已完成') {
    return 'bg-green-50 text-green-700';
  }
  return 'bg-gray-100 text-gray-600';
}

const WORKSPACE_TABS = [
  { key: 'board', label: '任务看板', icon: LayoutDashboard },
  { key: 'members', label: '小组成员', icon: Users },
  { key: 'discussion', label: '讨论区', icon: MessageSquare },
  { key: 'stats', label: '小组统计', icon: BarChart3 },
  { key: 'files', label: '资料共享', icon: FileText }
];

const mentionInputStyle = {
  control: {
    fontSize: 14,
    fontWeight: 'normal',
    lineHeight: 1.5
  },
  highlighter: {
    padding: '8px 12px',
    border: '1px solid transparent',
    lineHeight: 1.5,
    minHeight: 42,
    whiteSpace: 'pre-wrap'
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '0.375rem',
    outline: 'none',
    lineHeight: 1.5,
    minHeight: 42,
    margin: 0,
    color: '#334155',
    backgroundColor: '#f8fafc',
    width: '100%'
  },
  suggestions: {
    list: {
      backgroundColor: '#ffffff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
      marginTop: 8,
      overflow: 'hidden'
    },
    item: {
      padding: '8px 12px',
      fontSize: 13,
      color: '#334155'
    },
    itemFocused: {
      backgroundColor: '#EFF6FF',
      color: '#1D4ED8'
    }
  }
};

function formatDiscussionTime(value) {
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

function buildDownloadUrl(fileUrl) {
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

function GroupDetail() {
  const { groupId, id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { unreadCounts, clearUnread } = useMessage();

  const resolveTabFromSearch = (params) => {
    const tabValue = params.get('tab');
    return WORKSPACE_TABS.some((tab) => tab.key === tabValue) ? tabValue : 'board';
  };

  const [activeTab, setActiveTab] = useState(() => resolveTabFromSearch(searchParams));
  const [group, setGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [discussions, setDiscussions] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [newTask, setNewTask] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState('待处理');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedInviteUser, setSelectedInviteUser] = useState(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [invitingMember, setInvitingMember] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [sharingFile, setSharingFile] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingRemoveMember, setPendingRemoveMember] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);

  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberNotice, setMemberNotice] = useState('');
  const [discussionError, setDiscussionError] = useState('');
  const [fileError, setFileError] = useState('');
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [openTaskStatusMenuId, setOpenTaskStatusMenuId] = useState(null);

  const groupedTasks = useMemo(() => {
    return STATUS_OPTIONS.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {});
  }, [tasks]);

  const groupMembers = members;
  const mentionData = useMemo(() => {
    const result = [];
    const seenIds = new Set();

    groupMembers.forEach((member) => {
      const id = String(member.user_id ?? member.id ?? '');
      const display = typeof member.username === 'string' ? member.username.trim() : '';
      if (!id || !display || seenIds.has(id)) {
        return;
      }
      seenIds.add(id);
      result.push({ id, display });
    });

    return result;
  }, [groupMembers]);

  const groupStats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((task) => task.status === '待处理').length;
    const inProgress = tasks.filter((task) => task.status === '进行中').length;
    const completed = tasks.filter((task) => task.status === '已完成').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const recentTasks = [...tasks].sort((a, b) => b.id - a.id).slice(0, 5);

    return { total, pending, inProgress, completed, completionRate, recentTasks };
  }, [tasks]);

  const isGroupOwner = useMemo(() => {
    if (!group || currentUserId === null) {
      return false;
    }
    return Number(group.owner_id) === Number(currentUserId);
  }, [group, currentUserId]);

  const currentGroupIdNumber = Number(groupId);
  const currentUnread = Number.isInteger(currentGroupIdNumber) ? Number(unreadCounts[currentGroupIdNumber] || 0) : 0;

  const fetchGroupAndTasks = async () => {
    setLoading(true);
    setError('');

    try {
      const [groupData, tasksData] = await Promise.all([
        apiClient.get(`/api/groups/${groupId}`),
        apiClient.get('/api/tasks', { params: { group_id: groupId } })
      ]);

      if (!groupData.success) {
        throw new Error(groupData.message || '获取小组信息失败');
      }

      setGroup(groupData.group);
      setTasks(tasksData.success ? tasksData.tasks : []);
    } catch (requestError) {
      setError(requestError.message || '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    setMemberLoading(true);
    setMemberError('');

    try {
      const data = await apiClient.get(`/api/groups/${groupId}/members`);
      if (!data.success) {
        throw new Error(data.message || '获取小组成员失败');
      }

      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (requestError) {
      setMembers([]);
      setMemberError(requestError.message || '获取小组成员失败');
    } finally {
      setMemberLoading(false);
    }
  };

  const fetchDiscussions = useCallback(
    async (options = {}) => {
      const { showLoading = true } = options;
      if (showLoading) {
        setDiscussionLoading(true);
        setDiscussionError('');
      }

      try {
        const data = await apiClient.get(`/api/groups/${groupId}/discussions`);
        if (!data.success) {
          throw new Error(data.message || '获取讨论区失败');
        }

        setDiscussions(Array.isArray(data.discussions) ? data.discussions : []);
      } catch (requestError) {
        if (showLoading) {
          setDiscussions([]);
          setDiscussionError(requestError.message || '获取讨论区失败');
        }
      } finally {
        if (showLoading) {
          setDiscussionLoading(false);
        }
      }
    },
    [groupId]
  );

  const fetchSharedFiles = async () => {
    setFileLoading(true);
    setFileError('');

    try {
      const data = await apiClient.get(`/api/groups/${groupId}/files`);
      if (!data.success) {
        throw new Error(data.message || '获取共享资料失败');
      }

      setSharedFiles(Array.isArray(data.files) ? data.files : []);
    } catch (requestError) {
      setSharedFiles([]);
      setFileError(requestError.message || '获取共享资料失败');
    } finally {
      setFileLoading(false);
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

    fetchGroupAndTasks();
    fetchMembers();
    fetchDiscussions();
    fetchSharedFiles();
    setSearchQuery('');
    setSearchResults([]);
    setSelectedInviteUser(null);
  }, [groupId, fetchDiscussions]);

  useEffect(() => {
    const tabFromSearch = resolveTabFromSearch(searchParams);
    setActiveTab((prev) => (prev === tabFromSearch ? prev : tabFromSearch));
  }, [searchParams]);

  useEffect(() => {
    const currentGroupId = Number(groupId);
    if (!Number.isInteger(currentGroupId)) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent('group-discussion:tab-change', {
        detail: {
          groupId: currentGroupId,
          activeTab
        }
      })
    );
  }, [groupId, activeTab]);

  useEffect(() => {
    const currentGroupId = Number(groupId);
    if (!Number.isInteger(currentGroupId)) {
      return;
    }

    if (activeTab === 'discussion') {
      clearUnread(currentGroupId);
    }
  }, [activeTab, groupId, clearUnread]);

  useEffect(() => {
    const currentGroupId = Number(groupId);
    if (!Number.isInteger(currentGroupId)) {
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      transports: ['websocket']
    });
    socket.emit('join_group', currentGroupId);

    const handleIncomingDiscussion = (message) => {
      const incomingGroupId = Number(message?.group_id ?? message?.groupId);
      if (!Number.isInteger(incomingGroupId) || incomingGroupId !== currentGroupId) {
        return;
      }

      setDiscussions((prev) => {
        const exists = prev.some((item) => Number(item.id) === Number(message.id));
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket.on('new_message', handleIncomingDiscussion);
    return () => {
      socket.off('new_message', handleIncomingDiscussion);
      socket.disconnect();
    };
  }, [groupId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    setMemberError('');
    setMemberNotice('');
    if (selectedInviteUser) {
      setSelectedInviteUser(null);
    }
  }, [searchQuery, selectedInviteUser]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      const currentGroupId = typeof groupId !== 'undefined' ? groupId : (typeof id !== 'undefined' ? id : '');
      setSearchLoading(true);
      apiClient
        .get('/api/search/users', {
          params: {
            query: keyword,
            groupId: currentGroupId
          }
        })
        .then((response) => {
          if (Array.isArray(response)) {
            setSearchResults(response);
            return;
          }

          if (Array.isArray(response?.data)) {
            setSearchResults(response.data);
            return;
          }

          if (response && Array.isArray(response.users)) {
            setSearchResults(response.users);
            return;
          }

          setSearchResults([]);
        })
        .catch((error) => {
          console.error('搜索请求失败:', error);
          setSearchResults([]);
        })
        .finally(() => {
          setSearchLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, groupId, id]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenTaskStatusMenuId(null);
    };

    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleAddTask = async (event) => {
    event.preventDefault();
    if (!newTask.trim()) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const data = await apiClient.post('/api/tasks', {
        group_id: Number(groupId),
        content: newTask.trim(),
        status: newTaskStatus
      });
      if (!data.success) {
        throw new Error(data.message || '新增任务失败');
      }

      setTasks((prev) => [...prev, data.task]);
      setNewTask('');
      setNewTaskStatus('待处理');
    } catch (requestError) {
      setError(requestError.message || '新增任务失败');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    setOpenTaskStatusMenuId(null);
    try {
      const data = await apiClient.put(`/api/tasks/${taskId}`, { status });
      if (!data.success) {
        throw new Error(data.message || '更新任务状态失败');
      }

      setTasks((prev) => prev.map((task) => (task.id === taskId ? data.task : task)));
    } catch (requestError) {
      setError(requestError.message || '更新任务状态失败');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const data = await apiClient.delete(`/api/tasks/${taskId}`);
      if (!data.success) {
        throw new Error(data.message || '删除任务失败');
      }

      setTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (requestError) {
      setError(requestError.message || '删除任务失败');
    }
  };

  const handleDragStart = (taskId) => {
    setDraggingTaskId(taskId);
  };

  const handleDropToStatus = async (event, targetStatus) => {
    event.preventDefault();
    if (!draggingTaskId) {
      return;
    }

    const draggedTask = tasks.find((task) => task.id === draggingTaskId);
    if (draggedTask && draggedTask.status !== targetStatus) {
      await handleStatusChange(draggingTaskId, targetStatus);
    }
    setDraggingTaskId(null);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const content = newMessage.trim();
    if (!content) {
      return;
    }

    setSendingMessage(true);
    setDiscussionError('');
    try {
      const data = await apiClient.post(`/api/groups/${groupId}/discussions`, { content });
      if (!data.success) {
        throw new Error(data.message || '发送消息失败');
      }

      setNewMessage('');
      if (data.discussion) {
        setDiscussions((prev) => {
          const exists = prev.some((item) => Number(item.id) === Number(data.discussion.id));
          if (exists) {
            return prev;
          }
          return [...prev, data.discussion];
        });
      }
    } catch (requestError) {
      setDiscussionError(requestError.message || '发送消息失败');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleInviteMember = async (event) => {
    event.preventDefault();
    if (!isGroupOwner) {
      setMemberError('仅组长可以邀请成员');
      setMemberNotice('');
      return;
    }

    if (!selectedInviteUser || !Number.isInteger(Number(selectedInviteUser.id))) {
      setMemberError('请先从下拉列表选择要邀请的用户');
      setMemberNotice('');
      return;
    }

    setInvitingMember(true);
    setMemberError('');
    setMemberNotice('');
    try {
      const data = await apiClient.post(`/api/groups/${groupId}/members`, {
        user_id: Number(selectedInviteUser.id)
      });
      if (!data.success) {
        throw new Error(data.message || '邀请成员失败');
      }

      setSelectedInviteUser(null);
      setSearchQuery('');
      setSearchResults([]);
      setMemberNotice(data.message || '邀请已发送，等待对方确认');
    } catch (requestError) {
      setMemberNotice('');
      setMemberError(requestError.message || '邀请成员失败');
    } finally {
      setInvitingMember(false);
    }
  };

  const openRemoveMemberConfirm = (member) => {
    const normalizedMemberId = Number(member?.id);
    if (!Number.isInteger(normalizedMemberId) || normalizedMemberId <= 0) {
      return;
    }
    if (!isGroupOwner) {
      setMemberError('仅组长可以移除成员');
      setMemberNotice('');
      return;
    }
    if (Number(currentUserId) === normalizedMemberId) {
      setMemberError('组长不能移除自己');
      setMemberNotice('');
      return;
    }
    setPendingRemoveMember(member);
    setIsConfirmOpen(true);
  };

  const closeRemoveMemberConfirm = () => {
    if (removingMember) {
      return;
    }
    setIsConfirmOpen(false);
    setPendingRemoveMember(null);
  };

  const handleConfirmRemoveMember = async () => {
    const normalizedMemberId = Number(pendingRemoveMember?.id);
    if (!Number.isInteger(normalizedMemberId) || normalizedMemberId <= 0) {
      closeRemoveMemberConfirm();
      return;
    }

    setMemberError('');
    setMemberNotice('');
    setRemovingMember(true);
    try {
      const data = await apiClient.delete(`/api/groups/${groupId}/members/${normalizedMemberId}`);
      if (!data.success) {
        throw new Error(data.message || '移除成员失败');
      }

      setMembers((prev) => prev.filter((item) => Number(item.id) !== normalizedMemberId));
      setMemberNotice(data.message || '成员已移出小组');
      setIsConfirmOpen(false);
      setPendingRemoveMember(null);
    } catch (requestError) {
      setMemberNotice('');
      setMemberError(requestError.message || '移除成员失败');
    } finally {
      setRemovingMember(false);
    }
  };

  const handlePickInviteUser = (user) => {
    setSelectedInviteUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setMemberError('');
    setMemberNotice('');
  };

  const handleShareFile = async (event) => {
    event.preventDefault();
    if (!selectedUploadFile) {
      setFileError('请选择要上传的文件');
      return;
    }
    if (!currentUserId) {
      setFileError('未识别到当前用户，请重新登录后再试');
      return;
    }

    setSharingFile(true);
    setFileError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('uploader_id', String(currentUserId));

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/groups/${groupId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = response?.data;
      if (!data.success) {
        throw new Error(data.message || '分享资料失败');
      }

      setSelectedUploadFile(null);
      setFileInputKey((prev) => prev + 1);
      setShareModalOpen(false);
      await fetchSharedFiles();
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message || requestError.message || '分享资料失败';
      setFileError(message);
    } finally {
      setSharingFile(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    const normalizedFileId = Number(fileId);
    if (!Number.isInteger(normalizedFileId) || normalizedFileId <= 0) {
      return;
    }

    const confirmed = window.confirm('确定要彻底删除这份资料吗？此操作不可恢复。');
    if (!confirmed) {
      return;
    }

    setFileError('');
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/groups/${groupId}/files/${normalizedFileId}`);
      const data = response?.data;
      if (!data?.success) {
        throw new Error(data?.message || '删除文件失败');
      }

      setSharedFiles((prev) => prev.filter((file) => Number(file.id) !== normalizedFileId));
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message || requestError.message || '删除文件失败';
      setFileError(message);
    }
  };

  const renderMessage = (text) => {
    if (typeof text !== 'string' || text.length === 0) {
      return '';
    }

    const regex = /@\[([^\]]+)\]\([^)]+\)/g;
    const nodes = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const mentionStart = match.index;
      const fullMention = match[0] || '';
      const displayName = match[1] || '';

      if (mentionStart > lastIndex) {
        nodes.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, mentionStart)}</span>);
      }

      nodes.push(
        <span
          key={`mention-${mentionStart}`}
          className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-medium mx-1"
        >
          @{displayName}
        </span>
      );

      lastIndex = mentionStart + fullMention.length;
    }

    if (lastIndex < text.length) {
      nodes.push(<span key={`tail-${lastIndex}`}>{text.slice(lastIndex)}</span>);
    }

    if (nodes.length === 0) {
      return text;
    }

    return nodes;
  };

  const renderTaskBoard = () => (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl p-6 border border-[#ECEBE8] shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">新增任务</h2>
        <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-[1fr_160px_130px] gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="输入任务内容"
            className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
          />
          <select
            value={newTaskStatus}
            onChange={(event) => setNewTaskStatus(event.target.value)}
            className="w-full px-3 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-3 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70 transition-colors"
          >
            {saving ? '提交中...' : '添加任务'}
          </button>
        </form>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {STATUS_OPTIONS.map((status) => (
          <div
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDropToStatus(event, status)}
            className={`rounded-xl p-4 border min-h-[360px] transition-colors ${
              draggingTaskId ? 'border-emerald-200 bg-slate-100/80' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">{status}</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-[#F1F3ED] text-gray-600">
                {(groupedTasks[status] || []).length}
              </span>
            </div>

            <div className="space-y-2">
              {(groupedTasks[status] || []).map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={() => setDraggingTaskId(null)}
                  className="group relative rounded-lg border border-gray-100 bg-white p-4 space-y-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm leading-6 text-gray-700 pr-1">{task.content}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-red-500 transition-all"
                      aria-label="删除任务"
                      title="删除任务"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative inline-flex" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenTaskStatusMenuId((prev) => (prev === task.id ? null : task.id));
                      }}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${getTaskStatusBadgeClass(task.status)}`}
                    >
                      {task.status}
                    </button>

                    {openTaskStatusMenuId === task.id ? (
                      <div className="absolute left-0 top-full mt-2 z-10 w-28 rounded-lg bg-white shadow-md border border-gray-100 p-1">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await handleStatusChange(task.id, option);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                              option === task.status
                                ? 'bg-slate-100 text-slate-700'
                                : 'text-gray-600 hover:bg-slate-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {(!groupedTasks[status] || groupedTasks[status].length === 0) ? (
                <div className="rounded-xl border border-dashed border-[#DFE3D8] bg-[#FBFCF9] px-3 py-5 text-center text-xs text-gray-400">
                  暂无任务
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderMembers = () => (
    <section className="bg-white rounded-2xl p-6 md:p-7 border border-[#ECEBE8] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">小组成员</h2>
        <span className="text-sm text-gray-500">共 {members.length} 人</span>
      </div>

      {isGroupOwner ? (
        <form onSubmit={handleInviteMember} className="mb-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  console.log('第一步：用户输入了文字 ->', e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder="输入昵称或邮箱进行搜索"
                className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
              />

              {searchQuery.trim() ? (
                <div className="absolute w-full z-50 mt-2 overflow-hidden rounded-xl border border-[#E7E9E2] bg-white shadow-lg">
                  {searchLoading ? (
                    <div className="px-4 py-3 text-sm text-gray-500">搜索中...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handlePickInviteUser(user)}
                          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[#F6F8F3] transition-colors"
                        >
                          {user.avatar ? (
                            <img src={user.avatar} alt="候选用户头像" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#A3B18A] text-white text-sm flex items-center justify-center shrink-0">
                              {(user.username || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{user.username || '未命名用户'}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email || '暂无邮箱'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500">未找到可邀请的用户</div>
                  )}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={invitingMember || !selectedInviteUser}
              className="px-4 py-3 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70"
            >
              {invitingMember ? '邀请中...' : '邀请加入'}
            </button>
          </div>

          {selectedInviteUser ? (
            <div className="inline-flex items-center gap-3 rounded-xl border border-[#E5E9DE] bg-[#F7F9F4] px-3 py-2">
              {selectedInviteUser.avatar ? (
                <img
                  src={selectedInviteUser.avatar}
                  alt="已选用户头像"
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-[#A3B18A] text-white text-xs flex items-center justify-center">
                  {(selectedInviteUser.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium text-gray-800">{selectedInviteUser.username}</span>
                <span className="text-gray-500">（{selectedInviteUser.email || '暂无邮箱'}）</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInviteUser(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="清空已选用户"
                title="清空已选用户"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </form>
      ) : (
        <div className="mb-5 rounded-xl bg-[#F7F8F5] border border-[#E5E9DE] px-4 py-3 text-sm text-gray-500">
          当前账号为普通成员，仅可查看成员信息。
        </div>
      )}

      {memberLoading ? (
        <div className="text-sm text-gray-500">成员加载中...</div>
      ) : null}

      {!memberLoading && memberError ? (
        <div className="text-sm text-red-500">{memberError}</div>
      ) : null}

      {!memberLoading && memberNotice ? (
        <div className="text-sm text-[#6F8F5D]">{memberNotice}</div>
      ) : null}

      {!memberLoading ? (
        members.length > 0 ? (
          <div className="group grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.map((member) => {
              const memberId = Number(member.id);
              const canRemoveMember = isGroupOwner && Number(currentUserId) !== memberId;
              return (
                <article
                  key={`${member.group_id}-${member.id}`}
                  className="group/member rounded-xl border border-[#ECEBE8] p-4 bg-[#FCFCFB] transition-all duration-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between rounded-lg px-1 py-1 transition-colors duration-300 group-hover/member:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt="成员头像" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#A3B18A] text-white flex items-center justify-center font-medium">
                          {(member.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-800">{member.username}</div>
                        <div className="text-xs text-gray-500">{member.email || '暂无邮箱'}</div>
                      </div>
                    </div>
                    <div className="ml-auto flex items-center">
                      <span className="text-xs px-2 py-1 rounded-full bg-[#EEF4E7] text-[#6E8B54] whitespace-nowrap">
                        {member.role === 'member' ? '普通成员' : member.role || '成员'}
                      </span>
                      <div className="w-8 flex items-center justify-end">
                        {canRemoveMember ? (
                          <button
                            type="button"
                            onClick={() => openRemoveMemberConfirm(member)}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 opacity-0 pointer-events-none transition-all duration-300 group-hover/member:opacity-100 group-hover/member:pointer-events-auto hover:text-red-500 hover:bg-red-50"
                            aria-label="移除成员"
                            title="移除成员"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#DFE3D8] bg-[#FBFCF9] px-4 py-6 text-center text-sm text-gray-400">
            当前小组还没有成员数据
          </div>
        )
      ) : null}
    </section>
  );

  const renderDiscussion = () => (
    <section className="bg-white rounded-2xl p-6 md:p-7 border border-[#ECEBE8] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">讨论区</h2>
        <span className="text-xs text-gray-500">共 {discussions.length} 条消息</span>
      </div>

      <div className="rounded-xl border border-[#ECEBE8] bg-[#FAFAF9] p-4 max-h-[420px] overflow-y-auto space-y-3">
        {discussionLoading ? <div className="text-sm text-gray-500">讨论加载中...</div> : null}
        {!discussionLoading && discussions.length === 0 ? (
          <div className="text-sm text-gray-400">还没有讨论消息，发一条开启协作吧。</div>
        ) : null}

        {!discussionLoading &&
          discussions.map((item) => {
            const isSelf = Number(item.user_id) === Number(currentUserId);
            const timeText = formatDiscussionTime(item.created_at);

            return (
              <article key={item.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] min-w-0 flex items-end gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                  {item.avatar ? (
                    <img src={item.avatar} alt="用户头像" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#A3B18A] text-white text-xs flex items-center justify-center shrink-0">
                      {(item.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
                    <div className={`px-1 text-[11px] text-gray-400 ${isSelf ? 'text-right' : 'text-left'}`}>
                      {item.username || '未知用户'}
                      {timeText ? ` · ${timeText}` : ''}
                    </div>

                    <div
                      className={`px-3 py-2 ${
                        isSelf
                          ? 'bg-[#F1F5F9] text-slate-800 rounded-[20px] rounded-tr-md shadow-sm'
                          : 'bg-white text-slate-700 rounded-[20px] rounded-tl-md shadow-sm border border-gray-100'
                      }`}
                    >
                      <p
                        className={`text-sm whitespace-pre-wrap break-all [overflow-wrap:anywhere] ${
                          isSelf ? 'text-right' : 'text-left'
                        }`}
                      >
                        {renderMessage(item.content)}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-3">
        <div className="flex-1">
          <MentionsInput
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder="输入讨论内容，输入 @ 呼出成员，按回车发送"
            singleLine
            style={mentionInputStyle}
            a11ySuggestionsListLabel="成员提及建议"
          >
            <Mention
              trigger="@"
              data={mentionData}
              markup="@[__display__](__id__)"
              displayTransform={(id, display) => `@${display}`}
              style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '4px'
              }}
            />
          </MentionsInput>
        </div>
        <button
          type="submit"
          disabled={sendingMessage}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70"
        >
          <SendHorizonal className="h-4 w-4" />
          {sendingMessage ? '发送中...' : '发送'}
        </button>
      </form>

      {discussionError ? <div className="text-sm text-red-500">{discussionError}</div> : null}
    </section>
  );

  const renderStats = () => (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
      <section className="bg-white rounded-2xl p-6 border border-[#ECEBE8] shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">小组完成度</h2>
        <div className="flex items-center justify-center">
          <div
            className="w-44 h-44 rounded-full relative"
            style={{
              background: `conic-gradient(#A3B18A ${groupStats.completionRate * 3.6}deg, #EBEFE5 0deg)`
            }}
          >
            <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-gray-800">{groupStats.completionRate}%</span>
              <span className="text-xs text-gray-500">已完成率</span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">总任务</span>
            <span className="font-medium text-gray-700">{groupStats.total}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">待处理</span>
            <span className="font-medium text-gray-700">{groupStats.pending}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">进行中</span>
            <span className="font-medium text-gray-700">{groupStats.inProgress}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">已完成</span>
            <span className="font-medium text-gray-700">{groupStats.completed}</span>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-6 border border-[#ECEBE8] shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">最近任务动态</h2>
        {groupStats.recentTasks.length === 0 ? (
          <div className="text-sm text-gray-500 rounded-xl border border-dashed border-[#DFE3D8] bg-[#FBFCF9] p-4">
            当前小组还没有任务，先去任务看板创建第一条任务吧。
          </div>
        ) : (
          <div className="space-y-3">
            {groupStats.recentTasks.map((task) => (
              <article key={task.id} className="rounded-xl border border-[#ECEBE8] p-4 bg-[#FCFCFB]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">{task.content}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#F2F5ED] text-[#6F8F5D]">{task.status}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderFiles = () => (
    <section className="bg-white rounded-2xl p-6 md:p-7 border border-[#ECEBE8] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">资料共享</h2>
          <p className="text-sm text-gray-500 mt-1">共享组内学习资料，支持真实文件上传与下载。</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFileError('');
            setSelectedUploadFile(null);
            setFileInputKey((prev) => prev + 1);
            setShareModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] transition-colors"
        >
          <Plus className="h-4 w-4" />
          分享新资料
        </button>
      </div>

      <div className="rounded-2xl border border-[#ECEBE8] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.2fr_0.9fr_0.8fr_0.9fr_0.7fr] px-4 py-3 bg-[#F8FAF5] text-xs tracking-wide text-gray-500">
          <span>资料名称</span>
          <span>分享者</span>
          <span>文件大小</span>
          <span>上传时间</span>
          <span>下载</span>
        </div>

        {fileLoading ? <div className="px-4 py-6 text-sm text-gray-500">资料加载中...</div> : null}
        {!fileLoading && fileError ? <div className="px-4 py-6 text-sm text-red-500">{fileError}</div> : null}

        {!fileLoading && !fileError && sharedFiles.length === 0 ? (
          <div className="px-4 py-8 text-sm text-gray-400">当前还没有共享资料，点击右上角按钮发布第一条吧。</div>
        ) : null}

        {!fileLoading && !fileError && sharedFiles.length > 0 ? (
          <div className="divide-y divide-[#ECEBE8]">
            {sharedFiles.map((item) => {
              const downloadUrl = buildDownloadUrl(item.file_url);
              const canDelete = Number(currentUserId) === Number(item.uploader_id);
              return (
                <article
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-[1.2fr_0.9fr_0.8fr_0.9fr_0.7fr] gap-2 px-4 py-4 text-sm"
                >
                  <div className="font-medium text-gray-800">{item.file_name}</div>
                  <div className="text-gray-600">{item.username || '未知用户'}</div>
                  <div className="text-gray-600">{formatFileSize(item.file_size)}</div>
                  <div className="text-gray-500">{formatDiscussionTime(item.created_at)}</div>
                  <div className="flex md:justify-start">
                    {downloadUrl ? (
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={downloadUrl}
                          download={item.file_name}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-[#DCE6D5] bg-[#F7FAF4] text-[#6F8F5D] hover:bg-[#EEF4E7] hover:text-[#5B774A] transition-colors"
                        >
                          下载
                        </a>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(item.id)}
                            className="text-rose-400 hover:text-rose-500 hover:bg-rose-50/50 px-3 py-1.5 rounded-md transition-all"
                          >
                            删除
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-gray-400">不可用</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );

  const renderActiveTab = () => {
    if (activeTab === 'members') {
      return renderMembers();
    }
    if (activeTab === 'discussion') {
      return renderDiscussion();
    }
    if (activeTab === 'stats') {
      return renderStats();
    }
    if (activeTab === 'files') {
      return renderFiles();
    }
    return renderTaskBoard();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,#eef5e3_0%,#f9f8f6_45%,#f9f8f6_100%)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="bg-white/85 backdrop-blur rounded-3xl border border-[#E8E7E4] p-6 md:p-8 shadow-[0_14px_30px_rgba(20,20,20,0.05)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/groups')}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                返回小组列表
              </button>
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">{group?.name || '小组工作区'}</h1>
              <p className="text-sm text-gray-500">{group?.description || '围绕任务协作、讨论与统计的集中工作台。'}</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-[#F4F7EF] border border-[#E4E9DA]">
              <div className="text-xs text-gray-500">当前任务总量</div>
              <div className="text-xl font-semibold text-[#6F8F5D]">{tasks.length}</div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[#ECEBE8] p-2 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              const isDiscussionTab = tab.key === 'discussion';
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`${
                    isDiscussionTab ? 'relative' : ''
                  } flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 ${
                    active
                      ? 'bg-[#A3B18A] text-white shadow-[0_6px_14px_rgba(123,148,94,0.35)]'
                      : 'text-gray-600 hover:bg-[#F5F7F2]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {isDiscussionTab && currentUnread > 0 && activeTab !== 'discussion' ? (
                    <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[20px] h-5 bg-rose-500 text-white text-xs font-bold px-1.5 rounded-full shadow-sm border-2 border-white z-10 transition-transform duration-300 transform scale-100">
                      {currentUnread > 99 ? '99+' : currentUnread}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center text-gray-500">加载中...</div>
        ) : (
          <section className="transition-all duration-300 ease-out">{renderActiveTab()}</section>
        )}

        {error ? <div className="text-red-500 text-sm">{error}</div> : null}
      </div>

      {shareModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#ECEBE8] shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ECEBE8]">
              <h3 className="text-base font-semibold text-gray-800">分享新资料</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedUploadFile(null);
                  setFileInputKey((prev) => prev + 1);
                  setShareModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleShareFile} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm text-gray-600" htmlFor="shared-upload-file">
                  选择上传文件
                </label>
                <div className="rounded-xl border border-dashed border-[#D7E2CF] bg-[#F8FBF5] px-4 py-4">
                  <input
                    key={fileInputKey}
                    id="shared-upload-file"
                    type="file"
                    onChange={(event) => {
                      const pickedFile = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                      setSelectedUploadFile(pickedFile);
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#EAF2E1] file:text-[#6F8F5D] hover:file:bg-[#DFEAD2]"
                  />
                  <p className="mt-3 text-xs text-gray-500">
                    {selectedUploadFile ? `已选择：${selectedUploadFile.name}` : '点击上方按钮选择文件进行上传'}
                  </p>
                </div>
              </div>

              {fileError ? <div className="text-sm text-red-500">{fileError}</div> : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUploadFile(null);
                    setFileInputKey((prev) => prev + 1);
                    setShareModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-[#E4E7DF] text-gray-600 hover:bg-[#F7F8F5] transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={sharingFile}
                  className="px-4 py-2.5 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70 transition-colors"
                >
                  {sharingFile ? '提交中...' : '确认分享'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isConfirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={closeRemoveMemberConfirm}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 md:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold text-slate-800">确认移出该成员吗？</h3>
              <p className="text-sm leading-6 text-slate-500">
                移出后，该成员将无法查看本小组的任务和文件。您确定要执行此操作吗？
              </p>
            </div>

            {pendingRemoveMember?.username ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-600 text-center">
                目标成员：{pendingRemoveMember.username}
              </div>
            ) : null}

            <div className="mt-6 flex gap-4">
              <button
                type="button"
                onClick={closeRemoveMemberConfirm}
                disabled={removingMember}
                className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-2.5 hover:bg-slate-100 transition-colors disabled:opacity-70"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={removingMember}
                className="flex-1 bg-[#DC2626]/80 text-white rounded-xl py-2.5 hover:bg-[#DC2626] transition-colors disabled:opacity-70"
              >
                {removingMember ? '移除中...' : '确认移除'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupDetail;
