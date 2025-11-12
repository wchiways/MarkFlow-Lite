# MarkFlow-Lite 部署配置详细说明文档

## 概述

MarkFlow-Lite 是一个轻量级的 Markdown 编辑器，支持多种部署方式。本文档详细介绍了各种部署环境的配置方法、最佳实践和故障排除指南。

## 目录

1. [项目结构](#项目结构)
2. [环境要求](#环境要求)
3. [构建部署](#构建部署)
4. [部署方式](#部署方式)
   - [静态文件部署](#静态文件部署)
   - [Docker 部署](#docker-部署)
   - [Vercel 部署](#vercel-部署)
   - [Netlify 部署](#netlify-部署)
   - [CDN 部署](#cdn-部署)
5. [环境变量配置](#环境变量配置)
6. [安全配置](#安全配置)
7. [性能优化](#性能优化)
8. [监控和日志](#监控和日志)
9. [故障排除](#故障排除)
10. [维护和更新](#维护和更新)

## 项目结构

```
MarkFlow-Lite/
├── public/                 # 静态资源目录
│   ├── favicon.ico
│   └── ...
├── src/                    # 源代码
│   ├── components/         # React 组件
│   ├── utils/              # 工具函数
│   └── ...
├── dist/                   # 构建输出目录
├── docs/                   # 文档
├── docker/                 # Docker 相关文件
├── .github/                # GitHub Actions 配置
├── package.json
├── vite.config.ts
└── README.md
```

## 环境要求

### 开发环境
- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- Git

### 生产环境
- Web 服务器（Nginx、Apache 等）
- HTTPS 证书（推荐）
- CDN（可选，用于性能优化）

## 构建部署

### 1. 本地构建

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 2. 检查构建结果

构建完成后，`dist/` 目录包含所有需要部署的文件：

```bash
# 查看构建结果
ls -la dist/

# 检查文件大小
du -sh dist/
```

### 3. 构建优化配置

更新 `vite.config.ts` 以优化构建：

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,          // 生产环境不生成 source map
    minify: 'terser',          // 使用 terser 压缩
    target: 'es2015',          // 目标浏览器
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['markdown-it', 'dompurify']
        }
      }
    }
  },
  server: {
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff'
    }
  }
})
```

## 部署方式

### 静态文件部署

#### Nginx 配置

创建 `/etc/nginx/sites-available/markflow-lite` 文件：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/fullchain.pem;
    ssl_certificate_key /path/to/your/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://s3.amazonaws.com https://*.amazonaws.com; frame-ancestors 'none';" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # 静态文件根目录
    root /var/www/markflow-lite;
    index index.html;

    # 路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML 文件不缓存
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/markflow-lite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Apache 配置

创建 `.htaccess` 文件：

```apache
# 启用重写引擎
RewriteEngine On

# 处理 SPA 路由
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# 安全头
<IfModule mod_headers.c>
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'"
</IfModule>

# Gzip 压缩
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# 缓存控制
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/ico "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
    ExpiresByType application/font-sfnt "access plus 1 year"
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>
```

### Docker 部署

#### 创建 Dockerfile

```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY docker/nginx.conf /etc/nginx/nginx.conf

# 从构建阶段复制文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### 创建 nginx 配置

创建 `docker/nginx.conf`：

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # 基本配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # SPA 路由支持
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### 构建和运行 Docker

```bash
# 构建镜像
docker build -t markflow-lite .

# 运行容器
docker run -d \
    --name markflow-lite \
    -p 8080:80 \
    -v $(pwd)/nginx/logs:/var/log/nginx \
    markflow-lite
```

#### Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  markflow-lite:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx-proxy.conf:/etc/nginx/conf.d/default.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - markflow-lite
    restart: unless-stopped
```

### Vercel 部署

#### 安装 Vercel CLI

```bash
npm i -g vercel
```

#### 创建 vercel.json

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "installCommand": "npm install",
  "functions": {},
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api).*)",
      "destination": "/index.html"
    }
  ]
}
```

#### 部署到 Vercel

```bash
# 登录 Vercel
vercel login

# 部署
vercel --prod

# 设置域名（可选）
vercel --prod --domains your-domain.com
```

### Netlify 部署

#### 创建 netlify.toml

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 环境变量配置

在 Netlify 管理界面设置以下环境变量：

```
NODE_VERSION=18
NPM_VERSION=8
```

### CDN 部署

#### CloudFlare 配置

1. **页面规则**：
   - URL 模式：`yourdomain.com/*.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)`
   - 设置：缓存级别 = 缓存所有内容，边缘缓存过期时间 = 1年

2. **安全设置**：
   - SSL/TLS = 完全（严格）
   - HSTS = 启用
   - 最小 TLS 版本 = 1.2

3. **性能优化**：
   - Brotli 压缩 = 启用
   - Auto Minify = CSS, HTML, JavaScript

#### AWS CloudFront 配置

```json
{
  "CachePolicyId": "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
  "OriginRequestPolicyId": "88a5eaf4-2fd4-69a4-84e5-3c97b613a194",
  "ResponseHeadersPolicyId": "60669652-45e6-4fed-a255-84854b28dd10",
  "DefaultRootObject": "index.html",
  "ViewerProtocolPolicy": "redirect-to-https",
  "Compress": true,
  "CustomErrorResponses": [
    {
      "ErrorCode": 404,
      "ResponsePagePath": "/index.html",
      "ResponseCode": "200",
      "ErrorCachingMinTTL": 0
    }
  ]
}
```

## 环境变量配置

### 环境变量文件

创建 `.env.production`：

```bash
# 应用配置
VITE_APP_NAME=MarkFlow-Lite
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=轻量级 Markdown 编辑器

# API 配置
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_S3_REGION=us-east-1
VITE_S3_BUCKET=your-bucket-name

# 分析和监控
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://your-sentry-dsn

# 功能开关
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# CDN 配置
VITE_CDN_BASE_URL=https://cdn.yourdomain.com
```

### 动态配置接口

创建 `src/config/index.ts`：

```typescript
interface AppConfig {
  apiBaseUrl: string
  s3Region: string
  s3Bucket: string
  enableAnalytics: boolean
  enableErrorReporting: boolean
  enablePerformanceMonitoring: boolean
}

export const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  s3Region: import.meta.env.VITE_S3_REGION || 'us-east-1',
  s3Bucket: import.meta.env.VITE_S3_BUCKET || '',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableErrorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  enablePerformanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true'
}

// 动态加载配置
export async function loadRemoteConfig(): Promise<Partial<AppConfig>> {
  try {
    const response = await fetch('/config.json')
    const remoteConfig = await response.json()
    return { ...config, ...remoteConfig }
  } catch (error) {
    console.warn('Failed to load remote config:', error)
    return config
  }
}
```

## 安全配置

### Content Security Policy (CSP)

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.google-analytics.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: https://www.google-analytics.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.github.com https://s3.amazonaws.com https://*.amazonaws.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
" always;
```

### HTTPS 配置

#### Let's Encrypt 证书

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 安全头配置

```typescript
// src/utils/security.ts
export const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

// 在应用启动时设置安全头
if (typeof window !== 'undefined') {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    // 注意：这些头需要通过服务器配置设置
    console.log(`${header}: ${value}`)
  })
}
```

## 性能优化

### 前端优化

#### 代码分割

```typescript
// src/lazy/index.ts
import { lazy } from 'react'

export const Editor = lazy(() => import('../components/Editor'))
export const Preview = lazy(() => import('../components/Preview'))
export const Sidebar = lazy(() => import('../components/Sidebar'))
export const Modals = lazy(() => import('../components/modals'))
```

#### 图片优化

```typescript
// src/utils/image.ts
export function optimizeImageUrl(url: string, options: {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
} = {}): string {
  const { width, height, quality = 80, format = 'webp' } = options

  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  params.set('q', quality.toString())
  params.set('f', format)

  return `${url}?${params.toString()}`
}
```

### 缓存策略

#### Service Worker

```typescript
// public/sw.js
const CACHE_NAME = 'markflow-lite-v1'
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/static/assets/'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中，返回缓存
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})
```

## 监控和日志

### 错误监控（Sentry）

```typescript
// src/monitoring/sentry.ts
import * as Sentry from '@sentry/react'
import { BrowserTracing } from '@sentry/tracing'

export function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
      ],
      tracesSampleRate: 0.1,
      environment: import.meta.env.MODE,
      release: `markflow-lite@${import.meta.env.VITE_APP_VERSION}`
    })
  }
}
```

### 性能监控

```typescript
// src/monitoring/performance.ts
export function reportWebVitals() {
  if (import.meta.env.PROD) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log)
      getFID(console.log)
      getFCP(console.log)
      getLCP(console.log)
      getTTFB(console.log)
    })
  }
}

// 页面加载性能监控
export function observePagePerformance() {
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    const metrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
    }

    // 发送到分析服务
    if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING) {
      sendMetrics(metrics)
    }
  })
}
```

## 故障排除

### 常见问题

#### 1. 构建失败

```bash
# 清理缓存
rm -rf node_modules package-lock.json
npm install

# 检查 Node.js 版本
node --version  # 应该 >= 16.0.0

# 检查内存使用
npm run build -- --max-old-space-size=4096
```

#### 2. 路由问题

```nginx
# 确保所有路由都返回 index.html
location / {
    try_files $uri $uri/ /index.html;
}
```

#### 3. CORS 错误

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    cors: true,
    proxy: {
      '/api': {
        target: 'https://api.yourdomain.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
```

#### 4. 静态资源 404

```bash
# 检查构建输出
ls -la dist/static/
ls -la dist/assets/

# 确保资源路径正确
grep -r "static/" dist/
```

### 调试工具

#### Lighthouse CI

创建 `.lighthouserc.js`：

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['https://your-domain.com'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
        'categories:pwa': 'off'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}
```

## 维护和更新

### 自动化部署

#### GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: npm test

    - name: Run Lighthouse CI
      run: |
        npm install -g @lhci/cli@0.12.x
        lhci autorun

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          cd /var/www/markflow-lite
          git pull origin main
          npm ci
          npm run build
          sudo systemctl reload nginx
```

### 版本管理

#### 版本策略

```bash
# 语义化版本：MAJOR.MINOR.PATCH
# MAJOR: 不兼容的 API 修改
# MINOR: 向后兼容的功能新增
# PATCH: 向后兼容的问题修正

# 发布新版本
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0

# 发布预览版本
npm version prepatch --preid=beta  # 1.0.1 -> 1.0.2-beta.0
```

#### 数据库迁移（如果适用）

```typescript
// scripts/migrate.ts
export async function migrateToVersion(version: string) {
  console.log(`Migrating to version ${version}...`)

  switch (version) {
    case '1.1.0':
      await migrateTo1_1_0()
      break
    case '2.0.0':
      await migrateTo2_0_0()
      break
    default:
      console.log(`No migration needed for version ${version}`)
  }
}
```

### 备份策略

#### 数据备份

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/markflow-lite"
mkdir -p $BACKUP_DIR

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/markflow-lite

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/nginx/sites-available/markflow-lite

# 清理旧备份（保留最近30天）
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

#### 数据库备份（如果使用数据库）

```bash
#!/bin/bash
# db-backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/markflow-lite/db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump markflow_lite | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 清理旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 监控告警

#### 健康检查端点

```typescript
// src/api/health.ts
import { Request, Response } from 'express'

export function healthCheck(req: Request, res: Response) {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: import.meta.env.VITE_APP_VERSION,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  }

  res.json(health)
}
```

#### 告警配置

```yaml
# monitoring/alerts.yml
groups:
  - name: markflow-lite
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
```

---

## 总结

本文档提供了 MarkFlow-Lite 的完整部署指南，涵盖了从基本配置到生产级部署的所有重要方面。遵循这些最佳实践可以确保应用的安全性、性能和可靠性。

### 关键要点

1. **安全性**：始终使用 HTTPS，配置适当的安全头
2. **性能**：启用缓存、压缩和 CDN
3. **监控**：实施错误监控和性能跟踪
4. **自动化**：使用 CI/CD 简化部署流程
5. **维护**：定期备份和更新依赖

### 支持和反馈

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查应用的 GitHub Issues
3. 在社区论坛寻求帮助
4. 联系技术支持团队

---

*最后更新：2025-11-12*