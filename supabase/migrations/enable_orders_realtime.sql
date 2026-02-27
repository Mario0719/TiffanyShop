-- 启用 orders 表的 Realtime，标记已支付后两端聊天可即时同步
alter publication supabase_realtime add table orders;
