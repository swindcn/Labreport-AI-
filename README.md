# Vitalis Core Mobile Prototype

基于 React + TypeScript + Tailwind + Vite 的移动端医疗报告助手原型，当前包含：

- 前端移动端路由应用
- 资源化 API 适配层
- 本地 Node API 服务
- 腾讯云文档抽取扫描链路

当前版本：`v0.4.0`

## 项目概览

Vitalis Core 用于帮助用户完成医疗报告上传、OCR/结构化识别、结果分析、归档管理、家庭成员管理与趋势查看。

当前版本已经具备：

- 登录、注册、验证码草稿流
- 家庭成员新增、编辑、删除、切换
- 头像上传、替换、删除
- 报告图片/PDF 上传
- 手动录入报告
- 报告扫描页自动推进
- 报告分析页、归档页、源文件页联动
- 失败报告重试与批量管理
- 腾讯云 `ExtractDocMulti` 文档抽取接入
- 未保存扫描草稿与 `Save Results` / `Discard` 流程
- 报告结果人工校正与单条 biomarker 编辑
- Trends 分类页按最新记录展开查看
- Biomarker Trends 时间窗口筛选与趋势解读
- Cross-Biomarker Summary 分类组合摘要
- 多页 PDF、扫描 debug 落盘与 parser version 状态提示
- 本地 mock 扫描兜底

## **v0.4.0 更新摘要**

- 接入腾讯云真实识别后的报告保存闭环：上传扫描结果默认不入归档，只有点击 `Save Results` 后才进入 Recent Records、Reports Archive 和 Trends
- 新增 `Discard`，可直接丢弃未保存识别结果，不保留隐藏草稿
- Report Analysis 支持人工校正 biomarker，当前可编辑 code、name、category、value、unit、reference range、status
- Reports Archive 与 Trends 页做了多轮信息密度优化：文件名单行省略、状态提示收敛、按钮文本化、趋势分类卡支持默认 5 条和展开更多
- OCR 规则增强：支持多页 PDF、扫描 debug JSON、parser version 标记，以及病毒抗体类项目（如 `HAV-IgM` / `HDV-IgG` / `HEV-IgM`）的独立映射，避免被错误合并

## **今日更新（2026-04-03）**

- Biomarker Trends 进一步深化为真实趋势分析页，新增 `3M / 6M / 12M / All` 时间窗口切换
- 趋势详情页支持趋势折线、历史样本值、变化值计算，以及 `Recovered / Stable / Rising / Falling / Improving / Worsening` 等规则解读
- 新增当前分类摘要指标：`Need Attention`、`Recovering`、`Stable`、`Largest Shift`
- 新增 `Cross-Biomarker Summary`，在 Biomarker Trends 页面中针对当前分类输出一句组合解读
- 补充多日期趋势测试数据，覆盖高、低、正常波动，便于验证趋势页的时间窗口、排序和结论逻辑

## 技术栈

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Node.js HTTP Server
- 腾讯云 OCR / 文档抽取（多模态版）

## 目录结构

```text
.
├── src/
│   ├── components/
│   ├── lib/
│   │   ├── api/
│   │   ├── scan/
│   │   └── ...
│   ├── pages/
│   └── ...
├── server/
│   ├── data/
│   │   ├── seed.json
│   │   └── runtime/
│   ├── scanProviders/
│   ├── assetStore.js
│   ├── index.js
│   └── ...
├── package.json
└── README.md
```

## **环境要求**

- Node.js 20+
- npm 10+

## **安装依赖**

`npm install`

如果尚未安装腾讯云 SDK，再执行：

`npm i tencentcloud-sdk-nodejs`

## **本地环境变量**

### **前端环境变量**

创建 .env.local：

`VITE_API_BASE_URL=/api`

说明：

- 只有 VITE\_ 前缀变量会暴露给前端
- 不要把云厂商密钥写进前端 .env.local

### **后端环境变量**

建议创建 server/.env.api：

```bash
SCAN_PROVIDER=tencent
TENCENT_SECRET_ID=你的腾讯云SecretId
TENCENT_SECRET_KEY=你的腾讯云SecretKey
TENCENT_OCR_REGION=ap-guangzhou
TENCENT_OCR_CONFIG_ID=General
TENCENT_OCR_MAX_PDF_PAGES=10
DEBUG_SCAN_RESPONSE=false
SCAN_SAVE_DEBUG_JSON=false
```

说明：

- SCAN\_PROVIDER=tencent 表示扫描走腾讯云
- SCAN\_PROVIDER=mock 表示回退到本地 mock 扫描
- DEBUG\_SCAN\_RESPONSE=true 会在后端打印腾讯云原始响应，便于调试映射
- SCAN\_SAVE\_DEBUG\_JSON=true 会把原始扫描响应和归一化结果写入 `server/data/runtime/scan-debug`
- TENCENT\_SECRET\_ID / TENCENT\_SECRET\_KEY 仅供后端使用，不应提交到 Git

## **.gitignore 说明**

项目中应忽略本地 env 与运行态文件，典型规则如下：

`.env.local .env.*.local server/.env.api server/.env.* server/data/runtime/ node_modules/ dist/`

## **启动方式**

### **启动后端 API**

如果你使用 server/.env.api，现在不需要再手动 `source`。后端启动时会自动加载该文件：

```bash
cd "/Users/swindcn/Documents/New project"
npm run dev:api
```

### **启动前端开发环境**

另开一个终端：

`cd "/Users/swindcn/Documents/New project" npm run dev`

### **生产构建**

`npm run build`

### **运行测试**

`npm test`

### **预览构建结果**

`npm run preview`

## **主要路由**

项目当前使用轻量 hash router，浏览器地址格式为 #/path。

主要路由如下：

- \#/screens：路由索引页
- \#/home：扫描入口首页
- \#/dashboard：报告上传与家庭档案主页
- \#/report-upload：选择报告图片、拍照或文件
- \#/scanning：报告识别中
- \#/report-analysis：AI 识别结果
- \#/report-source：报告原始文件预览与管理
- \#/reports-archive：报告历史归档
- \#/manual-entry：手动添加指标
- \#/trends：健康趋势分类页
- \#/biomarker-trends：生物标识物详情页
- \#/profile-registration：患者信息登记
- \#/member-list：家庭成员管理
- \#/register：注册页
- \#/login：登录页
- \#/profile：个人主页

## **当前业务能力**

### **账户与登录**

- 登录
- 注册
- 验证码草稿流
- session cookie 登录态

### **成员管理**

- 新建成员
- 编辑成员
- 删除成员
- 激活成员切换
- 头像上传、替换、删除

### **报告管理**

- 上传图片报告
- 上传 PDF 报告
- 手动录入报告
- 报告源文件预览
- 替换报告源文件
- 删除报告源文件
- 收藏报告
- 导出结果
- 删除报告

### **扫描与识别**

- 上传后自动进入扫描流程
- 扫描页自动推进进度
- 腾讯云文档抽取识别
- mock 扫描兜底
- 扫描失败态
- 扫描重试

### **报告查看**

- Report Analysis 结果页
- Reports Archive 历史归档
- 按月份分组展示
- 失败报告批量管理
- 报告版本状态提示

## **状态流说明**

全局状态位于 src/lib/healthStore.tsx。

核心领域对象：

- auth：登录和注册草稿、当前用户
- profiles：本人和家属档案
- reports：报告资源
- activeProfileId：当前激活成员
- selectedReportId：当前选中报告
- profileDraft / profileDraftState：档案编辑草稿
- scanSession：扫描页进度状态
- manualEntryDraft：手动录入表单状态

主要状态流：

1. 登录或注册后，hydrate 远端资源与本地 UI 草稿
2. Member List 和 Profile Registration 共用成员创建、编辑、删除能力
3. 上传报告时，先创建报告草稿，再上传源文件、绑定来源、进入扫描流程
4. 扫描页自动推进进度，并在完成后进入分析页
5. 替换报告源文件后，当前报告重新进入待扫描状态
6. Report Analysis、Report Source、Reports Archive 共用同一份报告资源
7. 失败报告支持单个重试与批量重试/删除

持久化边界：

- 远端领域资源：session、profiles、reports、preferences、assets
- 本地 UI 草稿：profileDraft、scanSession、manualEntryDraft

## **API 层**

API 抽象位于 src/lib/api/healthApi.ts。

支持两种模式：

- 默认本地模式：写入 localStorage
- 远端模式：设置 VITE\_API\_BASE\_URL=/api 后，请求本地 Node API

启用后端开发模式：

1. 创建前端 .env.local
2. 设置 VITE\_API\_BASE\_URL=/api
3. 启动 npm run dev:api
4. 启动 npm run dev

当前远端接口：

- GET /auth/session
- POST /auth/login
- POST /auth/register
- DELETE /auth/session
- GET /profiles
- POST /profiles
- PATCH /profiles/:id
- DELETE /profiles/:id
- POST /profiles/:id/avatar
- DELETE /profiles/:id/avatar
- GET /reports
- GET /reports/:id
- POST /reports
- PATCH /reports/:id
- DELETE /reports/:id
- POST /reports/:id/files
- DELETE /reports/:id/files
- POST /reports/:id/source
- POST /reports/:id/favorite
- POST /reports/:id/scan
- POST /reports/:id/retry
- GET /reports/:id/results
- PATCH /reports/:id/results/:resultId
- POST /reports/manual
- GET /assets/:id/content
- GET /users/me/preferences
- PATCH /users/me/preferences

兼容说明：

- POST /reports/:id/complete 仍保留为旧别名
- 本地模式兼容旧版 vitalis-core-state-v1

## **后端说明**

后端入口位于 server/index.js。

当前后端已实现：

- session cookie 登录态
- profiles / reports / preferences 资源化接口
- 头像与报告源文件本地资产存储
- 资产内容访问接口
- 删除成员、报告、源文件时的资产清理
- 扫描 provider 分流
- 腾讯云文档抽取扫描
- 扫描 debug artifact 写入
- 单条 biomarker 结果 PATCH 更新

资产存储位于 server/assetStore.js。

运行态数据默认写入：

- server/data/runtime/health-db.json
- server/data/runtime/assets

初始种子数据位于：

- server/data/seed.json

## **腾讯云文档抽取接入说明**

当前扫描流程支持腾讯云 文档抽取（多模态版）。

后端逻辑：

1. 读取报告源文件
2. 将图片/PDF 转为 Base64
3. 调用腾讯云 ExtractDocMulti
4. 从结构化返回中提取：
   - 项目名称
   - 结果
   - 单位
   - 参考范围
5. 归一化为前端当前使用的 Report.results

当前结果对象结构：

`{   id: string   code: string   name: string   category: string   value: number   unit: string   referenceText: string   status: "normal" | "high" | "low" }`

注意事项：

- 当前默认使用 ConfigId=General
- 当前支持多页 PDF，默认最多扫描 `TENCENT_OCR_MAX_PDF_PAGES` 指定的页数
- 如果识别成功但没有形成结构化指标，后端会返回失败态
- 若调试字段映射，可设置 DEBUG\_SCAN\_RESPONSE=true
- 医学指标会优先按内置字典归一化，再回退到规则分类与参考范围解析

## **识别调试建议**

若扫描结果异常，建议按以下顺序排查：

1. 确认后端已加载正确的腾讯云环境变量
2. 确认 SCAN\_PROVIDER=tencent
3. 打开 DEBUG\_SCAN\_RESPONSE=true
4. 查看后端打印的 Tencent OCR raw response
5. 检查返回中是否存在：
   - Response.StructuralList
   - Groups
   - Lines
   - Key.AutoName
   - Value.AutoContent

如需离线校正真实样本，可同时打开：

- `DEBUG_SCAN_RESPONSE=true`
- `SCAN_SAVE_DEBUG_JSON=true`

这样每次扫描都会把原始响应和归一化结果写入 `server/data/runtime/scan-debug`

若识别到了文本但没有入库，通常是字段名映射需要调整。

## **测试**

当前测试覆盖：

- 扫描 mock 逻辑：src/lib/scan/mockScanService.test.ts
- Reports Archive 过滤与批量提示：src/lib/reportsArchiveUtils.test.ts
- 报告版本状态判定：src/lib/reportVersionState.test.ts
- 资产存储单元测试：server/assetStore.test.js
- 资产相关 API 集成测试：server/assetsApi.test.js
- 扫描 debug store：server/scanDebugStore.test.js
- 腾讯云结构化归一化回归测试：server/scanProviders/normalizeExtractDocMulti.test.js
- 腾讯云多页 PDF provider 测试：server/scanProviders/tencentExtractDocMulti.test.js

当前建议验证：

- npm test
- npm run build
- 真实上传 3 类样本报告
- 扫描成功态、失败态、重试态
- 未保存草稿的 Save / Discard
- Report Analysis 单条结果编辑
- Trends 分类页默认 5 条与展开更多
- Biomarker Trends 时间窗口切换与组合摘要
- 单样本 / 多样本下的趋势解读与空态

## **默认演示账号**

- jane.smith\@medical.com
- password123

## **当前已知限制**

- 腾讯云字段映射仍需根据真实报告样本持续校正
- 医疗报告分类仍以规则映射为主，尚未做更深层语义标准化
- 趋势分析页已支持基础时间窗口与规则解读，但尚未引入更复杂的统计模型、医生级解释或跨报告对照基线
