-- 在 cart_items 上添加唯一约束（若尚未存在）
-- 如果你的表已经有 unique(user_id, product_id)，可跳过此步
-- ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_product_unique UNIQUE (user_id, product_id);

-- 原子「加入购物车」函数：不存在则插入，存在则 quantity + 1
-- 前置条件：cart_items 需有 unique(user_id, product_id)
CREATE OR REPLACE FUNCTION public.add_to_cart(p_user_id uuid, p_product_id uuid, p_quantity int DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  INSERT INTO cart_items (user_id, product_id, quantity)
  VALUES (p_user_id, p_product_id, p_quantity)
  ON CONFLICT (user_id, product_id)
  DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.add_to_cart(uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_to_cart(uuid, uuid, int) TO anon;

-- 刷新 PostgREST schema 缓存，使新函数立即可用
NOTIFY pgrst, 'reload schema';
