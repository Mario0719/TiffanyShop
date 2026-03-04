"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { OrderCard } from "@/components/OrderCard"
import "../css/common.css"
import "../css/chat.css"

export default function ChatClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversation")

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [conversationItems, setConversationItems] = useState<any[]>([])
  const [cartItems, setCartItems] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [sendingProducts, setSendingProducts] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // ✅ 检查登录
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.replace("/shop/login?redirect=/shop/chat")
        return
      }
      setUser(data.user)
      setLoading(false)
    }
    checkUser()
  }, [router])

  // ✅ 读取商品快照
  useEffect(() => {
    if (!conversationId) return

    const fetchItems = async () => {
      const { data } = await supabase
        .from("conversation_items")
        .select("*")
        .eq("conversation_id", conversationId)

      setConversationItems(data || [])
    }

    fetchItems()
  }, [conversationId])

  // ✅ 读取购物车（用于「发送商品」）
  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      const { data } = await supabase
        .from("cart_items")
        .select(`
          id, product_id, quantity,
          products(id, title, price_display, cover_image)
        `)
        .eq("user_id", user.id)
      const items = (data ?? []).map((item: any) => ({
        ...item,
        products: Array.isArray(item.products) ? item.products[0] : item.products,
      }))
      setCartItems(items)
    }
    fetch()
  }, [user])

  // ✅ 读取消息
  useEffect(() => {
    if (!conversationId) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      setMessages(data || [])
    }

    fetchMessages()
  }, [conversationId])

  // ✅ 打开会话时清零 customer 未读
  useEffect(() => {
    if (!conversationId) return
    supabase
      .from("conversations")
      .update({ customer_unread_count: 0 })
      .eq("id", conversationId)
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel("chat-room")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  // ✅ 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ✅ 发送商品快照给客服（客户主动发送，admin 可见）
  const handleSendProducts = async () => {
    if (!user || cartItems.length === 0) return
    setSendingProducts(true)
    const items = cartItems.map((item: any) => ({
      conversation_id: "", // 下面会设置
      product_id: item.product_id,
      quantity: item.quantity,
      product_title: item.products?.title ?? "",
      product_price:
        typeof item.products?.price_display === "number"
          ? item.products.price_display
          : parseFloat(String(item.products?.price_display || "0").replace(/[^\d.]/g, "")) || 0,
      product_cover: item.products?.cover_image ?? null,
    }))

    if (!conversationId) {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert([{ customer_id: user.id, status: "open" }])
        .select()
        .single()
      if (convErr || !conv) {
        setSendingProducts(false)
        return
      }
      const toInsert = items.map((i) => ({ ...i, conversation_id: conv.id }))
      await supabase.from("conversation_items").insert(toInsert)
      await supabase.from("messages").insert([
        { conversation_id: conv.id, sender_id: user.id, content: "📦 我发送了商品咨询，想了解详情" },
      ])
      router.replace(`/shop/chat?conversation=${conv.id}`)
    } else {
      await supabase.from("conversation_items").delete().eq("conversation_id", conversationId)
      const toInsert = items.map((i) => ({ ...i, conversation_id: conversationId }))
      await supabase.from("conversation_items").insert(toInsert)
      await supabase.from("messages").insert([
        {
          conversation_id: conversationId,
          sender_id: user.id,
          content: `📦 我发送了 ${items.length} 个商品，想咨询一下`,
        },
      ])
      const { data } = await supabase
        .from("conversation_items")
        .select("*")
        .eq("conversation_id", conversationId)
      setConversationItems(data || [])
    }
    setSendingProducts(false)
  }

  // ✅ 发送消息
  const handleSend = async () => {
    if (!input.trim() || !conversationId) return

    const { data } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: user.id,
          content: input.trim(),
        },
      ])
      .select()
      .single()

    if (data) {
      setInput("")
    }
  }

  if (loading || !user) {
    return (
      <div className="chat-page center">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="chat-page">
      <header className="chat-header">
        <Link href="/shop" className="back-btn">
          ←
        </Link>
        <div className="chat-title">
          <h1>定制代购客服</h1>
          <span className="status online">在线</span>
        </div>
      </header>

      <div className="chat-messages">
        {/* ✅ 商品展示 */}
        {conversationItems.length > 0 && (
          <div className="chat-order-preview">
            <p className="order-title">本次咨询商品：</p>
            {conversationItems.map((item) => (
              <div key={item.id} className="order-item">
                {item.product_cover && <img src={item.product_cover} alt="" />}
                <div className="order-info">
                  <p className="title">{item.product_title}</p>
                  <p className="price">
                    ¥{item.product_price} × {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 系统提示 */}
        <div className="message system">
          <p>欢迎！请描述您想要代购的商品或发送链接。</p>
        </div>

        {/* 消息列表 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.sender_id === user.id ? "user" : "agent"}`}
          >
            <div className="bubble">
              {msg.order_id ? (
                <OrderCard orderId={msg.order_id} isAdmin={false} />
              ) : (
                <p>{msg.content}</p>
              )}
              <span className="time">
                {new Date(msg.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        {cartItems.length > 0 && (
          <button
            type="button"
            className="btn-send-products"
            onClick={handleSendProducts}
            disabled={sendingProducts}
          >
            {sendingProducts ? "发送中..." : `📦 发送当前商品给客服 (${cartItems.length} 件)`}
          </button>
        )}
        <div className="input-wrapper">
          <input
            type="text"
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button type="button" className="send-btn" onClick={handleSend}>
            发送
          </button>
        </div>
        <p className="quick-actions">快捷：代购咨询 · 询价 · 订单查询</p>
      </div>
    </div>
  )
}

