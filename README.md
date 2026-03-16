# openclaw-news-watcher

> 基于 Playwright 的加密货币新闻监听 Skill，无需登录账号，无需 API Key。

检测到新文章时，自动抓取全文  调用 OpenClaw Agent 进行 AI 总结  发送到 Telegram。

## 效果预览

![Telegram 效果截图](screenshots/telegram-preview.png)
![运行终端截图](screenshots/terminal-preview.png)

## 工作原理

```
主页轮询（60秒间隔）
   
提取最新文章 URL  MD5 哈希
    URL 变化（有新文章置顶）
打开文章页抓取全文
   
OpenClaw Agent AI 总结
   
发送 Telegram 通知
```

**优势：**
-  无需 RSS / Webhook / API Key
-  无需登录账号
-  全文总结而非只看标题
-  基于 URL 哈希检测，不被价格波动误触发
-  持久化浏览器连接，每次检查约 3-5 秒

## 环境要求

| 依赖 | 说明 |
|------|------|
| Node.js >= 18 | 运行脚本 |
| [OpenClaw](https://openclaw.ai) | AI Agent 框架，提供 Telegram 发送和 AI 总结 |
| Google Chrome | 已安装即可，无需下载 Chromium |

## 快速开始

```bash
# 1. 进入技能目录
cd ~/.openclaw/workspace/skills/news-watcher

# 2. 安装依赖
npm install

# 3. 设置环境变量
# Windows PowerShell
$env:TELEGRAM_TARGET = "你的 Telegram Chat ID"
$env:OPENCLAW_MJS = "path/to/openclaw.mjs"  # 可选，会自动查找

# 4. 启动监听
node scripts/watch-news.js --site coindesk --interval 60
```

## 环境变量

| 变量 | 必须 | 说明 |
|------|------|------|
| `TELEGRAM_TARGET` |  | Telegram 收件人 Chat ID |
| `OPENCLAW_MJS` | 可选 | openclaw.mjs 路径，不设置会自动查找 |
| `CHROME_PATH` | 可选 | Chrome 可执行路径，默认使用系统路径 |
| `PLAYWRIGHT_HEADLESS` | 可选 | 设为 `false` 可看到浏览器窗口（调试用）|

## 参数

```bash
node scripts/watch-news.js [选项]

  --site <name>        监听网站: coindesk（默认）| panews
  --interval <秒>      检查间隔秒数，默认 60
```

## 支持的网站

| 网站 | 参数 | URL |
|------|------|-----|
| CoinDesk 中文 | `coindesk` | https://www.coindesk.com/zh |
| PANews | `panews` | https://www.panewslab.com/zh |

## 文件结构

```
news-watcher/
 scripts/
    watch-news.js      # 主脚本
 screenshots/           # 效果截图
 watch-news.txt         # 脚本透明副本（适合在社区审查）
 skill.json             # OpenClaw 工具定义
 package.json           # 依赖
 README.md
```

## 故障排除

**找不到 openclaw.mjs**  
 手动设置 `OPENCLAW_MJS` 环境变量为 openclaw.mjs 的完整路径

**Chrome 启动失败**  
 设置 `CHROME_PATH` 环境变量指向 chrome.exe

**Telegram 未收到消息**  
 检查 `TELEGRAM_TARGET` 是否正确，确认 OpenClaw Telegram 渠道已配置

## 许可证

MIT  自由使用，欢迎 PR

---

>  **安全说明**：代码完全开源透明，不收集任何数据，所有通知通过本地 OpenClaw 发送。
