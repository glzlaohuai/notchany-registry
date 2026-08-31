# notchany-market Worker（下载计数）

Cloudflare Worker：透传包体下载并做匿名安装计数。

- `GET /pkg/<owner>/<slug>` — 校验 owner/slug 形状后，透传
  `raw.githubusercontent.com` 上对应的 `package.notchany.json`
  （`Content-Type: application/json` + CORS `*`），成功时对 KV key
  `<owner>/<slug>` 计数 +1；KV 写失败不影响响应。
- `GET /counts.json` — 聚合返回 `{ "<owner>/<slug>": n, ... }`
  （CORS `*`，`cache-control: max-age=300`），供市场静态站展示「安装量 N」。
- 其他路径 404。

**隐私**：不记录任何请求者信息——无 IP、无 UA、无时间戳日志；KV 里只有
`<owner>/<slug> -> 累计次数`，无法关联到任何个人。计数是 KV 读-改-写，
并发下偶有少计，定位是「大致安装量」而非精确账本。

## 部署步骤

需要 Cloudflare 账号与 [wrangler](https://developers.cloudflare.com/workers/wrangler/)
（`npm i -g wrangler` 后 `wrangler login`）。以下命令都在 `worker/` 目录里执行：

1. 创建 KV namespace，并把输出的 `id` 填进 `wrangler.toml` 的
   `REPLACE_WITH_KV_NAMESPACE_ID`：

   ```bash
   wrangler kv namespace create COUNTS
   ```

2. 部署：

   ```bash
   wrangler deploy
   ```

   部署输出里会给出实际地址，形如
   `https://notchany-market.<你的子域>.workers.dev`。

3. 验证：

   ```bash
   curl https://notchany-market.<你的子域>.workers.dev/pkg/glzlaohuai/wifi-name
   curl https://notchany-market.<你的子域>.workers.dev/counts.json
   ```

4. 回填静态站：把 `scripts/build-site.mjs` 顶部的 `COUNTS_URL` 常量里的
   `REPLACE_ME` 换成你的实际子域，重新 `node scripts/build-site.mjs` 并部署
   site（见 [site/README.md](../site/README.md)）。页面即显示「安装量 N」。

5. App 侧切换（可选但推荐，否则安装不计数）：把 NotchAny 里市场包体的下载
   base 从 `https://raw.githubusercontent.com/glzlaohuai/notchany-registry/main/packages/`
   切换为 `https://notchany-market.<你的子域>.workers.dev/pkg/`（路径从
   `<owner>/<slug>/package.notchany.json` 变为 `<owner>/<slug>`）。Worker 只做
   透传，App 侧按 index 的 sha256 校验包体的逻辑不变；Worker 不可用时可回落
   raw 直连，仅损失计数。
