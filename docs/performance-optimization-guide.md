# MarkFlow-Lite 性能优化指南

## 概述

MarkFlow-Lite 作为一个轻量级的 Markdown 编辑器，性能优化是提供流畅用户体验的关键。本指南从多个维度详细介绍如何优化应用性能，包括前端代码优化、构建优化、运行时优化和用户体验优化。

## 目录

1. [性能指标和监控](#性能指标和监控)
2. [构建时优化](#构建时优化)
3. [运行时性能优化](#运行时性能优化)
4. [代码优化策略](#代码优化策略)
5. [内存管理](#内存管理)
6. [网络优化](#网络优化)
7. [用户体验优化](#用户体验优化)
8. [性能测试和分析](#性能测试和分析)
9. [移动端性能优化](#移动端性能优化)
10. [性能监控和调试](#性能监控和调试)

## 性能指标和监控

### 关键性能指标（KPIs）

#### 核心 Web Vitals

```typescript
// src/monitoring/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

interface CoreWebVitals {
  // 累积布局偏移 - 测量视觉稳定性
  cls: number
  // 首次输入延迟 - 测量交互性
  fid: number
  // 首次内容绘制 - 测量感知加载速度
  fcp: number
  // 最大内容绘制 - 测量加载性能
  lcp: number
  // 首字节时间 - 测量服务器响应时间
  ttfb: number
}

export function trackWebVitals() {
  const vitals: Partial<CoreWebVitals> = {}

  getCLS((metric) => {
    vitals.cls = metric.value
    reportMetric('CLS', metric.value)
  })

  getFID((metric) => {
    vitals.fid = metric.value
    reportMetric('FID', metric.value)
  })

  getFCP((metric) => {
    vitals.fcp = metric.value
    reportMetric('FCP', metric.value)
  })

  getLCP((metric) => {
    vitals.lcp = metric.value
    reportMetric('LCP', metric.value)
  })

  getTTFB((metric) => {
    vitals.ttfb = metric.value
    reportMetric('TTFB', metric.value)
  })

  return vitals
}

function reportMetric(name: string, value: number) {
  console.log(`${name}: ${value.toFixed(2)}`)

  // 发送到分析服务
  if (import.meta.env.PROD) {
    // 这里可以集成 Google Analytics 或其他分析服务
    gtag('event', 'web_vitals', {
      name,
      value: Math.round(name === 'CLS' ? value * 1000 : value)
    })
  }
}
```

#### 自定义性能指标

```typescript
// src/monitoring/custom-metrics.ts
export class PerformanceTracker {
  private metrics: Map<string, number> = new Map()

  // 测量 Markdown 渲染时间
  measureMarkdownRender(content: string) {
    const start = performance.now()

    // 模拟渲染过程
    import('../utils/markdown').then(({ renderMarkdown }) => {
      const html = renderMarkdown(content)
      const end = performance.now()

      const duration = end - start
      this.metrics.set('markdown_render', duration)

      console.log(`Markdown render time: ${duration.toFixed(2)}ms`)

      // 如果渲染时间过长，触发警告
      if (duration > 100) {
        this.reportPerformanceIssue('markdown_render_slow', duration)
      }
    })
  }

  // 测量文件保存时间
  measureFileSave(content: string, callback: () => Promise<void>) {
    const start = performance.now()

    callback().then(() => {
      const end = performance.now()
      const duration = end - start

      this.metrics.set('file_save', duration)
      console.log(`File save time: ${duration.toFixed(2)}ms`)
    })
  }

  // 测量 Mermaid 图表渲染时间
  measureMermaidRender() {
    const start = performance.now()

    // 等待 Mermaid 渲染完成
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name.includes('mermaid')) {
          const duration = entry.duration
          this.metrics.set('mermaid_render', duration)
          console.log(`Mermaid render time: ${duration.toFixed(2)}ms`)
        }
      })
    })

    observer.observe({ entryTypes: ['measure'] })
  }

  private reportPerformanceIssue(type: string, value: number) {
    // 发送性能问题报告
    console.warn(`Performance issue detected: ${type} = ${value}ms`)

    if (import.meta.env.PROD) {
      // 发送到错误监控服务
      import('./sentry').then(({ captureMessage }) => {
        captureMessage(`Performance issue: ${type}`, {
          level: 'warning',
          tags: { performance: type },
          extra: { value }
        })
      })
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics)
  }
}
```

## 构建时优化

### Vite 配置优化

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      // 启用 React Fast Refresh
      fastRefresh: true,
      // 包含 JSX 源映射用于更好的调试
      jsxImportSource: '@emotion/react'
    })
  ],

  // 路径别名优化
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@types': resolve(__dirname, 'src/types')
    }
  },

  // 优化构建
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,          // 生产环境不生成 source map
    minify: 'terser',          // 使用 terser 压缩
    target: 'es2015',          // 目标浏览器

    // 代码分割策略
    rollupOptions: {
      output: {
        // 手动分块配置
        manualChunks: {
          // React 核心库
          vendor: ['react', 'react-dom'],

          // Markdown 相关库
          markdown: ['markdown-it', 'markdown-it-katex', 'marked'],

          // 图标和 UI 库
          ui: ['react-icons', '@tailwindcss/typography'],

          // 工具库
          utils: ['dompurify', 'highlight.js', 'katex'],

          // AWS SDK（较大，单独打包）
          aws: ['@aws-sdk/client-s3'],

          // WebDAV 客户端
          webdav: ['webdav']
        },

        // 资源文件命名
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'vendor') return 'js/vendor.[hash].js'
          if (chunkInfo.name === 'markdown') return 'js/markdown.[hash].js'
          return 'js/[name].[hash].js'
        },

        entryFileNames: 'js/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'css/[name].[hash].[ext]'
          if (assetInfo.name?.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
            return 'images/[name].[hash].[ext]'
          }
          if (assetInfo.name?.match(/\.(woff|woff2|ttf|eot)$/i)) {
            return 'fonts/[name].[hash].[ext]'
          }
          return 'assets/[name].[hash].[ext]'
        }
      }
    },

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 构建性能优化
    chunkSizeWarningLimit: 1000,

    // 压缩配置
    terserOptions: {
      compress: {
        drop_console: true,    // 生产环境移除 console
        drop_debugger: true,   // 移除 debugger
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      mangle: {
        safari10: true
      }
    }
  },

  // 开发服务器配置
  server: {
    host: true,
    port: 3000,
    hmr: {
      overlay: false
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },

  // 预览服务器配置
  preview: {
    port: 4173,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },

  // 优化依赖
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-icons/fa',
      'markdown-it',
      'dompurify'
    ],
    exclude: [
      '@aws-sdk/client-s3',
      'webdav'
    ]
  },

  // CSS 配置
  css: {
    // 启用 CSS 模块
    modules: false,

    // PostCSS 配置
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
        require('cssnano')({
          preset: 'default'
        })
      ]
    },

    // 开发环境启用 source map
    devSourcemap: false
  },

  // 环境变量
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
```

### 依赖优化

```json
// package.json - 优化依赖版本
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.888.0",
    "@tailwindcss/typography": "^0.5.16",
    "dompurify": "^2.4.3",
    "highlight.js": "^11.11.1",
    "html2pdf.js": "^0.12.0",
    "katex": "^0.16.22",
    "markdown-it": "^14.1.0",
    "markdown-it-abbr": "^2.0.0",
    "markdown-it-deflist": "^3.0.0",
    "markdown-it-footnote": "^4.0.0",
    "markdown-it-ins": "^4.0.0",
    "markdown-it-katex": "^2.0.3",
    "markdown-it-mark": "^4.0.0",
    "markdown-it-sub": "^2.0.0",
    "markdown-it-sup": "^2.0.0",
    "marked": "^4.2.12",
    "mermaid": "^10.9.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-icons": "^4.8.0",
    "webdav": "^5.8.0"
  },
  "devDependencies": {
    "@types/dompurify": "^2.4.0",
    "@types/highlight.js": "^10.1.0",
    "@types/html2pdf.js": "^0.10.0",
    "@types/katex": "^0.16.7",
    "@types/markdown-it": "^14.1.2",
    "@types/marked": "^6.0.0",
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "@vitejs/plugin-react": "^3.1.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.21",
    "tailwindcss": "^3.3.0",
    "ts-node": "^10.9.2",
    "typescript": "^4.9.3",
    "vite": "^4.2.0",
    "vitest": "^0.29.2"
  }
}
```

## 运行时性能优化

### React 组件优化

#### 使用 React.memo 避免不必要的重渲染

```typescript
// src/components/Editor.tsx
import React, { memo, useCallback, useRef, useMemo } from 'react'
import { FaBold, FaItalic, FaHeading } from 'react-icons/fa'

interface EditorProps {
  markdown: string
  setMarkdown: (value: string) => void
  isDarkMode: boolean
  className?: string
}

// 使用 React.memo 进行浅比较优化
const Editor = memo<EditorProps>(({ markdown, setMarkdown, isDarkMode, className = '' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 使用 useCallback 缓存函数
  const insertText = useCallback((before: string, after: string = '') => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = markdown.substring(start, end)

    const newText =
      markdown.substring(0, start) +
      before +
      selectedText +
      after +
      markdown.substring(end)

    setMarkdown(newText)

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + before.length
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos + selectedText.length)
        textareaRef.current.focus()
      }
    }, 0)
  }, [markdown, setMarkdown])

  // 使用 useMemo 缓存计算结果
  const textareaClassName = useMemo(() => {
    const baseClasses = 'w-full h-full p-4 resize-none outline-none font-mono text-sm leading-relaxed'
    const themeClasses = isDarkMode
      ? 'bg-slate-800 text-slate-100 selection:bg-blue-600'
      : 'bg-white text-slate-900 selection:bg-blue-200'
    return `${baseClasses} ${themeClasses} ${className}`
  }, [isDarkMode, className])

  // 使用 useMemo 缓存工具栏按钮配置
  const toolbarButtons = useMemo(() => [
    { icon: FaBold, action: () => insertText('**', '**'), title: '粗体' },
    { icon: FaItalic, action: () => insertText('*', '*'), title: '斜体' },
    { icon: FaHeading, action: () => insertText('## ', ''), title: '标题' }
  ], [insertText])

  // 键盘快捷键处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          insertText('**', '**')
          break
        case 'i':
          e.preventDefault()
          insertText('*', '*')
          break
        case 's':
          e.preventDefault()
          // 触发保存
          break
      }
    }
  }, [insertText])

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-700">
        {toolbarButtons.map(({ icon: Icon, action, title }, index) => (
          <button
            key={index}
            onClick={action}
            title={title}
            className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* 编辑器 */}
      <textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        onKeyDown={handleKeyDown}
        className={textareaClassName}
        placeholder="开始输入 Markdown..."
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  )
})

// 设置显示名称便于调试
Editor.displayName = 'Editor'

export default Editor
```

#### 虚拟化长列表

```typescript
// src/components/VirtualizedFileList.tsx
import React, { useMemo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'

interface FileItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  modified: Date
}

interface VirtualizedFileListProps {
  files: FileItem[]
  onFileSelect: (file: FileItem) => void
  onFileDelete: (file: FileItem) => void
  itemHeight: number
  height: number
}

// 文件列表项组件
const FileListItem = memo<{
  index: number
  style: React.CSSProperties
  data: {
    files: FileItem[]
    onFileSelect: (file: FileItem) => void
    onFileDelete: (file: FileItem) => void
  }
}>(({ index, style, data }) => {
  const file = data.files[index]

  const handleClick = useCallback(() => {
    data.onFileSelect(file)
  }, [file, data.onFileSelect])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    data.onFileDelete(file)
  }, [file, data.onFileDelete])

  return (
    <div
      style={style}
      className="flex items-center justify-between px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-200 dark:border-slate-700"
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {file.type === 'folder' ? '📁' : '📄'}
        </span>
        <span className="text-sm font-medium">{file.name}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          {formatFileSize(file.size)}
        </span>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          🗑️
        </button>
      </div>
    </div>
  )
})

FileListItem.displayName = 'FileListItem'

export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = React.memo(({
  files,
  onFileSelect,
  onFileDelete,
  itemHeight = 40,
  height = 400
}) => {
  // 使用 useMemo 缓存列表数据
  const itemData = useMemo(() => ({
    files,
    onFileSelect,
    onFileDelete
  }), [files, onFileSelect, onFileDelete])

  // 使用 useMemo 过滤和排序文件
  const sortedFiles = useMemo(() => {
    return files.sort((a, b) => {
      // 文件夹排在前面
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }
      // 按名称排序
      return a.name.localeCompare(b.name)
    })
  }, [files])

  const handleFileSelect = useCallback((file: FileItem) => {
    onFileSelect(file)
  }, [onFileSelect])

  const handleFileDelete = useCallback((file: FileItem) => {
    onFileDelete(file)
  }, [onFileDelete])

  return (
    <div className="w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <List
        height={height}
        itemCount={sortedFiles.length}
        itemSize={itemHeight}
        itemData={{
          files: sortedFiles,
          onFileSelect: handleFileSelect,
          onFileDelete: handleFileDelete
        }}
        overscanCount={5} // 预渲染额外项目以提高滚动性能
      >
        {FileListItem}
      </List>
    </div>
  )
})

VirtualizedFileList.displayName = 'VirtualizedFileList'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
```

#### 防抖和节流优化

```typescript
// src/hooks/useDebounce.ts
import { useCallback, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      callback(...args)
    }
  }, [callback, delay]) as T
}
```

```typescript
// src/components/AutoSaveEditor.tsx
import React, { useCallback, useEffect } from 'react'
import { useDebounce } from '../hooks/useDebounce'

interface AutoSaveEditorProps {
  content: string
  onSave: (content: string) => Promise<void>
  debounceDelay?: number
}

export const AutoSaveEditor: React.FC<AutoSaveEditorProps> = ({
  content,
  onSave,
  debounceDelay = 1000
}) => {
  // 防抖保存函数
  const debouncedSave = useDebounce(async (saveContent: string) => {
    try {
      await onSave(saveContent)
      console.log('Auto-saved successfully')
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, debounceDelay)

  // 内容变化时触发保存
  useEffect(() => {
    if (content.trim()) {
      debouncedSave(content)
    }
  }, [content, debouncedSave])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // 这里不直接保存，而是通过 useEffect 触发防抖保存
    // setContent(e.target.value)
  }, [])

  return (
    <textarea
      value={content}
      onChange={handleChange}
      className="w-full h-full p-4 border border-slate-300 rounded-lg"
      placeholder="开始输入..."
    />
  )
}
```

## 代码优化策略

### Markdown 渲染优化

```typescript
// src/utils/markdown.ts
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import katex from 'katex'
import DOMPurify from 'dompurify'

// 配置 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  xhtmlOut: true,
  breaks: true,
  linkify: true,
  typographer: true,
  quotes: '""''',
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {
        // 降级处理
      }
    }
    return ''
  }
})

// 缓存渲染结果
const renderCache = new Map<string, string>()
const CACHE_MAX_SIZE = 100

// 添加插件
md.use(require('markdown-it-katex'))
md.use(require('markdown-it-abbr'))
md.use(require('markdown-it-deflist'))
md.use(require('markdown-it-footnote'))

export function renderMarkdown(markdown: string): string {
  // 检查缓存
  if (renderCache.has(markdown)) {
    return renderCache.get(markdown)!
  }

  // 渲染 Markdown
  let html = md.render(markdown)

  // 安全清理
  html = DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe', 'math', 'semantics', 'svg', 'g', 'path'],
    ADD_ATTR: ['class', 'target', 'xmlns', 'd', 'fill', 'stroke', 'viewBox'],
    ALLOW_UNKNOWN_PROTOCOLS: true
  })

  // 缓存结果
  if (renderCache.size >= CACHE_MAX_SIZE) {
    // 清理最旧的缓存项
    const firstKey = renderCache.keys().next().value
    renderCache.delete(firstKey)
  }
  renderCache.set(markdown, html)

  return html
}

// 异步渲染大型文档
export async function renderLargeMarkdown(
  markdown: string,
  chunkSize: number = 1000
): Promise<string> {
  const chunks: string[] = []

  // 分块处理
  for (let i = 0; i < markdown.length; i += chunkSize) {
    const chunk = markdown.slice(i, i + chunkSize)
    chunks.push(renderMarkdown(chunk))

    // 让出控制权，避免阻塞 UI
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return chunks.join('')
}

// 预处理 Markdown 内容以提高渲染性能
export function preprocessMarkdown(markdown: string): string {
  // 移除多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n')

  // 标准化行尾
  markdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // 修复常见的 Markdown 语法错误
  markdown = markdown.replace(/\[([^\]]+)\]\(\s*\)/g, '[$1]()')

  return markdown
}
```

### Mermaid 图表优化

```typescript
// src/utils/mermaid.ts
import mermaid from 'mermaid'

// 缓存已渲染的图表
const chartCache = new Map<string, string>()

// 初始化 Mermaid 配置
export function initMermaid(theme: 'dark' | 'default' = 'default') {
  mermaid.initialize({
    startOnLoad: false,
    theme,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    maxTextSize: 30000,
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 30,
      rankSpacing: 40
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      bottomMarginAdj: 1,
      useMaxWidth: true,
      rightAngles: false,
      showSequenceNumbers: false
    },
    gantt: {
      titleTopMargin: 25,
      barHeight: 20,
      barGap: 4,
      topPadding: 50,
      leftPadding: 75,
      gridLineStartPadding: 35,
      fontSize: 11,
      numberSectionStyles: 4,
      axisFormat: '%Y-%m-%d',
      topAxis: false,
      displayPattern: false
    }
  })
}

// 异步渲染单个 Mermaid 图表
export async function renderMermaidChart(
  code: string,
  id: string
): Promise<string> {
  // 检查缓存
  const cacheKey = `${code}-${theme}`
  if (chartCache.has(cacheKey)) {
    return chartCache.get(cacheKey)!
  }

  try {
    // 渲染图表
    const { svg } = await mermaid.render(`mermaid-${id}`, code)

    // 缓存结果
    chartCache.set(cacheKey, svg)

    return svg
  } catch (error) {
    console.error('Mermaid render error:', error)
    return `<div class="error">图表渲染失败: ${error}</div>`
  }
}

// 批量渲染多个图表
export async function renderMermaidCharts(
  charts: Array<{ code: string; id: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  // 并发渲染（限制并发数避免性能问题）
  const concurrencyLimit = 3
  const batches = []

  for (let i = 0; i < charts.length; i += concurrencyLimit) {
    batches.push(charts.slice(i, i + concurrencyLimit))
  }

  for (const batch of batches) {
    const promises = batch.map(({ code, id }) =>
      renderMermaidChart(code, id)
        .then(svg => results.set(id, svg))
        .catch(error => {
          console.error(`Failed to render chart ${id}:`, error)
          results.set(id, `<div class="error">图表渲染失败</div>`)
        })
    )

    await Promise.all(promises)
  }

  return results
}

// 清理缓存
export function clearMermaidCache() {
  chartCache.clear()
}
```

## 内存管理

### 内存泄漏防护

```typescript
// src/utils/memory-manager.ts
export class MemoryManager {
  private static instance: MemoryManager
  private observers: Set<MutationObserver | IntersectionObserver | ResizeObserver> = new Set()
  private timers: Set<NodeJS.Timeout | number> = new Set()
  private eventListeners: Map<Element, Array<{ event: string; handler: EventListener }>> = new Map()

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  // 注册观察器
  registerObserver(observer: MutationObserver | IntersectionObserver | ResizeObserver) {
    this.observers.add(observer)
  }

  // 注册定时器
  registerTimer(timer: NodeJS.Timeout | number) {
    this.timers.add(timer)
  }

  // 注册事件监听器
  registerEventListener(element: Element, event: string, handler: EventListener) {
    if (!this.eventListeners.has(element)) {
      this.eventListeners.set(element, [])
    }
    this.eventListeners.get(element)!.push({ event, handler })
    element.addEventListener(event, handler)
  }

  // 清理所有资源
  cleanup() {
    // 清理观察器
    this.observers.forEach(observer => {
      if ('disconnect' in observer) {
        observer.disconnect()
      }
    })
    this.observers.clear()

    // 清理定时器
    this.timers.forEach(timer => {
      if (typeof timer === 'number') {
        clearTimeout(timer)
      } else {
        timer.unref?.()
      }
    })
    this.timers.clear()

    // 清理事件监听器
    this.eventListeners.forEach((listeners, element) => {
      listeners.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler)
      })
    })
    this.eventListeners.clear()
  }

  // 获取内存使用情况
  getMemoryUsage(): { used: number; total: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      }
    }
    return { used: 0, total: 0 }
  }

  // 检查内存泄漏
  checkMemoryLeak(): boolean {
    const { used, total } = this.getMemoryUsage()
    const usageRatio = used / total
    return usageRatio > 0.9 // 内存使用率超过90%认为可能有泄漏
  }
}

// React Hook for automatic cleanup
export function useMemoryManager() {
  const memoryManager = MemoryManager.getInstance()

  React.useEffect(() => {
    return () => {
      memoryManager.cleanup()
    }
  }, [])

  return memoryManager
}
```

### React Hook 优化

```typescript
// src/hooks/useOptimizedEffect.ts
import { useEffect, useRef, useCallback } from 'react'

export function useOptimizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  options?: {
    debounce?: number
    throttle?: number
    leading?: boolean
  }
) {
  const { debounce = 0, throttle = 0, leading = false } = options || {}
  const lastRunRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const effectRef = useRef(effect)
  effectRef.current = effect

  const runEffect = useCallback(() => {
    const now = Date.now()

    if (leading && now - lastRunRef.current > throttle) {
      lastRunRef.current = now
      return effectRef.current()
    }

    if (debounce > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        effectRef.current()
        lastRunRef.current = Date.now()
      }, debounce)
    } else if (now - lastRunRef.current >= throttle) {
      effectRef.current()
      lastRunRef.current = now
    }
  }, [debounce, throttle, leading])

  useEffect(() => {
    runEffect()

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
```

## 网络优化

### 资源懒加载

```typescript
// src/utils/lazy-loader.ts
export class LazyLoader {
  private static loadedScripts = new Set<string>()
  private static loadedStyles = new Set<string>()

  // 动态加载脚本
  static async loadScript(src: string): Promise<void> {
    if (this.loadedScripts.has(src)) {
      return
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = src
      script.onload = () => {
        this.loadedScripts.add(src)
        resolve()
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  // 动态加载样式
  static async loadStyle(href: string): Promise<void> {
    if (this.loadedStyles.has(href)) {
      return
    }

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.onload = () => {
        this.loadedStyles.add(href)
        resolve()
      }
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  // 预加载关键资源
  static preloadResources(resources: Array<{ url: string; type: 'script' | 'style' | 'image' }>) {
    resources.forEach(({ url, type }) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = url

      switch (type) {
        case 'script':
          link.as = 'script'
          break
        case 'style':
          link.as = 'style'
          break
        case 'image':
          link.as = 'image'
          break
      }

      document.head.appendChild(link)
    })
  }
}

// React Hook for lazy loading
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    loader()
      .then(result => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, deps)

  return { data, loading, error }
}
```

### API 请求优化

```typescript
// src/utils/api-client.ts
export class ApiClient {
  private baseUrl: string
  private cache = new Map<string, { data: any; timestamp: number }>()
  private pendingRequests = new Map<string, Promise<any>>()

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  // 带缓存的 GET 请求
  async get<T>(
    path: string,
    options: {
      cache?: boolean
      cacheTimeout?: number
      retries?: number
    } = {}
  ): Promise<T> {
    const { cache = true, cacheTimeout = 300000, retries = 3 } = options
    const url = `${this.baseUrl}${path}`

    // 检查缓存
    if (cache) {
      const cached = this.cache.get(url)
      if (cached && Date.now() - cached.timestamp < cacheTimeout) {
        return cached.data
      }
    }

    // 避免重复请求
    const existingRequest = this.pendingRequests.get(url)
    if (existingRequest) {
      return existingRequest
    }

    const request = this.makeRequest<T>(url, { retries }).then(data => {
      if (cache) {
        this.cache.set(url, { data, timestamp: Date.now() })
      }
      this.pendingRequests.delete(url)
      return data
    }).catch(error => {
      this.pendingRequests.delete(url)
      throw error
    })

    this.pendingRequests.set(url, request)
    return request
  }

  // POST 请求
  async post<T>(path: string, data: any, options: { retries?: number } = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    return this.makeRequest<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  }

  // 带重试机制的请求
  private async makeRequest<T>(
    url: string,
    options: {
      method?: string
      body?: string
      retries?: number
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, retries = 3 } = options

    let lastError: Error

    for (let i = 0; i <= retries; i++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body,
          signal: AbortSignal.timeout(10000) // 10秒超时
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error

        if (i === retries) {
          throw lastError
        }

        // 指数退避重试
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }

    throw lastError!
  }

  // 清理缓存
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}

// 全局 API 客户端实例
export const apiClient = new ApiClient(process.env.VITE_API_BASE_URL || '/api')
```

## 用户体验优化

### 骨架屏和加载状态

```typescript
// src/components/SkeletonLoader.tsx
import React from 'react'

interface SkeletonLoaderProps {
  className?: string
  count?: number
  height?: string
  width?: string
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className = '',
  count = 1,
  height = '1rem',
  width = '100%'
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
          style={{
            height,
            width: index === count - 1 ? '60%' : width // 最后一行短一些
          }}
        />
      ))}
    </>
  )
}

// 编辑器骨架屏
export const EditorSkeleton: React.FC = () => (
  <div className="flex flex-col h-full">
    {/* 工具栏骨架 */}
    <div className="flex gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        />
      ))}
    </div>

    {/* 编辑器内容骨架 */}
    <div className="flex-1 p-4 space-y-2">
      <SkeletonLoader height="1.5rem" width="30%" />
      <SkeletonLoader height="1rem" count={8} />
      <SkeletonLoader height="1.5rem" width="40%" />
      <SkeletonLoader height="1rem" count={5} />
    </div>
  </div>
)

// 文件列表骨架屏
export const FileListSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 10 }, (_, i) => (
      <div key={i} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded">
        <div className="flex items-center gap-3">
          <SkeletonLoader width="1.5rem" height="1.5rem" />
          <SkeletonLoader width="8rem" height="1rem" />
        </div>
        <SkeletonLoader width="4rem" height="1rem" />
      </div>
    ))}
  </div>
)
```

### 渐进式加载

```typescript
// src/hooks/useProgressiveLoader.ts
import { useState, useCallback, useRef } from 'react'

interface ProgressiveLoaderOptions {
  batchSize?: number
  delay?: number
}

export function useProgressiveLoader<T>(
  items: T[],
  options: ProgressiveLoaderOptions = {}
) {
  const { batchSize = 20, delay = 100 } = options
  const [visibleItems, setVisibleItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const currentIndexRef = useRef(0)

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return

    setIsLoading(true)

    const nextIndex = currentIndexRef.current + batchSize
    const nextBatch = items.slice(currentIndexRef.current, nextIndex)

    // 模拟异步加载延迟
    setTimeout(() => {
      setVisibleItems(prev => [...prev, ...nextBatch])
      currentIndexRef.current = nextIndex
      setHasMore(nextIndex < items.length)
      setIsLoading(false)
    }, delay)
  }, [items, batchSize, delay, hasMore, isLoading])

  // 初始加载
  const loadInitial = useCallback(() => {
    setVisibleItems([])
    currentIndexRef.current = 0
    setHasMore(true)
    loadMore()
  }, [loadMore])

  // 重置
  const reset = useCallback(() => {
    loadInitial()
  }, [loadInitial])

  return {
    visibleItems,
    isLoading,
    hasMore,
    loadMore,
    reset
  }
}
```

## 性能测试和分析

### Lighthouse 集成

```typescript
// src/monitoring/lighthouse.ts
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

export interface LighthouseResult {
  lhr: {
    categories: {
      performance: { score: number }
      accessibility: { score: number }
      'best-practices': { score: number }
      seo: { score: number }
      pwa: { score: number }
    }
    audits: {
      [key: string]: {
        id: string
        title: string
        description: string
        score: number
        numericValue?: number
      }
    }
  }
  report: string
}

export async function runLighthouse(url: string): Promise<LighthouseResult> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  const options = {
    logLevel: 'info' as const,
    output: 'json' as const,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port
  }

  try {
    const runnerResult = await lighthouse(url, options)
    const { lhr } = runnerResult

    return {
      lhr,
      report: JSON.stringify(runnerResult.report, null, 2)
    }
  } finally {
    await chrome.kill()
  }
}

// 性能评分分析
export function analyzePerformanceScore(result: LighthouseResult): {
  score: number
  issues: string[]
  recommendations: string[]
} {
  const performance = result.lhr.categories.performance.score
  const issues: string[] = []
  const recommendations: string[] = []

  // 分析具体的性能审计项目
  Object.entries(result.lhr.audits).forEach(([key, audit]) => {
    if (audit.score < 0.9) { // 低于90分的项目
      issues.push(audit.title)

      switch (key) {
        case 'first-contentful-paint':
          recommendations.push('优化关键资源加载，减少首屏渲染时间')
          break
        case 'largest-contentful-paint':
          recommendations.push('优化主要内容加载，考虑使用懒加载')
          break
        case 'cumulative-layout-shift':
          recommendations.push('为动态内容预留空间，避免布局偏移')
          break
        case 'total-blocking-time':
          recommendations.push('减少主线程阻塞，优化长任务')
          break
        case 'speed-index':
          recommendations.push('优化页面感知加载速度')
          break
      }
    }
  })

  return {
    score: performance,
    issues,
    recommendations
  }
}
```

### 性能监控仪表板

```typescript
// src/components/PerformanceDashboard.tsx
import React, { useState, useEffect } from 'react'

interface PerformanceMetrics {
  fcp: number
  lcp: number
  cls: number
  fid: number
  ttfb: number
  memoryUsage: number
  renderTime: number
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    // 收集性能指标
    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      const newMetrics: PerformanceMetrics = {
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        lcp: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0,
        cls: performance.getEntriesByType('layout-shift').reduce((sum, entry: any) => sum + entry.value, 0),
        fid: 0, // 需要用户交互后才能获取
        ttfb: navigation.responseStart - navigation.requestStart,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        renderTime: navigation.loadEventEnd - navigation.domContentLoadedEventEnd
      }

      setMetrics(newMetrics)
    }

    if (isRecording) {
      const interval = setInterval(collectMetrics, 1000)
      return () => clearInterval(interval)
    }
  }, [isRecording])

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">性能监控</h2>
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`px-4 py-2 rounded ${isRecording ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}
        >
          {isRecording ? '停止记录' : '开始记录'}
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">FCP</div>
            <div className="text-lg font-semibold">{metrics.fcp.toFixed(0)}ms</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">LCP</div>
            <div className="text-lg font-semibold">{metrics.lcp.toFixed(0)}ms</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">CLS</div>
            <div className="text-lg font-semibold">{metrics.cls.toFixed(3)}</div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">内存使用</div>
            <div className="text-lg font-semibold">{(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## 移动端性能优化

### 触摸优化

```typescript
// src/hooks/useTouchOptimization.ts
export function useTouchOptimization() {
  useEffect(() => {
    // 防止双击缩放
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    })

    // 优化触摸响应
    let touchStartTime = 0
    document.addEventListener('touchstart', () => {
      touchStartTime = Date.now()
    })

    document.addEventListener('touchend', (e) => {
      const touchEndTime = Date.now()
      const touchDuration = touchEndTime - touchStartTime

      // 如果触摸时间短，认为是点击
      if (touchDuration < 200) {
        // 触发点击事件
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        })
        e.target?.dispatchEvent(clickEvent)
      }
    })

    return () => {
      document.removeEventListener('touchstart', () => {})
      document.removeEventListener('touchend', () => {})
    }
  }, [])
}
```

### 移动端虚拟键盘适配

```typescript
// src/hooks/useVirtualKeyboard.ts
export function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    let visualViewport: VisualViewport | null = null

    const handleViewportChange = () => {
      if (visualViewport) {
        const heightDiff = window.innerHeight - visualViewport.height
        setKeyboardHeight(Math.max(0, heightDiff))
      }
    }

    if ('visualViewport' in window) {
      visualViewport = window.visualViewport
      visualViewport.addEventListener('resize', handleViewportChange)
    }

    // 备用方案：监听窗口大小变化
    const handleResize = () => {
      const heightDiff = window.innerHeight - document.documentElement.clientHeight
      setKeyboardHeight(Math.max(0, heightDiff))
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleViewportChange)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return keyboardHeight
}
```

## 性能监控和调试

### 性能预算配置

```typescript
// src/config/performance-budget.ts
export const PERFORMANCE_BUDGET = {
  // 资源大小限制（KB）
  resourceSizes: {
    javascript: 250,
    css: 100,
    images: 500,
    fonts: 200
  },

  // 性能指标限制
  metrics: {
    fcp: 2000,        // 首次内容绘制 2秒
    lcp: 2500,        // 最大内容绘制 2.5秒
    cls: 0.1,         // 累积布局偏移 0.1
    fid: 100,         // 首次输入延迟 100ms
    ttfb: 600         // 首字节时间 600ms
  },

  // 请求次数限制
  requestCounts: {
    total: 50,
    javascript: 10,
    css: 5,
    images: 20,
    fonts: 3
  }
}

export function checkPerformanceBudget(): {
  passed: boolean
  violations: Array<{ type: string; limit: number; actual: number; message: string }>
} {
  const violations: Array<{ type: string; limit: number; actual: number; message: string }> = []

  // 检查资源大小
  const resources = performance.getEntriesByType('resource')
  const resourceCounts = {
    javascript: 0,
    css: 0,
    images: 0,
    fonts: 0
  }

  let totalJS = 0
  let totalCSS = 0
  let totalImages = 0
  let totalFonts = 0

  resources.forEach((resource) => {
    const size = (resource as PerformanceResourceTiming).transferSize || 0

    if (resource.name.endsWith('.js')) {
      totalJS += size
      resourceCounts.javascript++
    } else if (resource.name.endsWith('.css')) {
      totalCSS += size
      resourceCounts.css++
    } else if (resource.name.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
      totalImages += size
      resourceCounts.images++
    } else if (resource.name.match(/\.(woff|woff2|ttf|eot)$/)) {
      totalFonts += size
      resourceCounts.fonts++
    }
  })

  // 检查预算违规
  if (totalJS > PERFORMANCE_BUDGET.resourceSizes.javascript * 1024) {
    violations.push({
      type: 'javascript-size',
      limit: PERFORMANCE_BUDGET.resourceSizes.javascript,
      actual: Math.round(totalJS / 1024),
      message: `JavaScript 大小超出预算`
    })
  }

  // ... 其他检查

  return {
    passed: violations.length === 0,
    violations
  }
}
```

### 实时性能监控

```typescript
// src/monitoring/real-time-monitor.ts
export class RealTimePerformanceMonitor {
  private observers: PerformanceObserver[] = []
  private metrics: Map<string, number[]> = new Map()
  private isMonitoring = false

  start() {
    if (this.isMonitoring) return
    this.isMonitoring = true

    // 监控长任务
    this.observeLongTasks()

    // 监控内存使用
    this.observeMemoryUsage()

    // 监控网络请求
    this.observeNetworkRequests()

    // 监控渲染性能
    this.observeRenderPerformance()
  }

  stop() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isMonitoring = false
  }

  private observeLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const duration = (entry as PerformanceEntry).duration
          if (duration > 50) { // 超过50ms的长任务
            console.warn(`Long task detected: ${duration.toFixed(2)}ms`)
            this.recordMetric('longTask', duration)
          }
        })
      })

      observer.observe({ entryTypes: ['longtask'] })
      this.observers.push(observer)
    }
  }

  private observeMemoryUsage() {
    const checkMemory = () => {
      if (!this.isMonitoring) return

      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize
        this.recordMetric('memoryUsage', usage)

        if (usage > 0.9) {
          console.warn(`High memory usage: ${(usage * 100).toFixed(1)}%`)
        }
      }

      // 每秒检查一次
      setTimeout(checkMemory, 1000)
    }

    checkMemory()
  }

  private observeNetworkRequests() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming
          const duration = resource.responseEnd - resource.startTime

          if (duration > 2000) { // 超过2秒的请求
            console.warn(`Slow network request: ${resource.name} (${duration.toFixed(2)}ms)`)
            this.recordMetric('slowRequest', duration)
          }

          this.recordMetric('networkRequest', duration)
        })
      })

      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    }
  }

  private observeRenderPerformance() {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFPS = () => {
      if (!this.isMonitoring) return

      frameCount++
      const currentTime = performance.now()

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        this.recordMetric('fps', fps)

        if (fps < 30) {
          console.warn(`Low FPS detected: ${fps}`)
        }

        frameCount = 0
        lastTime = currentTime
      }

      requestAnimationFrame(measureFPS)
    }

    requestAnimationFrame(measureFPS)
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }

    const values = this.metrics.get(name)!
    values.push(value)

    // 保留最近100个值
    if (values.length > 100) {
      values.shift()
    }
  }

  getMetrics() {
    const result: Record<string, { avg: number; min: number; max: number }> = {}

    this.metrics.forEach((values, name) => {
      result[name] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      }
    })

    return result
  }
}
```

## 总结

本性能优化指南涵盖了 MarkFlow-Lite 应用的全方位性能优化策略：

### 关键优化要点

1. **构建优化**：合理配置 Vite，实现代码分割和资源优化
2. **运行时优化**：使用 React.memo、useCallback 等技术避免不必要的重渲染
3. **内存管理**：预防内存泄漏，优化大内存消耗操作
4. **网络优化**：实现资源懒加载、缓存策略和请求优化
5. **用户体验**：提供骨架屏、渐进式加载等优化体验
6. **监控分析**：持续监控性能指标，及时发现问题

### 性能目标

- **FCP** < 2秒
- **LCP** < 2.5秒
- **FID** < 100ms
- **CLS** < 0.1
- **JavaScript 包大小** < 250KB
- **首屏渲染时间** < 1.5秒

### 持续改进

性能优化是一个持续的过程，需要：

1. 定期监控性能指标
2. 分析用户行为和性能数据
3. 根据业务需求调整优化策略
4. 保持对新技术和最佳实践的关注

通过遵循这些优化策略和持续监控，可以确保 MarkFlow-Lite 为用户提供流畅、高效的编辑体验。

---

*最后更新：2025-11-12*