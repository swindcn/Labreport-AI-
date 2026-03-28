# Vitalis Core Mobile Prototype

基于 React + TypeScript + Tailwind + Vite 的移动端医疗报告助手前端原型。

当前版本实现了：

- 11 个真实 hash 路由页面
- 统一的业务组件拆分
- 全局应用 store
- 本地可运行的 API 适配层
- 已验证通过的 `vite build`

## 运行

要求：

- Node.js 20+
- npm 10+

安装依赖：

```bash
npm install
```

启动开发环境：

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

本地预览构建结果：

```bash
npm run preview
```

## 路由

项目使用轻量 hash router，所以浏览器地址格式为 `#/path`。

主要路由：

- `#/screens`：路由索引页
- `#/home`：扫描入口首页
- `#/dashboard`：报告上传与家庭档案主页
- `#/scanning`：报告识别中
- `#/report-analysis`：AI 识别结果
- `#/manual-entry`：手动添加指标
- `#/trends`：健康趋势分类页
- `#/biomarker-trends`：生物标识物详情页
- `#/profile-registration`：患者信息登记
- `#/register`：注册页
- `#/login`：登录页
- `#/profile`：个人主页

## 状态流

全局状态在 [src/lib/healthStore.tsx](/Users/swindcn/Documents/New%20project/src/lib/healthStore.tsx)。

当前 store 维护这些核心领域对象：

- `auth`：登录和注册草稿、当前用户
- `profiles`：本人和家属档案
- `activeProfileId`：当前激活档案
- `profileDraft`：档案编辑草稿
- `profileDraftState`：当前档案草稿处于“新建”还是“编辑”
- `reports`：报告列表
- `selectedReportId`：当前选中的报告
- `scanSession`：识别流程状态
- `manualEntryDraft`：手动录入表单状态

主要状态流：

1. 登录/注册页更新 `auth` 草稿。
2. `+ Add Member` 先进入真实的新成员草稿流，患者信息登记页保存后再创建档案。
3. 患者信息登记页在编辑模式下更新当前档案，在新建模式下创建新档案。
4. dashboard 和 trends 根据 `activeProfileId` 联动切换。
5. dashboard 的 `Recent Records` 可以直接点进单份报告分析页。
6. 手动录入页提交后会生成新的 `Report`。
7. 报告分析、趋势页、生物标识物详情页都从 `reports` 派生数据。

其中持久化边界已经拆成两层：

- 远端领域资源：`session`、`profiles`、`reports`、`preferences`
- 本地 UI 草稿：`profileDraft`、`scanSession`、`manualEntryDraft`

## API 层

API 抽象在 [src/lib/api/healthApi.ts](/Users/swindcn/Documents/New%20project/src/lib/api/healthApi.ts)。

当前支持两种模式：

- 默认本地模式：按资源拆分写入 `localStorage`
- 远端模式：当设置 `VITE_API_BASE_URL` 时，请求资源化接口；仅 UI 草稿继续保存在浏览器本地

启用后端开发模式：

1. 复制 `.env.example` 为 `.env.local`
2. 保持 `VITE_API_BASE_URL=/api`
3. 一个终端运行 `npm run dev:api`
4. 另一个终端运行 `npm run dev`

当前远端接口约定：

- `GET /auth/session`
- `POST /auth/login`
- `POST /auth/register`
- `DELETE /auth/session`
- `GET /profiles`
- `POST /profiles`
- `PATCH /profiles/:id`
- `DELETE /profiles/:id`
- `GET /reports`
- `GET /reports/:id/results`
- `POST /reports/manual`
- `GET /users/me/preferences`
- `PATCH /users/me/preferences`

接口语义：

- `session` 只表示当前登录态，不再上传登录/注册草稿
- `profiles` 是家庭成员档案资源，按单个档案更新
- `profiles` 现已支持新建和删除，删除时会同步清理该档案下的报告并回退当前选中档案
- `reports` 是报告资源，现已支持按报告读取结果明细，并接入“手动录入生成报告”
- `preferences` 只保存用户级偏好，例如当前档案和当前报告
- `profileDraft`、`scanSession`、`manualEntryDraft` 属于前端瞬时状态，不进入远端 API

本地模式兼容旧版 `vitalis-core-state-v1`，首次读取时会自动从旧整份 state 结构迁移到新的资源分片。

## 后端

后端入口在 [server/index.js](/Users/swindcn/Documents/New%20project/server/index.js)。

当前是一套无额外依赖的 Node HTTP 服务，已实现：

- session cookie 登录态
- `POST /api/auth/login`
- `POST /api/auth/register`
- `DELETE /api/auth/session`
- `GET /api/profiles`
- `POST /api/profiles`
- `PATCH /api/profiles/:id`
- `DELETE /api/profiles/:id`
- `GET /api/reports`
- `GET /api/reports/:id/results`
- `POST /api/reports/manual`
- `GET /api/users/me/preferences`
- `PATCH /api/users/me/preferences`

数据持久化方式：

- 初始种子数据在 [server/data/seed.json](/Users/swindcn/Documents/New%20project/server/data/seed.json)
- 运行态数据库会写入 `server/data/runtime/health-db.json`

默认演示账号：

- `jane.smith@medical.com`
- `password123`

## 目录结构

```text
src/
  components/
    health/
      primitives.tsx
      sections.tsx
    layout/
    mobile/
    ui/
  lib/
    api/
      healthApi.ts
    hashRouter.tsx
    healthData.ts
    healthStore.tsx
  pages/
    healthRoutes.tsx
  App.tsx
  main.tsx
  index.css
```

## 说明

- 视觉参考已按 Vitalis Core 风格统一。
- 图标仍是几何占位，后续可以替换为正式 SVG/Figma 资源。
- 当前业务数据仍以内置 mock 初始状态启动，但页面已经接入统一 store 和 API 适配层。
