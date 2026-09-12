# 丁垚鑫个人作品集

正式版本位于当前 `portfolio` 目录，使用 React 18 与 Vite 构建。

## 本地运行

```bash
corepack pnpm install
corepack pnpm dev
```

生产构建：

```bash
corepack pnpm build
corepack pnpm preview
```

## 文件说明

- `index.html`：React 应用入口，部署时使用此文件。
- `App.jsx`：页面内容与交互组件。
- `styles.css`：完整响应式样式。
- `preview.html`：保留的单文件预览版本，可直接双击查看。
- `pnpm-workspace.yaml`：仅允许 Vite 所需的 `esbuild` 执行安装脚本。

旧的嵌套 React 源码仍保留在工作区的 `Users/sansh/Documents/个人网站/portfolio`，作为迁移前备份。
