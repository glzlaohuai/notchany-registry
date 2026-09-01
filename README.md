# NotchAny Registry

[NotchAny](https://github.com/glzlaohuai/NotchAny)（macOS 刘海工具）的动作 / 小组件市场后端：本仓库即 registry——PR 上架、CI 校验、静态 index、公开 Web Store 与匿名下载计数。

- **索引**：`index/v1/index.json`（由 CI 自动生成，App 定期拉取）
- **包体**：`packages/<owner>/<slug>/package.notchany.json`（NotchAny 导出封套原样）
- **元数据**：`packages/<owner>/<slug>/manifest.json`（名称/简介/版本/标签等，双语）

## 目录规范

```
packages/
  <owner>/                    # 你的 GitHub 用户名（必须与 PR 作者一致）
    <slug>/                   # 包目录名：^[a-z0-9][a-z0-9-]{1,63}$
      package.notchany.json   # NotchAny 设置页导出的 .notchany.json 原样
      manifest.json           # 上架元数据（格式见 schema/manifest.schema.json）
      icon.png                # 必需：安装后的真实图标，方形 PNG，256–1024px，≤512KB
      screenshots/            # 可选：最多 4 张 .png/.jpg，单张 ≤1MB
```

`manifest.json` 形状（`manifest_version: 1`，完整约束见 [schema](schema/manifest.schema.json)）：

```json
{
  "manifest_version": 1,
  "names": { "zh-Hans": "CPU 占用", "en": "CPU Usage" },
  "summaries": { "zh-Hans": "≤80 字的一句话简介", "en": "One-line summary" },
  "descriptions": { "zh-Hans": "markdown 详细说明", "en": "…" },
  "version": "1.0.0",
  "tags": ["monitor"],
  "license": "MIT"
}
```

## 上架流程（PR）

1. 在 NotchAny 设置页导出你的动作/小组件，得到 `.notchany.json` 封套文件。
2. Fork 本仓库，在 `packages/<你的 GitHub 用户名>/<slug>/` 下放入
   `package.notchany.json`（导出文件原样改名）、`manifest.json` 与发布向导自动生成的
   `icon.png`；建议同时提供真实 NotchAny 运行界面截图。`icon.png` 与动作/小组件安装后
   的 `symbol`、文字或图片图标同源，不要另做一套市场封面。
3. 提交 PR。CI（`scripts/check-pr.mjs`）自动校验，全绿后由 maintainer 审核合并。
4. 合并进 main 后 CI 自动重建 `index/v1/index.json`，App 侧即可发现新包。
5. 更新包 = 再次 PR 同一目录，`manifest.json` 的 `version` **必须严格递增**。

PR 只允许改动 `packages/**` 下、且属于你自己用户名目录的文件；`index/`、`schema/`、
`scripts/` 由 maintainer 直接维护。本地可先自检：

```bash
node scripts/check-pr.mjs      # 全量校验所有包
node scripts/build-index.mjs   # 重新生成 index（maintainer 用）
```

## 脱敏要求（硬校验）

导出文件可能带上你本机的参数值，上架前必须脱敏：

- `action.parameter_values` **必须删除**——它是你的本机参数当前值（可能含个人路径、
  密钥、账号信息），CI 检测到即拒绝。参数默认值请写在 `parameters` 声明的 `default` 里。
- 脚本内不得内嵌任何密钥/token/个人路径；需要密钥的服务应引导用户配置参数或环境变量。
- 会把用户数据发给第三方服务的包，必须在 `descriptions` 里写明服务名、域名与发送字段。

## 审核标准

- 脚本可读、无混淆、无编码/压缩后的不可审计内容；
- 不做与描述无关的事：不偷偷联网上传、不写入包外文件、不修改系统配置；
- 依赖第三方 CLI 的在 `action.requires` 中声明（App 导入时会检测提示）；
- `manifest.json` 双语齐全（至少 zh-Hans 或 en 其一完整），描述与实际行为一致；
- 小组件类建议先用 `notchany-cli test-widget` 自测通过再提交。

## 安全模型

市场的信任链条：

1. **PR 审核**：所有包经 CI 机器校验 + maintainer 人工审核脚本全文后才进入 main。
2. **sha256 锁定**：`index/v1/index.json` 记录每个包文件的 `sha256` 与 `size_bytes`；
   App 优先经匿名计数 Worker、失败时经 GitHub raw 拉取包体；每个来源都必须
   **先校验 sha256** 再解析——index 与包体
   不一致（如 CDN 缓存不同步、中间人篡改）时拒绝安装。
3. **安装前脚本全文确认**：NotchAny 导入市场包时向用户展示动作的**完整脚本源码**、
   依赖声明与权限面（文件输入/实况/触发器），用户确认后才落库。脚本以用户身份在本机
   执行——请始终读一遍再确认。
4. **版本可追溯**：包目录的全部历史即 git 历史；`version` 严格递增，index 的
   `published_at` / `updated_at` 取自 commit 时间。

## Web 市场

`scripts/build-site.mjs`（零依赖，Node ≥18）读取 index、`site/curation.json` 与包素材，
生成中文根路径和 `/en/` 英文镜像到 `site/dist/`。首页包含精选、搜索、全部/最新/热门、
类型/标签筛选与查询参数恢复；详情页包含真实截图、依赖、脚本风险、源码/反馈和相关推荐。
全站「下载 App」进入下载提示页，正式下载地址通过 `NOTCHANY_APP_DOWNLOAD_URL` 构建变量注入；
未配置时显示准备中，不输出空链接。「在 NotchAny 中打开」只定位 App 详情页，未唤起时自动
进入下载提示页，安装仍需用户确认。构建与 GitHub Pages
部署说明见 [site/README.md](site/README.md)。精选配置最多 3 个，未知/重复 ID 会让构建失败。

## 下载计数

[worker/](worker/) 是一个 Cloudflare Worker：`GET /pkg/<owner>/<slug>` 透传
GitHub raw 包体并对 KV 匿名计数 +1，`GET /counts.json` 聚合返回各包下载量供
市场站展示；不记录任何请求者信息（无 IP/UA）。部署步骤见
[worker/README.md](worker/README.md)。

## 本仓库文件

| 路径 | 说明 |
| --- | --- |
| `packages/` | 全部上架包（PR 的唯一可改区域） |
| `index/v1/index.json` | 静态索引（CI 生成，勿手改） |
| `schema/manifest.schema.json` | manifest 的 JSON Schema（draft-07） |
| `scripts/check-pr.mjs` | PR / 本地校验脚本（Node ≥18，零依赖） |
| `scripts/build-index.mjs` | index 生成脚本（Node ≥18，零依赖） |
| `scripts/build-site.mjs` | Web 市场静态站生成脚本（Node ≥18，零依赖） |
| `site/curation.json` | 维护者精选包配置（最多 3 个） |
| `site/styles.css` / `site/store.js` | 构建时内联的样式与客户端交互 |
| `site/` | 市场站部署说明（产物 `site/dist/` 不入库） |
| `worker/` | 下载计数 Cloudflare Worker（代码 + wrangler 配置） |
| `MAINTAINERS` | maintainer 用户名列表（可跨 owner 目录提交） |
