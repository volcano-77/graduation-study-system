import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CheckSquare,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCircle2,
  Users
} from 'lucide-react';
import apiClient from '../api/client';
import { getNotificationBadgeCount } from '../utils/notifications';

function readUserFromStorage() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => readUserFromStorage());
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(0);
  const menuRef = useRef(null);

  const nickname = currentUser?.username || '';
  const avatarUrl = currentUser?.avatar || '';
  const role = currentUser?.role === 'admin' ? 'admin' : 'user';
  const isAdmin = role === 'admin';

  const fetchUnreadNotifications = useCallback(async () => {
    if (isAdmin) {
      setNotificationBadgeCount(0);
      return;
    }

    try {
      const data = await apiClient.get('/api/notifications');
      if (!data?.success) {
        setNotificationBadgeCount(0);
        return;
      }

      setNotificationBadgeCount(getNotificationBadgeCount(data.notifications));
    } catch (error) {
      setNotificationBadgeCount(0);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [navigate, currentUser]);

  useEffect(() => {
    setCurrentUser(readUserFromStorage());
  }, [location.pathname]);

  useEffect(() => {
    const handleUserAvatarUpdated = () => {
      setCurrentUser(readUserFromStorage());
    };

    window.addEventListener('userAvatarUpdated', handleUserAvatarUpdated);
    return () => {
      window.removeEventListener('userAvatarUpdated', handleUserAvatarUpdated);
    };
  }, []);

  useEffect(() => {
    fetchUnreadNotifications();
  }, [fetchUnreadNotifications]);

  useEffect(() => {
    if (isAdmin) {
      return undefined;
    }

    const pollTimer = window.setInterval(() => {
      fetchUnreadNotifications();
    }, 3000);

    return () => {
      window.clearInterval(pollTimer);
    };
  }, [fetchUnreadNotifications, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      return undefined;
    }
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      return undefined;
    }

    const handleNotificationsUpdated = () => {
      fetchUnreadNotifications();
    };

    window.addEventListener('notifications-updated', handleNotificationsUpdated);
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdated);
    };
  }, [fetchUnreadNotifications, isAdmin]);

  const getAvatarText = () => {
    if (!nickname) {
      return '?';
    }
    return nickname.charAt(0).toUpperCase();
  };

  const userNavItems = [
    { name: '学习空间', path: '/dashboard', icon: Home },
    { name: '我的小组', path: '/groups', icon: Users },
    { name: '消息通知', path: '/notifications', icon: Bell, badge: notificationBadgeCount },
    { name: '个人设置', path: '/profile', icon: Settings }
  ];

  const adminNavItems = [
    { name: '📊 数据大盘', path: '/admin/overview', icon: LayoutDashboard },
    { name: '👥 用户管理', path: '/admin/users', icon: Users },
    { name: '🏢 小组监督', path: '/admin/groups', icon: Building2 },
    { name: '✅ 任务监管', path: '/admin/tasks', icon: CheckSquare },
    { name: '📁 资料审查', path: '/admin/files', icon: FileText }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;
  const currentPath = location.pathname;

  const isMenuActive = (itemPath) => {
    if (isAdmin && itemPath === '/admin/overview') {
      return currentPath === '/admin/overview' || currentPath === '/admin';
    }
    return currentPath === itemPath;
  };

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleOpenProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  return (
    <>
      <div
        className={`hidden md:flex w-64 h-screen fixed left-0 top-0 p-6 flex-col space-y-6 shadow-lg z-10 ${
          isAdmin ? 'bg-[#EEF2F6]' : 'bg-[#F5F3F0]'
        }`}
      >
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center gap-3.5">
            {/* 鼠尾草绿底座的极简 S 图标 */}
            <div className="flex items-center justify-center w-10 h-10 bg-[#9BB098] rounded-xl shadow-sm">
              <span className="text-white text-2xl font-bold font-sans">S</span>
            </div>

            {/* 右侧：结构化名称 */}
            <div className="flex flex-col">
              <span className="text-slate-800 text-base font-bold tracking-widest font-sans">学习协作系统</span>
              <span className="text-slate-400 text-[10px] font-medium tracking-widest">CO-STUDY PLATFORM</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isAdmin
                    ? isActive
                      ? 'bg-[#DDE5F3] text-[#2F4B7C] shadow-sm'
                      : 'text-gray-700 hover:bg-[#E5EBF6]'
                    : isActive
                      ? 'bg-[#E8F5E8] text-[#A3B18A] shadow-sm'
                      : 'text-gray-600 hover:bg-[#F0F0F0] hover:translate-x-1'
                }`}
              >
                <span className="relative inline-flex">
                  <Icon className="h-5 w-5" />
                  {Number(item.badge) > 0 ? (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D15D5D] text-white text-[10px] leading-[18px] text-center">
                      {Number(item.badge) > 99 ? '99+' : Number(item.badge)}
                    </span>
                  ) : null}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {isAdmin ? (
          <div className="pt-6 border-t border-[#D4DCE9] space-y-3">
            <div className="px-3 py-2 rounded-xl bg-[#E5EBF6] text-sm text-[#2F4B7C]">
              管理员：{nickname || 'admin'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm rounded-xl bg-[#FDECEC] text-[#9D3D3D] hover:bg-[#FADADA] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </button>
          </div>
        ) : (
          <div className="pt-6 border-t border-gray-200 relative" ref={menuRef}>
            {menuOpen ? (
              <div className="absolute left-0 right-0 bottom-full mb-3 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-20">
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <UserCircle2 className="h-4 w-4" />
                  <span>个人主页</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#9D3D3D] hover:bg-[#FDECEC] rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  <span>退出登录</span>
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0F0F0] rounded-xl transition-all duration-300"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="用户头像" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#A3B18A] flex items-center justify-center text-white font-medium">
                  {getAvatarText()}
                </div>
              )}
              <div className="text-left">
                <div className="text-sm font-medium text-gray-700">{nickname || '[你的名字]'}</div>
                <div className="text-xs text-gray-400">学生</div>
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg z-20">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMenuActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center px-3 py-2 transition-all duration-300 ${
                  isActive ? (isAdmin ? 'text-[#2F4B7C]' : 'text-[#A3B18A]') : 'text-gray-600'
                }`}
              >
                <span className="relative inline-flex">
                  <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''}`} />
                  {Number(item.badge) > 0 ? (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D15D5D] text-white text-[9px] leading-[16px] text-center">
                      {Number(item.badge) > 99 ? '99+' : Number(item.badge)}
                    </span>
                  ) : null}
                </span>
                <span className="text-[11px] mt-1">{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex flex-col items-center justify-center px-3 py-2 text-[#9D3D3D]"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[11px] mt-1">退出</span>
          </button>
        </div>
      </div>

      <div className="md:hidden pb-16"></div>
    </>
  );
}

export default Sidebar;
