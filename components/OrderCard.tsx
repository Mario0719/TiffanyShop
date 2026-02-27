"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"

type Order = {
  id: string
  price: number
  status: string
  product_id: string
  products: { title: string; cover_image: string | null } | null
}

export function OrderCard({
  orderId,
  isAdmin,
  onMarkPaid,
}: {
  orderId: string
  isAdmin: boolean
  onMarkPaid?: () => void
}) {
  const [order, setOrder] = useState<Order | null>(null)

  const fetchOrder = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, price, status, product_id, products(title, cover_image)")
      .eq("id", orderId)
      .single()
    const o = data as any
    if (o) {
      setOrder({
        ...o,
        products: Array.isArray(o.products) ? o.products[0] : o.products,
      })
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // 订阅 Realtime + 轮询兜底（确保 admin 标记已支付后两端都能即时看到）
  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        fetchOrder
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId, fetchOrder])

  // 待支付时轮询，admin 标记已支付后客户端无需刷新即可看到
  useEffect(() => {
    if (!order || order.status !== "pending") return
    const t = setInterval(fetchOrder, 4000)
    return () => clearInterval(t)
  }, [order?.status, fetchOrder])

  if (!order) return <div className="order-card loading">加载订单...</div>

  const statusText =
    order.status === "pending"
      ? "待支付"
      : order.status === "paid"
        ? "已支付"
        : "已取消"

  return (
    <div className="order-card">
      <div className="order-card-content">
        {order.products?.cover_image && (
          <img src={order.products.cover_image} alt="" className="order-card-img" />
        )}
        <div className="order-card-info">
          <p className="order-card-title">{order.products?.title || "商品"}</p>
          <p className="order-card-price">¥{order.price}</p>
          <span className={`order-card-status status-${order.status}`}>{statusText}</span>
        </div>
      </div>
      {order.status === "pending" && (
        <div className="order-card-actions">
          {isAdmin ? (
            <button type="button" className="order-card-btn" onClick={onMarkPaid}>
              标记已支付
            </button>
          ) : (
            <button type="button" className="order-card-btn btn-pay">
              去支付
            </button>
          )}
        </div>
      )}
    </div>
  )
}
