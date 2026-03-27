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
- `reports`：报告列表
- `selectedReportId`：当前选中的报告
- `scanSession`：识别流程状态
- `manualEntryDraft`：手动录入表单状态

主要状态流：

1. 登录/注册页更新 `auth` 草稿。
2. 患者信息登记页更新 `profileDraft`，保存后回写当前档案。
3. dashboard 和 trends 根据 `activeProfileId` 联动切换。
4. 手动录入页提交后会生成新的 `Report`。
5. 报告分析、趋势页、生物标识物详情页都从 `reports` 派生数据。

## API 层

API 抽象在 [src/lib/api/healthApi.ts](/Users/swindcn/Documents/New%20project/src/lib/api/healthApi.ts)。

当前支持两种模式：

- 默认本地模式：使用浏览器 `localStorage` 读写整份应用状态
- 远端模式：当设置 `VITE_API_BASE_URL` 时，改为请求远端接口

远端模式当前约定：

- `GET {VITE_API_BASE_URL}/state`
- `PUT {VITE_API_BASE_URL}/state`

这是一层过渡 API，目的是先把 store 与具体存储方式解耦。后续接真实后端时，可以把“整份状态读写”进一步拆成更细的资源接口，例如：

- `/auth/login`
- `/profiles`
- `/reports`
- `/reports/:id/results`
- `/manual-records`

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
