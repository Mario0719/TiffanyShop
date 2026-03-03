-- 通过 RPC 创建订单，绕过 RLS 确保 admin 能成功插入
-- 调用方需为 admin（在应用层已校验）

CREATE OR REPLACE FUNCTION create_orders_from_items(
  p_conversation_id uuid,
  p_admin_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_order_id uuid;
  v_order_ids uuid[] := '{}';
  v_customer_id uuid;
BEGIN
  -- 仅 admin 可调用
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'unauthorized: admin only';
  END IF;

  -- 获取会话的 customer_id
  SELECT customer_id INTO v_customer_id FROM conversations WHERE id = p_conversation_id;
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  -- 遍历 items，为每项创建订单
  FOR v_item IN SELECT elem FROM jsonb_array_elements(p_items) AS elem
  LOOP
    INSERT INTO orders (conversation_id, customer_id, admin_id, product_id, price, status)
    VALUES (
      p_conversation_id,
      v_customer_id,
      p_admin_id,
      (v_item->>'product_id')::uuid,
      ((v_item->>'product_price')::numeric * (v_item->>'quantity')::int),
      'pending'
    )
    RETURNING id INTO v_order_id;

    v_order_ids := array_append(v_order_ids, v_order_id);

    -- 插入对应 message
    INSERT INTO messages (conversation_id, sender_id, content, order_id)
    VALUES (p_conversation_id, p_admin_id, '🧾 客服为您创建了订单', v_order_id);
  END LOOP;

  RETURN jsonb_build_object('order_ids', to_jsonb(v_order_ids));
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION create_orders_from_items(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_orders_from_items(uuid, uuid, jsonb) TO service_role;
