# 🍊🍅 YozaPomo（柚子钟）

> 一个优雅的桌面番茄钟 + TODO 管理工具，悬浮窗设计，专注提升效率。

![Tauri](https://img.shields.io/badge/Tauri-v2-blue) ![Vue 3](https://img.shields.io/badge/Vue-3-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![SQLite](https://img.shields.io/badge/SQLite-3-blue)

## ✨ 特性

- **悬浮窗**：透明圆角，置顶显示于屏幕右上角，支持 TODO 快捷管理和番茄钟控制。
- **TODO 管理**：
  - 当日 TODO 显示数量可配置。
  - 双击开始/暂停任务，右键菜单结束任务。
  - 任务开始后绑定番茄钟，支持专注时长统计。
  - 任务完成后弹出备注窗口（Markdown 支持）。
- **番茄钟专注**：
  - 默认专注时长可设置。
  - 每 5 分钟提醒并显示“我还在”按钮，未响应则强制结束并记录异常专注。
  - 倒计时结束后可进入休息模式，展示超时和超限时间。
  - 专注结束后支持备注记录。
- **管理界面**：
  - 管理 TODO（增删改查，支持日期、专注时段、备注）。
  - 查看专注历史与关联 TODO。
  - 设置选项（专注时长、TODO 数量、显示倒计时、提示音等）。
- **数据存储**：SQLite 本地数据库，通过 `tauri-plugin-sql` 管理。
- **系统托盘**：右键菜单打开管理界面/退出，左键单击显示/隐藏管理界面。
- **跨平台**：支持 Windows、macOS、Linux。

## 🖼 界面预览

（待补充截图）

## 🛠 技术栈

| 领域       | 技术选型                                      |
| ---------- | --------------------------------------------- |
| 桌面框架   | Tauri v2 (Rust)                               |
| 前端框架   | Vue 3 + TypeScript                            |
| UI 组件库  | Naive UI + Tailwind CSS                       |
| 状态管理   | Pinia                                         |
| 原生菜单   | Tauri Menu API                                |
| 数据库     | SQLite + `tauri-plugin-sql`                   |
| 音效播放   | Howler.js 或 Web Audio                        |
| 动画       | Canvas 粒子系统、CSS 动画                     |

## 📦 安装与运行

### 环境要求

- Node.js ≥ 18
- Rust（最新稳定版）
- 系统依赖：参考 [Tauri 前置依赖](https://tauri.app/v1/guides/getting-started/prerequisites)

### 克隆与启动

```bash
git clone https://github.com/your-username/YozaPomo.git
cd YozaPomo

# 安装前端依赖
npm install

# 开发模式（自动启动 Tauri 窗口）
npm run tauri dev
```
构建生产版本
```bash
npm run tauri build
```

输出的安装包位于 src-tauri/target/release/bundle/。

📄 许可证
本项目采用 MIT License。

🤝 贡献
欢迎提交 Issue 和 Pull Request。请确保代码符合项目编码规范（ESLint + Prettier + Rustfmt）。

📧 联系
作者：Yoza Xing
邮箱：17860286525@163.com
项目主页：GitHub - your-username/YozaPomo