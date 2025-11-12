import React, { useEffect, useRef } from 'react'
import { renderMarkdown } from '../utils/markdown'

interface PreviewProps {
  markdown: string
  isDarkMode: boolean
  className?: string
}

const Preview: React.FC<PreviewProps> = ({ markdown, isDarkMode, className = '' }) => {
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (previewRef.current) {
      const html = renderMarkdown(markdown)
      previewRef.current.innerHTML = html
      
      // 等待DOM更新完成后再渲染图表
      setTimeout(() => {
        renderDiagrams()
      }, 100)
    }
  }, [markdown, isDarkMode])

  // 渲染图表
  const renderDiagrams = async () => {
    if (previewRef.current) {
      try {
        // 渲染mermaid图表
        const mermaidElements = previewRef.current.querySelectorAll('.mermaid')
        if (mermaidElements.length > 0) {
          // 动态导入mermaid
          const mermaidModule = await import('mermaid')
          const mermaid = mermaidModule.default

          // 配置mermaid，设置图表尺寸
          mermaid.initialize({
            startOnLoad: false,
            theme: isDarkMode ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            // 限制图表的最大尺寸
            maxTextSize: 30000,
            // 设置 flowchart 图表的默认配置
            flowchart: {
              htmlLabels: true,
              curve: 'basis',
              nodeSpacing: 30,
              rankSpacing: 40
            },
            // 设置 sequence 图表的默认配置
            sequence: {
              diagramMarginX: 20,
              diagramMarginY: 10,
              actorMargin: 30,
              width: 100,
              height: 40,
              boxMargin: 5,
              boxTextMargin: 3,
              noteMargin: 5,
              messageMargin: 20,
              mirrorActors: true,
              bottomMarginAdj: 1
            },
            // 设置 gantt 图表的默认配置
            gantt: {
              titleTopMargin: 10,
              barHeight: 20,
              gridLineStartPadding: 10,
              fontSize: 11
            }
          })
          
          // 为每个图表生成唯一ID并渲染
          for (let i = 0; i < mermaidElements.length; i++) {
            const element = mermaidElements[i] as HTMLElement
            try {
              // 为每个图表生成唯一ID
              const id = `mermaid-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`
              
              // 获取原始的mermaid代码
              const graphDefinition = element.textContent || ''
              
              // 检查是否是有效的mermaid图表定义
              if (!graphDefinition || graphDefinition.trim().length === 0) {
                console.warn('跳过空的mermaid图表定义')
                continue
              }
              
              // 检查是否包含CSS样式（可能是误识别的元素）
              if (graphDefinition.includes('{') && graphDefinition.includes('}')) {
                // 简单检查是否是CSS样式而不是mermaid定义
                const isCSS = graphDefinition.trim().startsWith('.') || 
                             graphDefinition.trim().startsWith('#') || 
                             graphDefinition.trim().startsWith('@')
                if (isCSS) {
                  console.warn('跳过可能的CSS样式内容:', graphDefinition.substring(0, 50) + '...')
                  continue
                }
              }
              
              // 使用render方法渲染图表
              const { svg } = await mermaid.render(id, graphDefinition)
              
              // 将渲染后的SVG插入到元素中
              element.innerHTML = svg
              
              // 确保SVG正确显示，控制尺寸
              const svgElement = element.querySelector('svg')
              if (svgElement) {
                svgElement.style.display = 'block'
                svgElement.style.margin = '0 auto'
                svgElement.style.maxWidth = '100%'
                svgElement.style.width = '100%'
                svgElement.style.height = 'auto'
                // 限制最大宽度
                svgElement.style.maxWidth = '800px'
                // 确保图表在同一文档流中显示
                svgElement.style.position = 'static'
                svgElement.style.zIndex = 'auto'
              }
            } catch (error) {
              console.error('Mermaid处理错误:', error)
              element.innerHTML = `<p class="text-red-500">图表处理失败: ${(error as Error).message}</p>`
            }
          }
        }
      } catch (error) {
        console.error('加载mermaid失败:', error)
      }
    }
  }

  return (
    <div 
      ref={previewRef}
      className={`overflow-y-auto overflow-x-hidden p-4 prose prose-slate max-w-none dark:prose-invert ${className}`}
      style={{ 
        display: 'block',
        minHeight: 0,
        height: '100%',
        margin: 0,
        padding: '1rem',
        position: 'relative'
      }}
    />
  )
}

export default Preview