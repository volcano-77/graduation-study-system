import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { io } from 'socket.io-client';
import apiClient, { API_BASE_URL } from '../api/client';
import { useMessage } from '../context/MessageContext';

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());
  const { addUnread } = useMessage();
  const [chatToast, setChatToast] = useState(null);
  const hideTimerRef = useRef(null);
  const activeDiscussionRef = useRef({ groupId: null, isDiscussion: false });
  const groupNameMapRef = useRef(new Map());

  useEffect(() => {
    setCurrentUser(readUserFromStorage());
  }, []);

  useEffect(() => {
    const refreshUser = () => {
      setCurrentUser(readUserFromStorage());
    };

    window.addEventListener('storage', refreshUser);
    window.addEventListener('userAvatarUpdated', refreshUser);
    return () => {
      window.removeEventListener('storage', refreshUser);
      window.removeEventListener('userAvatarUpdated', refreshUser);
    };
  }, []);

  useEffect(() => {
    const match = location.pathname.match(/^\/groups\/(\d+)$/);
    if (!match) {
      activeDiscussionRef.current = { groupId: null, isDiscussion: false };
      return;
    }

    const matchedGroupId = Number(match[1]);
    const tab = new URLSearchParams(location.search).get('tab');
    activeDiscussionRef.current = {
      groupId: Number.isInteger(matchedGroupId) ? matchedGroupId : null,
      isDiscussion: tab === 'discussion'
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleTabChange = (event) => {
      const nextGroupId = Number(event?.detail?.groupId);
      const nextTab = event?.detail?.activeTab;
      if (!Number.isInteger(nextGroupId)) {
        return;
      }

      activeDiscussionRef.current = {
        groupId: nextGroupId,
        isDiscussion: nextTab === 'discussion'
      };
    };

    window.addEventListener('group-discussion:tab-change', handleTabChange);
    return () => {
      window.removeEventListener('group-discussion:tab-change', handleTabChange);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin') {
      return undefined;
    }
    const socket = io(API_BASE_URL, {
      transports: ['websocket']
    });

    const joinMyGroups = async () => {
      try {
        const groupsData = await apiClient.get('/api/groups');
        const groups = groupsData?.success && Array.isArray(groupsData.groups) ? groupsData.groups : [];
        const nextGroupNameMap = new Map();
        groups.forEach((group) => {
          const normalizedGroupId = Number(group.id);
          if (!Number.isInteger(normalizedGroupId)) {
            return;
          }
          socket.emit('join_group', normalizedGroupId);
          nextGroupNameMap.set(normalizedGroupId, group.name || `小组 #${normalizedGroupId}`);
        });
        groupNameMapRef.current = nextGroupNameMap;
      } catch (error) {
        // 静默处理，避免影响页面主流程
      }
    };

    const handleNewMessage = (latest) => {
      const incomingGroupId = Number(latest?.group_id ?? latest?.groupId);
      if (!Number.isInteger(incomingGroupId)) {
        return;
      }

      window.dispatchEvent(
        new CustomEvent('group-discussion:new-message', {
          detail: {
            groupId: incomingGroupId,
            messageId: Number(latest?.id) || null,
            message: latest
          }
        })
      );

      const senderId = Number(latest?.user_id ?? latest?.userId);
      if (senderId === Number(currentUser.id)) {
        return;
      }

      const activeDiscussion = activeDiscussionRef.current;
      const isViewingCurrentDiscussion =
        activeDiscussion.isDiscussion && Number(activeDiscussion.groupId) === incomingGroupId;
      if (isViewingCurrentDiscussion) {
        return;
      }

      addUnread(incomingGroupId);
      setChatToast({
        groupId: incomingGroupId,
        groupName:
          latest?.group_name ||
          latest?.groupName ||
          groupNameMapRef.current.get(incomingGroupId) ||
          `小组 #${incomingGroupId}`,
        senderName: latest?.username || latest?.senderName || '未知成员',
        senderAvatar: latest?.avatar || latest?.senderAvatar || '',
        content: latest?.content || ''
      });
    };

    socket.on('new_message', handleNewMessage);
    joinMyGroups();

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.disconnect();
    };
  }, [currentUser, addUnread]);

  useEffect(() => {
    if (!chatToast) {
      return undefined;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setChatToast(null);
    }, 5000);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [chatToast]);

  const handleToastClick = () => {
    if (!chatToast?.groupId) {
      return;
    }
    setChatToast(null);
    navigate(`/groups/${chatToast.groupId}?tab=discussion`);
  };

  return (
    <div className="flex w-full min-h-screen">
      <Sidebar />
      <main className="ml-0 md:ml-64 flex-1 w-full min-w-0">
        <Outlet />
      </main>
      {chatToast && currentUser?.role !== 'admin' ? (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-[380px] max-w-[calc(100vw-2rem)] animate-bounce">
          <button
            type="button"
            onClick={handleToastClick}
            className="w-full text-left bg-white/95 backdrop-blur-md shadow-2xl border-t-4 border-[#9BB098] rounded-xl p-4 transition-all duration-300 hover:shadow-2xl"
          >
            <div className="text-sm font-semibold text-slate-800 truncate">{chatToast.groupName}</div>
            <div className="mt-2 flex items-center gap-2">
              {chatToast.senderAvatar ? (
                <img src={chatToast.senderAvatar} alt="发送者头像" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#9BB098] text-white text-xs flex items-center justify-center">
                  {(chatToast.senderName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs text-slate-600 truncate">{chatToast.senderName}</div>
                <div className="text-sm text-slate-700 truncate">{chatToast.content}</div>
              </div>
            </div>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default Layout;
