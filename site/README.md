# Web 市场静态站

`scripts/build-site.mjs`（零第三方依赖，Node ≥18）读取 `index/v1/index.json`
与各包截图，生成纯静态市场站到 `site/dist/`（不入库，已被 .gitignore 排除）：

```bash
npm run build:site
python3 -m http.server 4173 --directory site/dist
```

- 中文根路径与 `/en/` 英文镜像；首页提供精选、搜索、全部/最新/热门、类型/标签筛选与分页
- `q/sort/kind/tag/page` 同步到查询参数，刷新、分享和浏览器返回可恢复
- 详情页包含真实截图、双语正文、依赖/风险、源码/反馈、同标签推荐与 canonical/hreflang/OG
- 「在 NotchAny 中打开」只打开 App 详情页，1.4 秒未唤起时引导到项目主页，不暗示静默安装
- 无外部资源：CSS/JS 全部内联，系统字体栈，深浅色自适应
- 下载计数为渐进增强：构建时通过 `NOTCHANY_COUNTS_URL` 注入 Worker 地址；失败时热门入口
  显示可重试状态，其他浏览能力不受影响。页面始终称为「下载量」。
- `site/curation.json` 由维护者配置最多 3 个精选包，构建时拒绝未知、重复和超量 ID。

## 部署到 GitHub Pages

`.github/workflows/deploy-pages.yml` 在 `main` push 后现场重建 index、构建站点并发布。
Worker 部署后，在仓库 Actions variables 设置：

```bash
gh variable set NOTCHANY_COUNTS_URL \
  --repo glzlaohuai/notchany-registry \
  --body 'https://notchany-market.<subdomain>.workers.dev/counts.json'
```
