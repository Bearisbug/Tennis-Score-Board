# 网球比赛管理系统

## 简介

这是一个基于 Next.js 与 Supabase 的网球比赛管理系统。项目支持：

- **创建比赛**：录入选手、赛制、比赛日期等信息，并初始化比分状态。
- **比赛列表筛选**：按比赛状态（未进行、已完成）及日期范围筛选比赛。
- **实时记分**：支持比赛过程中加分和退分，并实时更新数据库中的比分状态。

## 技术栈

- **前端**：![Static Badge](https://img.shields.io/badge/NextJS-blue?style=social&logo=nextdotjs&logoColor=%23000000)  ![Static Badge](https://img.shields.io/badge/Framer-blue?style=social&logo=framer&logoColor=%230055FF)  ![Static Badge](https://img.shields.io/badge/TypeScript-blue?style=social&logo=typescript&logoColor=%233178C6)
- **后端**：![Static Badge](https://img.shields.io/badge/Supabase-blue?style=social&logo=supabase&logoColor=%233FCF8E)
- **UI 组件**：![Static Badge](https://img.shields.io/badge/shadcn/ui-blue?style=social&logo=shadcnui&logoColor=%23000000)

## 功能说明

1. **创建比赛**
   在添加比赛页面，通过对话框录入比赛信息（选手、日期、赛制等），并初始化比分状态（包含局、盘及当前游戏分数）。比赛信息将持久化存储到 Supabase 的 `matches` 表中。
2. **比赛列表与筛选**
   比赛列表页面实时从 Supabase 获取比赛数据，根据用户选择的状态和日期范围进行筛选，并支持分页展示。
3. **比赛记分**
   在比赛详情页，点击加分或退分按钮时，将更新前端状态后同步更新到 Supabase 数据库，实现比分的实时持久化。

## 环境配置

本示例中 Supabase 的 URL 与 Anon Key 已直接写入代码文件 `lib/supabaseClient.ts` 中（不推荐在生产环境中如此操作）。请根据自己的 Supabase 项目修改以下文件中的配置：
```ts
// lib/supabaseClient.ts
const supabaseUrl = "https://xxxxxxxx.supabase.co"
const supabaseAnonKey = "eyJhb...xxxxxxxxxx"
```
数据表建立
```SQL
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),

  -- 基础信息
  player1 text not null,
  player2 text not null,
  match_date date not null,
  status text not null default 'upcoming',   -- "upcoming" | "completed"
  use_ad boolean not null default true,      -- 是否使用占先
  format text not null default 'best-of-3',  -- 赛制
  created_at timestamp with time zone default now(),

  -- 用于存储比分的字段，这里用 JSON（PostgreSQL 的 jsonb）
  score_state jsonb
);

```
## 安装与运行

1. **安装依赖**
   
   ```bash
   npm install
   ```
   
   或
   
   ```bash
   yarn install
   ```
2. **运行开发服务器**
   
   ```bash
   npm run dev
   ```
   
   或
   
   ```bash
   yarn dev
   ```
   
   然后访问 [http://localhost:3000](http://localhost:3000/)

## 部署

本项目支持部署到 Vercel 或其他支持 Next.js 的平台。请根据部署平台的要求配置环境变量与安全策略。

## 注意事项

* 请勿在生产环境中将 Supabase 的 key 直接写入代码，建议使用环境变量保护敏感信息。
* 如果需要更复杂的比分逻辑（如抢七局等），可根据项目需求进一步完善记分逻辑。

