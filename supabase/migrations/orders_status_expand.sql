-- 扩展 orders.status 枚举值
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')
);
