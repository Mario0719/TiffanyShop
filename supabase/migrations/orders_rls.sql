-- 客户可更新自己的待支付订单（点击「去支付」）；admin 可读可更新全部
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Admin 可读、可更新所有订单
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;
CREATE POLICY "Admin can manage orders"
ON orders FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 客户可读自己作为 buyer 的订单
DROP POLICY IF EXISTS "Customer can read own orders" ON orders;
CREATE POLICY "Customer can read own orders"
ON orders FOR SELECT TO authenticated
USING (customer_id = auth.uid());

-- 客户可更新自己的待支付订单（仅 status → paid）
DROP POLICY IF EXISTS "Customer can pay own pending order" ON orders;
CREATE POLICY "Customer can pay own pending order"
ON orders FOR UPDATE TO authenticated
USING (customer_id = auth.uid() AND status = 'pending')
WITH CHECK (customer_id = auth.uid());
