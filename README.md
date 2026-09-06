# Artifex Web

Artifex 内容生产平台的企业用户控制台。

用户在这里创建**应用**（一个内容业务场景），从平台模板复制出**配方**（一套长期不变的生产要求：写给谁看、多长、什么风格、资料从哪找），配好一次反复使用。之后每次生产只提交本次主题。

后端：[artifex-core](https://github.com/NinePhoenixs/artifex-core)（Go，独立仓库）

---

## 功能

- **应用管理** —— 创建应用并选定内容类型（类型决定产出形态，创建后不可更改）、修改名称与说明
- **配方管理** —— 从平台模板复制配方、切换应用当前使用的配方
- **配方编辑** —— 四段式表单：基本信息 / 资料检索 / 内容生成 / 质量评审
- **离线可用** —— 后端未启动时自动切换到演示数据（仅开发环境）

MVP 仅开放图文类。视频、音频、演示类的接口结构已就位，后端未投产。

---

## 技术栈

| | | |
|---|---|---|
| [React 19](https://react.dev) | [TypeScript 5](https://www.typescriptlang.org) | [Vite 8](https://vite.dev) |
| [Ant Design 6](https://ant.design) | [React Router 7](https://reactrouter.com) | [TanStack Query 5](https://tanstack.com/query) |
| [Vitest 4](https://vitest.dev) | [Testing Library](https://testing-library.com) | [dnd-kit](https://dndkit.com) |

选型理由见 [`docs/设计方案.md`](docs/设计方案.md) §2。

---

## 快速开始

```bash
nvm use          # 读 .nvmrc，只在本目录生效
pnpm install
pnpm dev         # http://localhost:5173
```

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 开发服务器 |
| `pnpm test` | 单元测试 |
| `pnpm typecheck` | 类型检查 |
| `pnpm build` | 生产构建 |

**后端未启动也能开发**——页面自动切到演示数据并显示横幅，后端就绪后自动切回。

### 连接后端

```bash
cd ../artifex-core && make migrate && make run   # :18080
```

接口地址由 `.env.development` 的 `VITE_API_BASE` 控制：填写地址则直连，留空则走同源相对路径、由 Vite 代理转发。

---

## 项目结构

```
src/
├── api/            接口类型、HTTP 封装、错误处理、缓存键
├── constants/      枚举兜底字典与补充文案
├── hooks/          useEnums · useApiError
├── layouts/        顶栏 · 侧边导航
├── pages/          apps · recipes（含 editor 四段表单）
├── components/     通用组件
└── mocks/          演示数据（仅开发环境）
```

**分层约定**：`pages/` 不直接调用 `fetch`，一律经过 `api/`。

---

## 开发约定

以下四条约束源自后端契约，改动相关代码前需要了解。完整说明见 [`docs/设计方案.md`](docs/设计方案.md)。

### 接口类型以实际响应为准

`docs/recipe.proto` 是后端契约的只读副本，仅作参考，不参与构建。**部分字段的实际响应与 proto 声明不一致**（如应用列表为扁平结构而非嵌套），差异已在 `src/api/types.ts` 中逐条标注。

### 配方编辑器四段共用一个表单

四段是同一份数据的四个视图，保存时全量提交。切换分段使用 `display:none` 而**不卸载**，以便转就绪失败时一次性标红跨段的全部字段。

### 保存与转就绪的校验强度不同

| 操作 | 校验范围 | 失败响应 |
|---|---|---|
| 保存 | 格式、区间、枚举 | 400 + 单个字段 |
| 转就绪 | 必填项完整性 | 422 + 全部缺失字段 |

422 需一次性标红全部字段。保存成功而转就绪失败时配置**已经落库**，提示语须为「已保存，但还差这几项才能启用」。

### 字段可见性分两类判断

| 类别 | 字段 | 判断依据 |
|---|---|---|
| 按应用类型裁剪 | `targetWordCount` `contentStructure` `visualStyle` | 响应中是否存在该 key |
| 按当前取值联动 | `customTone` `customSections` `customFreshness` | 当前枚举值是否为 `custom` |

不要维护「哪个类型有哪些字段」的静态对照表。

---

## 部署

同域部署，nginx 统一入口：`/` 提供静态资源，`/v1` 反代至后端容器。

发版流程与后端一致，打版本 tag 触发：

```bash
git tag v1.0.0 && git push origin v1.0.0
```

首次部署、回退方式与本地验证镜像的方法见 [`docs/部署发版.md`](docs/部署发版.md)。

---

## 限制

- 无登录与权限体系（后端尚未提供）
- 生产任务与成品预览未实现（后端尚未提供接口）
- 打包体积 1.2 MB（gzip 395 KB），尚未按路由做代码分割
- 测试覆盖接口层与通用组件，页面级测试待补
