import { useEffect, useState } from 'react';
import { User, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 进入登录页视为重新认证，避免历史 token 造成“看起来随便都能进”
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 每次登录前先清理旧态，确保只以本次后端结果为准
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const res = await apiClient.post(
        '/api/login',
        {
          username: username.trim(),
          password
        },
        { returnMeta: true }
      );

      // 强制要求：状态码 200 且 token 存在，才允许写入并跳转
      if (res.status === 200 && res.data?.token) {
        localStorage.setItem('token', res.data.token);
        const user = res.data.user || {};
        localStorage.setItem('user', JSON.stringify(user));
        navigate(user.role === 'admin' ? '/admin/overview' : '/dashboard');
        return;
      }

      setError('登录失败，请检查账号密码');
    } catch (requestError) {
      if (requestError.status === 401) {
        setError('账号或密码错误');
      } else if (requestError.status === 400) {
        setError('用户名和密码不能为空');
      } else {
        setError(requestError.message || '登录失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-[0_15px_60px_rgba(0,0,0,0.04)] p-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-medium text-gray-700">欢迎回来</h1>
          <p className="text-sm text-gray-400">请输入账号密码登录系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? <div className="text-center text-red-500 text-sm">{error}</div> : null}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <User className="h-4 w-4 text-gray-300" />
            </div>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full pl-14 pr-5 py-4 bg-[#F0F0F0] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#A3B18A] transition-all duration-300"
              placeholder="用户名"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Lock className="h-4 w-4 text-gray-300" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full pl-14 pr-5 py-4 bg-[#F0F0F0] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#A3B18A] transition-all duration-300"
              placeholder="密码"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#A3B18A] text-white font-medium rounded-xl hover:bg-[#91A078] focus:outline-none focus:ring-2 focus:ring-[#A3B18A] disabled:opacity-70 transition-transform duration-300 hover:scale-105"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>登录中...</span>
              </div>
            ) : (
              <span>登录</span>
            )}
          </button>

          <div className="text-center text-sm text-gray-500">
            <span>没有账号？</span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="ml-1 text-[#7A9A58] hover:text-[#6B8750] underline underline-offset-4"
            >
              点击注册
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
