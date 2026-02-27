-- 确保 admin 能读取 conversation_items（若使用 RLS）
-- 若 conversation_items 未启用 RLS，可跳过此文件

ALTER TABLE conversation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read conversation_items" ON conversation_items;
DROP POLICY IF EXISTS "Customer can read own conversation_items" ON conversation_items;

-- Admin 可读所有
CREATE POLICY "Admin can read conversation_items"
ON conversation_items FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 客户可读自己会话的
CREATE POLICY "Customer can read own conversation_items"
ON conversation_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_items.conversation_id AND c.customer_id = auth.uid()
  )
);

-- 客户可插入自己会话的（创建会话时写入）
CREATE POLICY "Customer can insert own conversation_items"
ON conversation_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_items.conversation_id AND c.customer_id = auth.uid()
  )
);
