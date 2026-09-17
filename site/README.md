# Web 市场静态站

`scripts/build-site.mjs`（零第三方依赖，Node ≥18）读取 `index/v2/index.json`、每包 history
与截图，生成纯静态市场站到 `site/dist/`（不入库，已被 .gitignore 排除）：

```bash
npm run build:site
python3 -m http.server 4173 --directory site/dist
```

- 中文根路径与 `/en/` 英文镜像；首页提供精选、搜索、全部/最新/热门、类型/标签筛选与分页
- 首页 MacBook 演示同步本机日期时间，刘海托盘自动开合、悬停展开，三个精选图标可直达详情；键盘支持指针与实体键盘按压反馈
- 首页、精选、列表和详情统一显示发布包的 `icon.png`；该文件由 NotchAny 发布向导按安装后的真实图标生成
- `q/sort/kind/tag/page` 同步到查询参数，刷新、分享和浏览器返回可恢复
- 详情页包含真实截图、双语正文、依赖/风险、Owner/维护者/贡献者、只读版本时间线、
  源码/反馈、同标签推荐与 canonical/hreflang/OG
- 全站「下载 App」进入双语下载提示页；通过 `NOTCHANY_APP_DOWNLOAD_URL` 注入正式下载地址，未配置时按钮显示准备中而不产生死链接
- 「在 NotchAny 中打开」只打开 App 详情页，1.6 秒未唤起时自动进入下载提示页，不暗示静默安装
- Store 页面 CSS/JS 内联，同时输出 `/assets/store.css` 与 `/assets/shell.js` 供同源 Account/Auth 使用；
  `site/shell.mjs` 是完整 header 的唯一模板源，页面首屏不靠 JavaScript 创建导航
- 下载计数为渐进增强：构建时通过 `NOTCHANY_COUNTS_URL` 注入 Worker 地址；失败时热门入口
  显示可重试状态，其他浏览能力不受影响。页面始终称为「下载量」。
- Market 身份同样渐进增强：`NOTCHANY_MARKET_API_BASE` 注入 Commercial Worker 地址，页面用它
  刷新 GitHub 快照和绑定标识；请求失败时保留 Registry history 快照，版本与安装不受影响。
- `site/curation.json` 由维护者配置最多 3 个精选包，构建时拒绝未知、重复和超量 ID。

## 本地预览

普通静态预览：

```bash
npm run build:site
python3 -m http.server 4173 --directory site/dist
```

验证 Cloudflare Worker 的真实 404、缓存与响应头：

```bash
npm run dev:store
```

## 部署到 Cloudflare Store Worker

Store 与 Commercial 保持独立部署。`store-worker/wrangler.toml` 定义不接管生产域的
`notchany-store-preview` Worker，并只绑定隔离的 `notchany-commercial-staging`；
`store-worker/wrangler.production.toml` 定义接管根域的 `notchany-store` Worker，并绑定生产
Commercial。构建会先用
`published/state.json` 校验 v2 index、history 与素材来自同一正式快照，再上传 `site/dist/`；
候选 `packages/` 不会成为线上路径或安装来源。

GitHub Actions 需要：

- Secret `CLOUDFLARE_API_TOKEN`：最小化到该账号的 Workers Scripts 编辑权限。
- Secret `CLOUDFLARE_ACCOUNT_ID`。
- Variables `NOTCHANY_COUNTS_URL`、`NOTCHANY_APP_DOWNLOAD_URL`、`MARKET_API_BASE`。

`deploy-store-cloudflare.yml` 固定 checkout commit 与 Wrangler `4.127.1`，默认部署 preview 并回读
`/.well-known/notchany-store.json` 核对 commit。影子地址为
`https://notchany-store-preview.glzlaohuai.workers.dev`。预览完成邮箱、密码、provider、四个账号栏目、
Cookie、桌面/移动与深浅色验收后，才能在受保护的 `store-production` environment 手动选择 production。

手动部署影子站：

```bash
NOTCHANY_SITE_URL=https://notchany.com \
NOTCHANY_ACCOUNT_URL=https://notchany.com/account \
NOTCHANY_MARKET_API_BASE=https://account.notchany.com \
NOTCHANY_COUNTS_URL=https://notchany-market.glzlaohuai.workers.dev/counts.json \
npm run deploy:store:preview
```

生产配置只把 `/account`、`/account/*`、`/auth/*` 原样交给 `COMMERCIAL` service binding；
`/v1/*`、`/health`、Webhook 和内部 Market 路径始终由 Store Worker 返回不可缓存的 404。
binding 失败返回不可缓存的 503。生产切换前保留 GitHub Pages 作为回退，不得先停用 Pages。

## GitHub Pages 兼容部署

`.github/workflows/deploy-pages.yml` 在 `main` push 后构建站点并发布。迁移期保留它作为当前生产与
快速回滚入口；Store Worker 稳定运行并完成 DNS 切换前不要停用。
Worker 部署后，在仓库 Actions variables 设置：

```bash
gh variable set NOTCHANY_COUNTS_URL \
  --repo glzlaohuai/notchany-registry \
  --body 'https://notchany-market.<subdomain>.workers.dev/counts.json'
```

同时配置公开 Market API 基址（PR 权限 workflow 也复用该 variable）：

```bash
gh variable set MARKET_API_BASE \
  --repo glzlaohuai/notchany-registry \
  --body 'https://account.notchany.com'
```

正式下载地址确定后，再配置站点构建变量：

```bash
gh variable set NOTCHANY_APP_DOWNLOAD_URL \
  --repo glzlaohuai/notchany-registry \
  --body 'https://example.com/NotchAny.dmg'
```
