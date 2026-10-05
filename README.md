# 习惯打卡

一个手机优先、支持离线使用和跨设备同步的习惯打卡 PWA。iPhone 可以添加到主屏幕，电脑可以安装为 Chrome/Edge 桌面应用。

## 本地运行

```bash
npm install
npm run dev
```

未配置 Supabase 时，应用会自动进入本机模式，便于直接检查和体验。配置后会启用邮箱登录、云端保存和自动同步。

## Supabase 配置

1. 在 Supabase 创建免费项目。
2. 打开 SQL Editor，执行 `supabase/schema.sql`。
3. 在 Authentication 的 URL Configuration 中加入 GitHub Pages 地址。
4. 复制 `.env.example` 为 `.env.local`，填写项目 URL 和公开 anon key。

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

前端只会使用公开 anon key。所有数据表均启用 RLS，用户只能访问自己的习惯和打卡记录。

## 测试

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## GitHub Pages 发布

1. 创建公有仓库 `habit-tracker` 并推送 `main` 分支。
2. 在仓库 Settings > Pages 中将 Source 设为 GitHub Actions。
3. 在仓库 Settings > Secrets and variables > Actions 中配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
4. 推送后，工作流会运行测试、构建并发布 `dist`。

发布完成后，在 iPhone Safari 打开 Pages 地址，通过分享菜单选择“添加到主屏幕”。电脑端可在 Chrome 或 Edge 地址栏点击安装图标。
