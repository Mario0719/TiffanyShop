-- 在 conversations 表添加未读计数字段
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS customer_unread_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_unread_count int DEFAULT 0;

-- 消息插入时自动增加未读数：customer 发 → admin_unread+1，admin 发 → customer_unread+1
CREATE OR REPLACE FUNCTION update_unread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  SELECT customer_id INTO v_customer_id
  FROM conversations WHERE id = NEW.conversation_id;

  IF NEW.sender_id = v_customer_id THEN
    UPDATE conversations SET admin_unread_count = admin_unread_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations SET customer_unread_count = customer_unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_unread ON messages;
CREATE TRIGGER trg_messages_unread
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_unread_on_message();
