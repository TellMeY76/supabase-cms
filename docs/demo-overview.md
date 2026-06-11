# Supabase 与 CNB + EdgeOne 部署说明

这份文档只说明两件事：

- Supabase 如何连接和初始化。
- 项目如何通过 CNB 构建并部署到 EdgeOne Pages。

## 1. Supabase 连接流程

### 1.1 创建 Supabase 项目

在 Supabase 控制台创建一个新项目。

创建完成后，进入项目设置，复制：

- Project URL
- Publishable key 或 Anon key
- Service role key

### 1.2 配置本地环境变量

复制环境变量示例文件：

```bash
cp apps/site/.env.example apps/site/.env.local
```

填写 Supabase 相关变量：

```bash
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 Supabase Publishable key
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase Anon key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase Service role key
```

说明：

- `NEXT_PUBLIC_SUPABASE_URL` 必填。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 至少填一个。
- `SUPABASE_SERVICE_ROLE_KEY` 只在服务端使用，后台创建/删除用户需要它。
- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 暴露到前台代码中。

### 1.3 初始化数据库

打开 Supabase SQL Editor，执行：

```text
supabase/schema.sql
```

这个 SQL 会创建：

- 产品表。
- 分类表。
- 文章表。
- 页面表。
- 媒体表。
- 询盘表。
- 站点配置表。
- 后台用户资料表。
- RLS 权限策略。
- Supabase Storage 的 `media` bucket。

如果是旧数据库升级，还需要执行：

```text
supabase/migrations/20260529_products_admin_fields.sql
supabase/migrations/20260530_inquiries_unified_inbox.sql
```

### 1.4 创建第一个后台管理员

先在 Supabase Authentication 里创建一个用户。

然后在 SQL Editor 执行：

```sql
update public.profiles
set role = 'owner'
where email = '你的管理员邮箱';
```

之后就可以用这个账号登录：

```text
/admin/login
```

### 1.5 本地验证连接

安装依赖：

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
```

启动项目：

```bash
pnpm --filter @global-trade/site dev
```

访问：

```text
http://localhost:3000/admin/login
```

如果能登录后台，并且 Products、Posts、Settings 页面能正常读取数据，说明 Supabase 连接正常。

## 2. EdgeOne Pages 环境变量

部署到 EdgeOne Pages 后，也需要在 EdgeOne 项目中配置同样的运行时环境变量。

必填：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

媒体上传当前使用 Supabase Storage：

```bash
MEDIA_UPLOAD_PROVIDER=supabase
SUPABASE_MEDIA_BUCKET=media
```

如果暂时没有正式域名，`NEXT_PUBLIC_SITE_URL` 可以先填写 EdgeOne 分配的预览域名。

例如：

```bash
NEXT_PUBLIC_SITE_URL=https://你的项目.edgeone.cool
```

## 3. CNB + EdgeOne 部署流程

### 3.1 部署方式

当前项目使用：

```text
CNB push 触发构建
        ↓
安装 pnpm 和依赖
        ↓
执行 typecheck
        ↓
构建 Next.js
        ↓
调用 EdgeOne CLI
        ↓
部署到 EdgeOne Pages
```

配置文件在：

```text
.cnb.yml
apps/site/edgeone.json
```

### 3.2 CNB 需要配置的变量

在 CNB 项目中配置：

```bash
EDGEONE_API_TOKEN=
EDGEONE_PROJECT_NAME=edgeone-supabase-cms
```

说明：

- `EDGEONE_API_TOKEN` 必填，用于让 CNB 调用 EdgeOne Pages 部署。
- `EDGEONE_PROJECT_NAME` 可选，不填时默认使用 `edgeone-supabase-cms`。
- 不要把 EdgeOne token 写进代码仓库。

### 3.3 当前 CNB 构建命令

`.cnb.yml` 中的 Build 阶段会执行：

```bash
node -v
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm -v
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm --filter @global-trade/site build
```

这里的关键点是：

- 必须启用 Corepack。
- 必须激活 pnpm。
- 不要直接使用 npm 构建，否则会出现 `pnpm: not found`。

### 3.4 当前 EdgeOne 部署命令

`.cnb.yml` 中的部署阶段会执行：

```bash
cd apps/site && PAGES_SOURCE=skills npx edgeone@latest pages deploy -n "${EDGEONE_PROJECT_NAME:-edgeone-supabase-cms}" -t "$EDGEONE_API_TOKEN"
```

说明：

- 命令在 `apps/site` 目录下执行。
- `-n` 指定 EdgeOne Pages 项目名。
- `-t` 使用 CNB 中配置的 EdgeOne API token。
- `PAGES_SOURCE=skills` 是当前 EdgeOne CLI 部署上下文标识。

### 3.5 EdgeOne 构建配置

`apps/site/edgeone.json` 当前配置：

```json
{
  "installCommand": "corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile",
  "buildCommand": "rm -rf .next && pnpm --filter @global-trade/site build && rm -rf .next/cache",
  "outputDirectory": ".next",
  "nodeVersion": "20.18.0"
}
```

重点：

- `outputDirectory` 是 `.next`。
- 这是 Next.js full-stack 应用，不是纯静态站点。
- 构建后删除 `.next/cache`，避免上传 webpack cache 导致 EdgeOne 单文件大小超限。

## 4. 部署后检查

部署成功后，依次检查：

```text
/
/products
/news
/contact
/admin/login
/api/inquiries
```

如果 `/admin/login` 或 `/admin` 报错，优先检查 EdgeOne Pages 环境变量：

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

如果页面显示 EdgeOne 404，优先检查：

- CNB 是否在 `apps/site` 下执行 EdgeOne 部署。
- `apps/site/edgeone.json` 的 `outputDirectory` 是否是 `.next`。
- 构建产物是否被正确上传。
- 是否误按纯静态站点部署。

如果构建日志出现 `pnpm: not found`，检查 `.cnb.yml` 是否包含：

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

如果构建日志出现单文件超过大小限制，检查是否删除了：

```bash
.next/cache
```

## 5. 最小上线清单

上线前确认：

- Supabase schema 已执行。
- 第一个后台用户已经设置为 `owner`。
- EdgeOne Pages 已配置 Supabase 环境变量。
- CNB 已配置 `EDGEONE_API_TOKEN`。
- CNB 构建能通过 typecheck。
- EdgeOne 部署成功。
- `/admin/login` 能登录。
- 前台页面能读取 Supabase 数据。
