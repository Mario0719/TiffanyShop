-- 在 conversations 表添加最近消息字段
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS latest_message_content text,
ADD COLUMN IF NOT EXISTS latest_message_at timestamptz;

-- 消息插入时更新会话的最近消息
CREATE OR REPLACE FUNCTION update_conversation_latest_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE conversations
  SET latest_message_content = NEW.content,
      latest_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_latest ON messages;
CREATE TRIGGER trg_messages_latest
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_latest_message();

-- 回填已有会话的最近消息
UPDATE conversations c SET
  latest_message_content = m.content,
  latest_message_at = m.created_at
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, content, created_at
  FROM messages
  ORDER BY conversation_id, created_at DESC
) m
WHERE c.id = m.conversation_id;
