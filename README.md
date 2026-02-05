# TrollScript Store

巨魔脚本商店 - 自动化脚本仓库

[![Build Store](https://github.com/dompling/TrollScript-Store/actions/workflows/build-store.yml/badge.svg)](https://github.com/dompling/TrollScript-Store/actions/workflows/build-store.yml)

## 🔗 相关链接

- **发布仓库**: [TrollScript-Release](https://github.com/dompling/TrollScript-Release)
- **API 文档**: [API.md](https://github.com/dompling/TrollScript-Release/blob/main/API.md)

## 📜 脚本列表

<!-- SCRIPTS_START -->
| 脚本 | 描述 | 版本 | 文档 |
|------|------|------|------|
| **ExpressSMS** | 提取快递短信取件码 | `1.0.2` | [📖](./message/README.md) |
| **Copylog** | 唤起 Copylog | `1.0.0` | [📖](./scripts/README.md) |
| **PerformanceMonitor** | 实时性能监控 HUD | `1.0.0` | [📖](./scripts/README.md) |
<!-- SCRIPTS_END -->

## 📦 项目结构

```
TrollScript-Store/
├── .github/
│   └── workflows/
│       └── build-store.yml    # GitHub Actions 自动构建
├── message/                    # 消息类脚本
│   └── *.js
│   └── README.md              # 自动生成的脚本文档
├── scripts/
│   └── build-store.js         # 构建脚本
├── store.json                  # 生成的商店数据
├── package.json
└── README.md
```

## 🚀 快速开始

### 添加新脚本

1. 在 `message/` 或其他目录下创建 `.js` 文件
2. 在文件顶部添加元数据注释：

```javascript
/*
 id: YourScriptId
 name: 脚本名称
 description: 脚本描述
 icon: terminal
 category: 工具
 version: 1.0.0
 */

// 你的脚本代码...
```

3. 提交并推送到 `main` 分支
4. GitHub Actions 会自动构建并更新 `store.json` 和脚本文档

### 元数据字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | ✅ | 脚本唯一标识符 |
| `name` | ✅ | 脚本显示名称 |
| `description` | ✅ | 脚本描述 |
| `icon` | ✅ | 图标名称 (SF Symbols) |
| `category` | ✅ | 分类名称 |
| `version` | ✅ | 版本号 (语义化版本) |

### 可用图标

使用 [SF Symbols](https://developer.apple.com/sf-symbols/) 图标名称，例如：
- `terminal` - 终端
- `play.circle` - 播放
- `message` - 消息
- `gear` - 设置
- `doc.text` - 文档

## 🛠 本地开发

### 安装依赖

```bash
npm install
```

### 手动构建

```bash
npm run build
```

这将扫描所有脚本文件并生成 `store.json` 和脚本文档。

## 🔄 自动化工作流

当你推送脚本文件到 `main` 分支时，GitHub Actions 会自动：

1. 检出代码
2. 安装依赖
3. 运行构建脚本
4. 生成 `store.json` 和各目录的脚本 README
5. 更新主 README.md 的脚本列表
6. 如果有变化，自动提交更新

你也可以在 GitHub Actions 页面手动触发构建（workflow_dispatch）。

## 📄 store.json 结构

```json
{
  "version": "1.0",
  "lastUpdated": "2024-03-20T12:00:00Z",
  "categories": ["工具", "媒体"],
  "authors": [
    {
      "name": "dompling",
      "avatar": "https://avatars.githubusercontent.com/u/23498579?v=4",
      "scripts": [
        {
          "id": "ScriptId",
          "name": "脚本名称",
          "description": "脚本描述",
          "icon": "terminal",
          "category": "工具",
          "version": "1.0.0",
          "downloadUrl": "https://raw.githubusercontent.com/.../script.js",
          "size": 1024,
          "downloads": 100,
          "createdAt": "2024-03-20T12:00:00Z",
          "updatedAt": "2024-03-20T12:00:00Z"
        }
      ]
    }
  ]
}
```

## 📝 License

ISC © [dompling](https://github.com/dompling)
