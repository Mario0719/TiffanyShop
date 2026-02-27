-- 重建 orders 表（如需保留数据请先备份）
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  admin_id uuid,
  product_id uuid NOT NULL REFERENCES products(id),
  price numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
