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
  const [paying, setPaying] = useState(false)

  const handlePay = async () => {
    setPaying(true)
    const { error } = await supabase.from("orders").update({ status: "paid" }).eq("id", orderId)
    setPaying(false)
    if (!error) fetchOrder()
  }

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

  // Realtime 订阅（若已启用 orders 表）
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
    return () => supabase.removeChannel(channel)
  }, [orderId, fetchOrder])

  // 待支付时轮询兜底（Realtime 未启用时 admin 也能看到客户支付）
  useEffect(() => {
    if (!order || order.status !== "pending") return
    const t = setInterval(fetchOrder, 3000)
    return () => clearInterval(t)
  }, [order?.status, fetchOrder])

  if (!order) return <div className="order-card loading">加载订单...</div>

  const statusLabels: Record<string, string> = {
    pending: "待支付",
    paid: "已支付",
    processing: "采购中",
    shipped: "已发货",
    delivered: "已签收",
    cancelled: "已取消",
    refunded: "已退款",
  }
  const statusText = statusLabels[order.status] ?? order.status

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
            <button
              type="button"
              className="order-card-btn btn-pay"
              onClick={handlePay}
              disabled={paying}
            >
              {paying ? "支付中..." : "去支付"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
