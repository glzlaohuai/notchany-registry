# Web 市场静态站

`scripts/build-site.mjs`（零第三方依赖，Node ≥18）读取 `index/v1/index.json`
与各包截图，生成纯静态市场站到 `site/dist/`（不入库，已被 .gitignore 排除）：

```bash
node scripts/build-site.mjs   # 在仓库根目录执行
open site/dist/index.html     # 本地预览
```

- 首页：搜索框（纯前端过滤）+ 类型筛选（小组件/动作）+ 卡片列表
- 详情页 `pkg/<owner>/<slug>/`：截图、双语描述（浏览器语言 zh→中文否则英文）、
  「用 NotchAny 安装」深链按钮（`notchany://market/package/<owner>/<slug>`，
  1.5 秒未唤起显示下载引导）、「查看源码」直达 GitHub 包目录
- 无外部资源：CSS/JS 全部内联，系统字体栈，深浅色自适应
- 下载计数为渐进增强：运行时 fetch Worker 的 `counts.json`，取到才显示
  「安装量 N」。部署 [worker/](../worker/) 后把 `scripts/build-site.mjs` 顶部
  `COUNTS_URL` 里的 `REPLACE_ME` 换成实际 workers.dev 子域并重新构建。

## 部署到 Cloudflare Pages（推荐：Git 集成）

在 Cloudflare Dashboard → Workers & Pages → Create → Pages →
Connect to Git，选择本仓库，构建配置：

| 配置项 | 值 |
| --- | --- |
| Build command | `node scripts/build-site.mjs` |
| Build output directory | `site/dist` |
| Root directory | （留空，仓库根目录） |

Pages 默认的构建镜像自带 Node ≥18；如需固定版本，环境变量加
`NODE_VERSION=20`。之后每次 push main（index 更新、包上架）都会自动重建站点。

注意：`build-site.mjs` 只读已提交的 `index/v1/index.json`（由
`publish-index.yml` 在包变更后自动生成提交），Pages 侧无需再跑 build-index。

## 备选：手动上传 dist

不想用 Git 集成时，本地构建后用 wrangler 直传：

```bash
node scripts/build-site.mjs
wrangler pages deploy site/dist --project-name notchany-market-site
```

（或把 `site/dist` 从 .gitignore 移除、提交产物后走任意静态托管。）
