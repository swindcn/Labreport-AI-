# Vitalis Core Mobile Prototype

基于 React + TypeScript + Tailwind + Vite 的移动端医疗报告助手原型，当前同时包含前端路由应用、资源化 API 适配层，以及本地 Node API 服务。

当前版本：`v0.3.0`

## 今日成果

今天完成的核心工作：

- 报告上传流已拆成真实资源动作：创建报告、上传源文件、绑定来源、启动扫描、读取结果
- `Reports Archive` 支持失败报告批量管理，并新增结果版本状态可见性
- 新增 `Report Source` 页面，支持源文件预览、打开、替换、移除
- 头像上传和报告源文件都已接入真实资产存储，不再只是临时页面状态
- 后端资产存储从主服务中抽离为独立 `assetStore`
- 新增后端集成测试与纯逻辑测试，覆盖扫描 mock、归档逻辑、版本状态、资产上传与清理

## 运行

要求：

- Node.js 20+
- npm 10+

安装依赖：

```bash
npm install
```

启动前端开发环境：

```bash
npm run dev
```

启动本地 API：

```bash
npm run dev:api
```

生产构建：

```bash
npm run build
```

运行测试：

```bash
npm test
```

预览构建结果：

```bash
npm run preview
```

## 路由

项目使用轻量 hash router，浏览器地址格式为 `#/path`。

主要路由：

- `#/screens`：路由索引页
- `#/home`：扫描入口首页
- `#/dashboard`：报告上传与家庭档案主页
- `#/report-upload`：选择报告图片、拍照或文件
- `#/scanning`：报告识别中
- `#/report-analysis`：AI 识别结果
- `#/report-source`：报告原始文件预览与管理
- `#/reports-archive`：报告历史归档
- `#/manual-entry`：手动添加指标
- `#/trends`：健康趋势分类页
- `#/biomarker-trends`：生物标识物详情页
- `#/profile-registration`：患者信息登记
- `#/member-list`：家庭成员管理
- `#/register`：注册页
- `#/login`：登录页
- `#/profile`：个人主页

## 当前业务能力

- 登录、注册、验证码草稿流
- 家庭成员新建、编辑、删除、激活切换
- 头像上传、替换、删除
- 报告图片/PDF 上传与手动录入
- 自动扫描进度推进、失败态与重试
- 报告分析、收藏、导出、保存归档
- Reports Archive 按月份分组、失败报告批量管理、源文件预览入口
- 报告源文件版本状态提示：`Latest Results`、`Refreshing`、`Scan Failed`、`Legacy Result`

## 状态流

全局状态位于 [src/lib/healthStore.tsx](/Users/swindcn/Documents/New%20project/src/lib/healthStore.tsx)。

核心领域对象：

- `auth`：登录和注册草稿、当前用户
- `profiles`：本人和家属档案
- `reports`：报告资源
- `activeProfileId`：当前激活成员
- `selectedReportId`：当前选中报告
- `profileDraft` / `profileDraftState`：档案编辑草稿
- `scanSession`：扫描页进度状态
- `manualEntryDraft`：手动录入表单状态

主要状态流：

1. 登录或注册后，hydrate 远端资源与本地 UI 草稿。
2. `Member List` 和 `Profile Registration` 共同维护成员新建、编辑、删除。
3. 上传报告时，先创建报告草稿，再上传源文件、绑定来源、进入扫描流程。
4. 扫描页自动推进进度，并在完成后进入分析页。
5. 替换报告源文件后，会直接把当前报告重新置为待扫描状态并进入新一轮识别。
6. `Report Analysis`、`Report Source`、`Reports Archive` 共用同一份报告资源与版本状态。
7. 失败报告支持单个重试与归档批量重试/删除。

持久化边界：

- 远端领域资源：`session`、`profiles`、`reports`、`preferences`、`assets`
- 本地 UI 草稿：`profileDraft`、`scanSession`、`manualEntryDraft`

## API 层

API 抽象位于 [src/lib/api/healthApi.ts](/Users/swindcn/Documents/New%20project/src/lib/api/healthApi.ts)。

支持两种模式：

- 默认本地模式：按资源写入 `localStorage`
- 远端模式：设置 `VITE_API_BASE_URL=/api` 后，请求本地 Node API；UI 草稿继续在浏览器本地保存

启用后端开发模式：

1. 复制 `.env.example` 为 `.env.local`
2. 保持 `VITE_API_BASE_URL=/api`
3. 一个终端运行 `npm run dev:api`
4. 另一个终端运行 `npm run dev`

当前远端接口：

- `GET /auth/session`
- `POST /auth/login`
- `POST /auth/register`
- `DELETE /auth/session`
- `GET /profiles`
- `POST /profiles`
- `PATCH /profiles/:id`
- `DELETE /profiles/:id`
- `POST /profiles/:id/avatar`
- `DELETE /profiles/:id/avatar`
- `GET /reports`
- `GET /reports/:id`
- `POST /reports`
- `PATCH /reports/:id`
- `DELETE /reports/:id`
- `POST /reports/:id/files`
- `DELETE /reports/:id/files`
- `POST /reports/:id/source`
- `POST /reports/:id/favorite`
- `POST /reports/:id/scan`
- `POST /reports/:id/retry`
- `GET /reports/:id/results`
- `POST /reports/manual`
- `GET /assets/:id/content`
- `GET /users/me/preferences`
- `PATCH /users/me/preferences`

兼容说明：

- `POST /reports/:id/complete` 仍作为旧别名保留在后端，便于过渡
- 本地模式兼容旧版 `vitalis-core-state-v1`

## 后端

后端入口位于 [server/index.js](/Users/swindcn/Documents/New%20project/server/index.js)。

当前是一套无额外依赖的 Node HTTP 服务，已实现：

- session cookie 登录态
- `profiles` / `reports` / `preferences` 的资源化接口
- 头像与报告源文件的本地资产存储
- 资产内容访问接口
- 删除成员、删除报告、删除源文件时的资产清理

资产存储边界位于 [server/assetStore.js](/Users/swindcn/Documents/New%20project/server/assetStore.js)。

数据持久化：

- 初始种子数据在 [server/data/seed.json](/Users/swindcn/Documents/New%20project/server/data/seed.json)
- 运行态数据库默认写入 `server/data/runtime/health-db.json`
- 运行态资产默认写入 `server/data/runtime/assets`

默认演示账号：

- `jane.smith@medical.com`
- `password123`

## 测试

当前测试覆盖：

- 扫描 mock 逻辑：[src/lib/scan/mockScanService.test.ts](/Users/swindcn/Documents/New%20project/src/lib/scan/mockScanService.test.ts)
- Reports Archive 过滤与批量提示：[src/lib/reportsArchiveUtils.test.ts](/Users/swindcn/Documents/New%20project/src/lib/reportsArchiveUtils.test.ts)
- 报告版本状态判定：[src/lib/reportVersionState.test.ts](/Users/swindcn/Documents/New%20project/src/lib/reportVersionState.test.ts)
- 资产存储单元测试：[server/assetStore.test.js](/Users/swindcn/Documents/New%20project/server/assetStore.test.js)
- 资产相关 API 集成测试：[server/assetsApi.test.js](/Users/swindcn/Documents/New%20project/server/assetsApi.test.js)

当前已验证：

- `npm test`
- `tsc --noEmit -p tsconfig.app.json`
- 后端关键脚本 `node --check`

## 版本内容说明

### v0.3.0

本版本主要内容：

- 报告资源流从“整份 state 过渡方案”推进到更明确的 `reports` 资源接口
- 引入本地资产存储，支持头像和报告源文件上传、访问、替换、删除、清理
- 新增 `Report Source` 文件预览与管理页面
- 报告替换源文件后可直接重新进入扫描流程
- 报告新增 `sourceUpdatedAt` / `resultsGeneratedAt`，归档与分析页可以识别结果是否基于最新文件
- 测试覆盖增加到当前 `20` 项

## 目录结构

```text
src/
  components/
    health/
      primitives.tsx
      sections.tsx
    mobile/
    ui/
  lib/
    api/
      healthApi.ts
    hashRouter.tsx
    healthData.ts
    healthStore.tsx
    reportVersionState.ts
    reportsArchiveUtils.ts
    scan/
      mockScanService.ts
  pages/
    healthRoutes.tsx
  App.tsx
  main.tsx

server/
  assetStore.js
  assetsApi.test.js
  assetStore.test.js
  index.js
  scanService.js
  data/
    seed.json
    runtime/
```

## 说明

- 当前图标和部分插画仍是几何占位
- 当前扫描与 OCR 仍是 mock 逻辑，尚未接入真实识别服务
- 当前资产存储是本地文件目录，后续可以继续抽换为对象存储
