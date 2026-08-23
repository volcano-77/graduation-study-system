import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // 允许本地网络访问
    port: 5173,      // 锁定端口，防止它乱跳
    open: true,      // 启动时自动打开浏览器，不用你手动点链接
    strictPort: true // 如果 5173 被占用直接报错，而不是悄悄换端口
  }
})