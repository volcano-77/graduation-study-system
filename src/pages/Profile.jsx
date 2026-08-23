import { useEffect, useMemo, useState } from 'react';
import apiClient from '../api/client';

function Profile() {
  const [activeTab, setActiveTab] = useState('basic');
  const [profile, setProfile] = useState(null);

  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [basicError, setBasicError] = useState('');
  const [securityError, setSecurityError] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [toast, setToast] = useState({ visible: false, type: 'success', message: '' });

  const avatarText = useMemo(() => {
    const name = nickname || profile?.username || 'U';
    return name.charAt(0).toUpperCase();
  }, [nickname, profile]);

  const showToast = (type, message) => {
    setToast({ visible: true, type, message });
  };

  const notifyAvatarUpdated = () => {
    window.dispatchEvent(new Event('userAvatarUpdated'));
  };

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.visible]);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.get('/api/user/profile');
        if (!data.success || !data.user) {
          throw new Error(data.message || '获取个人资料失败');
        }

        if (!mounted) {
          return;
        }

        setProfile(data.user);
        setNickname(data.user.username || '');
        setBio(data.user.motto || '');
        setAvatarPreview(data.user.avatar || '');
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (error) {
        if (mounted) {
          showToast('error', error.message || '获取个人资料失败');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setBasicError('请上传图片格式文件');
      return;
    }

    setBasicError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBasic = async (event) => {
    event.preventDefault();
    const normalizedNickname = nickname.trim();
    const normalizedBio = bio.trim();

    if (!normalizedNickname) {
      setBasicError('昵称不能为空');
      return;
    }

    setIsSavingBasic(true);
    setBasicError('');

    try {
      const data = await apiClient.put('/api/user/profile', {
        nickname: normalizedNickname,
        bio: normalizedBio,
        avatar: avatarPreview
      });

      if (!data.success || !data.user) {
        throw new Error(data.message || '保存失败');
      }

      setProfile(data.user);
      setNickname(data.user.username || '');
      setBio(data.user.motto || '');
      setAvatarPreview(data.user.avatar || '');
      localStorage.setItem('user', JSON.stringify(data.user));
      notifyAvatarUpdated();
      showToast('success', '基本资料已更新');
    } catch (error) {
      setBasicError(error.message || '保存失败，请稍后重试');
    } finally {
      setIsSavingBasic(false);
    }
  };

  const handleSaveSecurity = async (event) => {
    event.preventDefault();
    const normalizedOldPassword = oldPassword.trim();
    const normalizedNewPassword = newPassword.trim();
    const normalizedConfirm = confirmPassword.trim();

    if (!normalizedOldPassword || !normalizedNewPassword || !normalizedConfirm) {
      setSecurityError('请完整填写密码信息');
      return;
    }

    if (normalizedNewPassword.length < 4) {
      setSecurityError('新密码至少需要 4 位');
      return;
    }

    if (normalizedNewPassword !== normalizedConfirm) {
      setSecurityError('两次输入的新密码不一致');
      return;
    }

    setIsSavingSecurity(true);
    setSecurityError('');

    try {
      const data = await apiClient.put('/api/user/profile', {
        oldPassword: normalizedOldPassword,
        newPassword: normalizedNewPassword
      });

      if (!data.success || !data.user) {
        throw new Error(data.message || '更新密码失败');
      }

      setProfile(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', '账号安全信息已更新');
    } catch (error) {
      setSecurityError(error.message || '更新密码失败');
    } finally {
      setIsSavingSecurity(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-gray-800">账户设置</h1>
          <p className="text-sm text-gray-500">管理你的基本资料和账号安全。</p>
        </div>

        <div className="inline-flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'basic' ? 'bg-[#A3B18A] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            基本资料
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'security' ? 'bg-[#A3B18A] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            账号安全
          </button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center text-gray-500">加载中...</div>
        ) : null}

        {!isLoading && activeTab === 'basic' ? (
          <form onSubmit={handleSaveBasic} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
              <div className="space-y-4">
                <div className="w-40 h-40 rounded-2xl bg-[#F0F0F0] overflow-hidden flex items-center justify-center text-[#A3B18A] text-4xl font-medium">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                  ) : (
                    <span>{avatarText}</span>
                  )}
                </div>
                <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition-colors">
                  上传头像
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
                <div className="text-xs text-gray-400">支持 JPG / PNG，仅做预览并保存到个人资料。</div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium text-gray-600 mb-2">
                    昵称
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
                    placeholder="请输入昵称"
                  />
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-600 mb-2">
                    个人简介 / 学习宣言
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    className="w-full px-4 py-3 min-h-[120px] rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
                    placeholder="写点什么让大家更了解你"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">邮箱</label>
                  <div className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm">
                    {profile?.email || '暂无邮箱'}
                  </div>
                </div>
              </div>
            </div>

            {basicError ? <div className="text-sm text-red-500">{basicError}</div> : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingBasic}
                className="px-6 py-3 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70"
              >
                {isSavingBasic ? '保存中...' : '保存基本资料'}
              </button>
            </div>
          </form>
        ) : null}

        {!isLoading && activeTab === 'security' ? (
          <form onSubmit={handleSaveSecurity} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-gray-800">修改密码</h2>
              <p className="text-sm text-gray-500">为了账号安全，修改密码需要验证原密码。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  原密码
                </label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
                  placeholder="请输入当前密码"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  新密码
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
                  placeholder="请输入新密码"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-2">
                  确认新密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F6F6F6] border border-transparent focus:border-[#A3B18A] focus:outline-none"
                  placeholder="请再次输入新密码"
                />
              </div>
            </div>

            {securityError ? <div className="text-sm text-red-500">{securityError}</div> : null}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSavingSecurity}
                className="px-6 py-3 rounded-xl bg-[#A3B18A] text-white hover:bg-[#91A078] disabled:opacity-70"
              >
                {isSavingSecurity ? '保存中...' : '更新密码'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {toast.visible ? (
        <div
          className={`fixed top-6 right-6 px-4 py-3 rounded-xl text-sm shadow-lg ${
            toast.type === 'success' ? 'bg-[#A3B18A] text-white' : 'bg-[#FDECEC] text-[#9D3D3D]'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}

export default Profile;
