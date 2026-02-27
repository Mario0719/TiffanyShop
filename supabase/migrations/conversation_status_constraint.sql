-- 为 conversations.status 添加枚举约束（可选，确保只允许 open/closed/pending）
-- 若表中已有 status 列，先检查是否有不符合的值
-- UPDATE conversations SET status = 'open' WHERE status IS NULL OR status NOT IN ('open', 'closed', 'pending');

-- 添加 check 约束
ALTER TABLE conversations
DROP CONSTRAINT IF EXISTS conversations_status_check;

ALTER TABLE conversations
ADD CONSTRAINT conversations_status_check
CHECK (status IN ('open', 'closed', 'pending'));
