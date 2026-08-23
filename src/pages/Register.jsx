import { useState } from 'react';
import { User, Mail, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiClient.post('/api/register', {
        username: username.trim(),
        email: email.trim(),
        password
      });

      if (data.success) {
        navigate('/login', { replace: true });
        return;
      }

      setError(data.message || '注册失败，请稍后重试');
    } catch (requestError) {
      if (requestError.status === 409) {
        setError('用户名或邮箱已存在');
      } else if (requestError.status === 400) {
        setError('请完整填写昵称、邮箱和密码');
      } else {
        setError(requestError.message || '注册失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-[40px] shadow-[0_15px_60px_rgba(0,0,0,0.06)] p-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-medium text-gray-700">创建账号</h1>
          <p className="text-sm text-gray-400">填写基础信息以开启学习协作</p>
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
              placeholder="昵称"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none">
              <Mail className="h-4 w-4 text-gray-300" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full pl-14 pr-5 py-4 bg-[#F0F0F0] rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#A3B18A] transition-all duration-300"
              placeholder="邮箱"
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
              autoComplete="new-password"
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
                <span>注册中...</span>
              </div>
            ) : (
              <span>注册</span>
            )}
          </button>

          <div className="text-center text-sm text-gray-500">
            <span>已有账号？</span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="ml-1 text-[#7A9A58] hover:text-[#6B8750] underline underline-offset-4"
            >
              返回登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
