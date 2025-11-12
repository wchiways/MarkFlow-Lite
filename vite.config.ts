import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: (id) => {
        // 将这些大型依赖设为外部依赖，避免打包问题
        return id.includes('d3-') || id.includes('@types/d3-')
      },
      output: {
        manualChunks: undefined // 禁用代码分割
      }
    }
  },
  publicDir: 'public',
  optimizeDeps: {
    // 排除有问题的依赖进行预构建
    exclude: ['html2pdf.js', 'mermaid', 'd3-*', '@types/d3-*']
  }
})