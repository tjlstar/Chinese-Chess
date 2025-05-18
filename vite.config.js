import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0', // 允许局域网访问
    open: true       // 自动打开浏览器
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: undefined
      }
    },
    assetsDir: 'assets',
    outDir: 'dist'
  },
  assetsInclude: ['**/*.mp3'],
  base: '' // 空字符串表示使用相对于HTML文件的相对路径
}) 