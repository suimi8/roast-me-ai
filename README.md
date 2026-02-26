<div align="center">

# 😈 Roast Me AI · 赛博监工

**一个会定时截图、用 AI 毒舌点评你在干什么的桌面应用。**

乖乖干活，或者准备好挨骂。

[![Release](https://img.shields.io/github/v/release/suimi8/roast-me-ai?style=flat-square&color=e74c3c)](https://github.com/suimi8/roast-me-ai/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/suimi8/roast-me-ai/releases)
[![Built with Electron](https://img.shields.io/badge/built%20with-Electron-47848f?style=flat-square)](https://www.electronjs.org/)
[![Vue 3](https://img.shields.io/badge/UI-Vue%203-42b883?style=flat-square)](https://vuejs.org/)

</div>

---

## 🤔 这是什么？

你有没有过这种经历——打开电脑说要好好工作，然后不知不觉刷了两小时 B 站？

**Roast Me AI** 就是为解决这个问题而生的。它会：

1. **定时截图**你的屏幕（默认每 5 分钟）
2. 把截图发给 AI，让它**识别你在干什么**
3. 在屏幕右下角弹出一个**毒舌点评弹窗**，直接开骂

> *"你他妈又在刷视频是吧，整个屏幕都是 B 站推荐，你的期末论文知道你在干嘛吗？"*

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| 🔍 **智能屏幕识别** | AI 精确识别你在用什么软件、看什么网站、写什么代码 |
| 💬 **毒舌弹窗** | 右下角无框透明弹窗，8秒后自动消失，点击可关闭 |
| ⏱️ **自定义间隔** | 可设置每 N 分钟审判一次，自律程度自己定 |
| 🎯 **手动触发** | 随时可以点「立即审判我」或托盘菜单主动挨骂 |
| ⌨️ **全局快捷键** | `Alt + Win + Z` 随时触发，不用鼠标 |
| 🗂️ **多接口配置** | 可配置多个 AI 接口并随时切换 |
| 📋 **实时日志** | 主界面右侧实时显示所有运行日志 |
| 🔒 **后台常驻** | 关闭窗口后仍在后台监控，右键托盘退出 |
| 💾 **设置持久化** | 配置保存到本地 JSON，重启后自动恢复 |

---

## 📦 下载安装

前往 [Releases 页面](https://github.com/suimi8/roast-me-ai/releases) 下载最新版本：

| 文件 | 说明 |
|------|------|
| `roast-me-ai-x.x.x-setup.exe` | 安装版，支持自定义安装目录 |
| `roast-me-ai-x.x.x-portable.exe` | 便携版，下载即用，无需安装 |

> **系统要求**：Windows 10 / 11（64位）

---

## 🚀 快速上手

### 第一步：配置 AI 接口

启动应用后，点击 **⚙️ 设置** 按钮，添加你的 AI 接口：

- **Provider Type**：选择接口类型（OpenAI / Anthropic / Codex）
- **API Key**：填入你的 API 密钥
- **Base URL**：填入接口地址（支持国内服务如阿里百炼、硅基流动等）
- **Model**：填入模型名称（如 `gpt-4o`、`claude-3-5-sonnet` 等）

填完后点 **「测试连接」**，成功后保存即可开始监控。

### 支持的 AI 服务

由于使用标准 OpenAI 兼容格式，理论上支持所有兼容接口：

- **OpenAI**（GPT-4o、GPT-4 Vision 等）
- **Anthropic**（Claude 3.5 Sonnet 等）
- **阿里百炼**（qwen-vl-max 等）
- **硅基流动**（各类开源多模态模型）
- **其他** OpenAI 兼容接口

> ⚠️ 需要使用支持**图像识别（Vision）**的多模态模型，纯文本模型无法工作。

### 第二步：开始监控

保存设置后，应用会自动开始监控。你可以：

- 直接等待定时触发
- 点击 **🎯 立即审判我** 手动触发
- 按 `Alt + Win + Z` 快捷键触发
- 右键系统托盘图标 → **🎯 立即审判**

---

## 📁 设置文件位置

| 运行方式 | 配置文件路径 |
|---------|------------|
| 安装版 | `%APPDATA%\roast-me-ai\settings.json` |
| 便携版 | exe 文件同目录下的 `settings.json` |

---

## 🛠️ 本地开发

### 环境要求

- Node.js 18+
- npm

### 安装 & 启动

```bash
# 克隆项目
git clone https://github.com/suimi8/roast-me-ai.git
cd roast-me-ai

# 安装依赖
npm install

# 启动开发模式
npm run dev
```

### 打包发布

直接双击项目根目录的 **`打包发布.bat`**，会自动完成：

1. 打包 Windows 安装包 + 便携版
2. 创建 GitHub Release
3. 上传两个 exe 文件

也可以手动执行：

```bash
npm run build:win
```

输出文件在 `PackageRelease/` 目录。

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Electron](https://www.electronjs.org/) v39 |
| UI | [Vue 3](https://vuejs.org/) + TypeScript |
| 构建 | [electron-vite](https://electron-vite.org/) |
| 打包 | [electron-builder](https://www.electron.build/) |
| AI | OpenAI SDK / Anthropic SDK |
| 截图 | [screenshot-desktop](https://github.com/bencevans/screenshot-desktop) |

---

## 🔧 项目结构

```
roast-me-ai/
├── src/
│   ├── main/
│   │   └── index.ts          # 主进程：截图、AI调用、窗口管理
│   ├── preload/
│   │   └── index.ts          # 预加载脚本：IPC 桥接
│   └── renderer/src/
│       ├── views/
│       │   ├── MainSettings.vue   # 主界面（控制面板 + 日志）
│       │   └── RoastAlert.vue     # 毒舌弹窗
│       └── components/
│           └── Settings.vue       # 设置 Modal（AI 接口配置）
├── build/                    # 打包资源（图标等）
├── electron-builder.yml      # 打包配置
├── package.json
└── 打包发布.bat              # 一键打包并发布到 GitHub Releases
```

---

## ❓ 常见问题

**Q：弹窗出现后如何关闭？**
点击弹窗任意位置，或等待 8 秒自动关闭。

**Q：设置窗口关闭后监工还在运行吗？**
是的，应用会常驻系统托盘后台运行。右键托盘图标选「❌ 退出」才会真正退出。

**Q：支持 macOS / Linux 吗？**
目前主要针对 Windows 开发和测试，其他平台理论可编译但未经验证。

**Q：AI 接口费用贵吗？**
每次调用发送一张 JPEG 截图，具体费用取决于你使用的服务和模型。国内服务（阿里百炼、硅基流动）通常有免费额度，成本极低。

---

## � 致谢 / Acknowledgements

本项目基于以下优秀的开源项目构建，在此表示感谢：

### 核心框架

| 项目 | 用途 | License |
|------|------|---------|
| [Electron](https://github.com/electron/electron) | 跨平台桌面应用框架 | MIT |
| [Vue 3](https://github.com/vuejs/core) | 前端 UI 框架 | MIT |
| [electron-vite](https://github.com/alex8088/electron-vite) | Electron + Vite 开发构建工具 | MIT |
| [electron-builder](https://github.com/electron-userland/electron-builder) | 应用打包与分发 | MIT |
| [Vite](https://github.com/vitejs/vite) | 前端构建工具 | MIT |
| [TypeScript](https://github.com/microsoft/TypeScript) | 类型安全的 JavaScript | Apache-2.0 |

### AI 集成

| 项目 | 用途 | License |
|------|------|---------|
| [openai-node](https://github.com/openai/openai-node) | OpenAI / 兼容接口 SDK | Apache-2.0 |
| [@anthropic-ai/sdk](https://github.com/anthropic-ai/sdk-python) | Anthropic Claude SDK | MIT |

### 功能库

| 项目 | 用途 | License |
|------|------|---------|
| [screenshot-desktop](https://github.com/bencevans/screenshot-desktop) | 跨平台桌面截图 | MIT |
| [vue-router](https://github.com/vuejs/router) | Vue 路由管理 | MIT |
| [axios](https://github.com/axios/axios) | HTTP 请求库 | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | 环境变量管理 | BSD-2-Clause |
| [fs-extra](https://github.com/jprichardson/node-fs-extra) | 增强文件系统操作 | MIT |
| [chokidar](https://github.com/paulmillr/chokidar) | 文件变化监听 | MIT |
| [node-fetch](https://github.com/node-fetch/node-fetch) | Node.js Fetch API | MIT |

### 开发工具

| 项目 | 用途 | License |
|------|------|---------|
| [@electron-toolkit](https://github.com/alex8088/electron-toolkit) | Electron 开发工具集 | MIT |
| [ESLint](https://github.com/eslint/eslint) | 代码规范检查 | MIT |
| [Prettier](https://github.com/prettier/prettier) | 代码格式化 | MIT |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | 原子化 CSS 框架 | MIT |
| [vue-tsc](https://github.com/vuejs/language-tools) | Vue TypeScript 类型检查 | MIT |

---

## �📄 License

MIT © [suimi8](https://github.com/suimi8)

---

<div align="center">

**乖乖干活，别让赛博监工抓到你摸鱼。** 😈

</div>
