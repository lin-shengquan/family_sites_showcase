# 数据库投票配置

1. 在 Supabase 新建项目。
2. 打开 SQL Editor，执行 `supabase-setup.sql`。
3. 把 `supabase-config.js` 里的 `supabaseUrl` 和 `supabaseAnonKey` 改成你自己的。
4. 重新部署到 GitHub Pages。

说明：
- 每位访问者靠浏览器里的匿名 `voter_id` 识别。
- 每人最多 3 票。
- 每个作品每人只能投 1 次。
