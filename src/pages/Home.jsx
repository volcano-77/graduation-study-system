import React from 'react';

function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          在线学习小组协作系统
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          基于 React 构建的现代化学习协作平台
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
          >
            登录
          </a>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg shadow hover:bg-gray-300 transition-colors"
          >
            进入仪表�?          </a>
        </div>
      </div>
    </div>
  );
}

export default Home;
