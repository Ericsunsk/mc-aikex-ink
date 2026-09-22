# 协作指南（约 3 人）

## 分支

| 分支 | 用途 |
|------|------|
| `main` | 可上线；受保护，只接受 PR |
| `feat/*` | 新功能 |
| `fix/*` | 修 bug |

## 流程

1. `git pull origin main`
2. `git checkout -b feat/你的名字-简述`
3. 改代码 → 自测（浏览器 + 联机）
4. `git push -u origin HEAD` → 开 Pull Request → 另一人 Approve → 合并
5. 合并后自动部署（见 `.github/workflows/deploy.yml`）

## 约定

- 小 PR、少文件；联机协议改动写在 PR 说明里
- 密钥 / `server/data/admins.json` / 真实 `ecosystem.config.cjs` 禁止入库
- 方块 ID、物品 ID（≥100）冲突先在群里同步

## 本地联调

静态页用 Live Server / `npx serve`；`server` 目录 `npm i && node server.js`。
