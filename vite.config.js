import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // 允许局域网访问
    open: true       // 自动打开浏览器
  }
}) 