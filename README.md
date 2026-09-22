# 像素方块世界 (mc.aikex.ink)

开源体素沙盒：单机存档、联机房间、地狱/末地、末影龙、管理面板。

**正式试玩：** https://mc.aikex.ink/  
**GitHub Pages 预览：** https://aiyangdie.github.io/mc-aikex-ink/  
（Pages 只能托管静态页；联机自动连回 `mc.aikex.ink`。推 `main` 两边都会更新。）

## 技术栈

- 前端：Three.js ES Module（静态站点）
- 联机：Node.js + `ws`（WebSocket + `/api/rooms`）
- 部署示例：Nginx 反代 + PM2

## 目录

```
index.html / js/ / styles/   # 浏览器端
server/server.js             # 联机与管理 API
server/ecosystem.config.cjs.example
```

## 本地运行

```bash
# 1) 静态页：任意静态服务器指向仓库根目录
# 2) 联机服务
cd server
cp ecosystem.config.cjs.example ecosystem.config.cjs   # 改 MC_OWNER_KEY
npm install
node server.js
# 浏览器访问时把 /ws 与 /api 反代到 127.0.0.1:3040
```

管理面板：游戏内按 `` ` ``，用 `MC_OWNER_KEY` 登录。

## 三人协作

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

简要：

1. 从 `main` 拉功能分支 `feat/xxx`
2. 开 PR，至少一人 Review
3. 合并 `main` 后 **GitHub Actions 自动部署** 到生产机（self-hosted runner）

## 安全

- **不要**把 `MC_OWNER_KEY`、GitHub PAT、`admins.json` 提交进仓库
- 生产机用 `ecosystem.config.cjs`（已 gitignore）

## License

MIT — 见 [LICENSE](LICENSE)
