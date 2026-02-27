"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { OrderCard } from "@/components/OrderCard"
import { useRouter } from "next/navigation"
import "./css/common.css"
import "./css/admin.css"

type Conversation = {
  id: string
  customer_id: string
  assigned_admin_id: string | null
  status: string
  created_at: string
  admin_unread_count: number
  customer_unread_count: number
  latest_message_content: string | null
  latest_message_at: string | null
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  order_id: string | null
}

type ConvItem = {
  id: string
  product_id: string
  product_title: string
  product_price: number
  product_cover: string | null
  quantity: number
}

type Product = {
  id: string
  title: string
  description: string | null
  price_display: string | number
  cover_image: string | null
  status: string
  stock: number
}

type ProductFormData = {
  title: string
  description: string
  price_display: string
  cover_image: string
  stock: number
  status: "active" | "draft"
}

const defaultForm: ProductFormData = {
  title: "",
  description: "",
  price_display: "",
  cover_image: "",
  stock: 10,
  status: "active",
}

export default function AdminPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormData>(defaultForm)
  const [addLoading, setAddLoading] = useState(false)
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null)
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  // 客服聊天
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "chat">("products")
  const [adminUser, setAdminUser] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatItems, setChatItems] = useState<ConvItem[]>([])
  const [chatInput, setChatInput] = useState("")
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [orderRefreshVersions, setOrderRefreshVersions] = useState<Record<string, number>>({})
  const chatBottomRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("加载商品失败", error)
        return
    }

    setProducts(data ?? [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace("/shop")
  }

  const openAddModal = () => {
    setForm(defaultForm)
    setShowAddModal(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setForm({
      title: p.title,
      description: p.description ?? "",
      price_display: String(p.price_display),
      cover_image: p.cover_image ?? "",
      stock: p.stock ?? 0,
      status: p.status === "active" ? "active" : "draft",
    })
    setShowEditModal(true)
  }

  const handleAdd = async () => {
    if (!form.title.trim()) {
      showToast("请输入商品标题", "error")
      return
    }
    if (addLoading) return
    setAddLoading(true)
    const { error } = await supabase.from("products").insert([
      {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price_display: form.price_display.trim() || "¥0",
        cover_image: form.cover_image.trim() || null,
        status: form.status,
        stock: Number(form.stock) || 0,
      },
    ])
    setAddLoading(false)
    if (!error) {
      showToast("添加成功")
      setShowAddModal(false)
      loadProducts()
    } else {
      showToast("添加失败: " + error.message, "error")
    }
  }

  const handleEdit = async () => {
    if (!editingProduct || !form.title.trim()) return
    const { error } = await supabase
      .from("products")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        price_display: form.price_display.trim() || "¥0",
        cover_image: form.cover_image.trim() || null,
        status: form.status,
        stock: Number(form.stock) || 0,
      })
      .eq("id", editingProduct.id)
    if (!error) {
      showToast("修改成功")
      setShowEditModal(false)
      setEditingProduct(null)
      loadProducts()
    } else {
      showToast("修改失败: " + error.message, "error")
    }
  }

  const handleDelete = async (p: Product) => {
    setDeleteLoadingId(p.id)
    const { error } = await supabase.from("products").delete().eq("id", p.id)
    setDeleteLoadingId(null)
    if (!error) {
      showToast("删除成功")
      loadProducts()
    } else {
      showToast("删除失败: " + error.message, "error")
    }
  }

  const handleToggleStatus = async (p: Product) => {
    setToggleLoadingId(p.id)
    const newStatus = p.status === "active" ? "draft" : "active"
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", p.id)
    setToggleLoadingId(null)
    if (!error) {
      showToast(p.status === "active" ? "下架成功" : "上架成功")
      loadProducts()
    } else {
      showToast("操作失败: " + error.message, "error")
    }
  }

  // 客服聊天：获取 admin 用户
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setAdminUser(data.user)
    }
    init()
  }, [])

  // 客服聊天：加载会话列表 + 实时同步未读数（页面加载即拉取，用于 tab 角标）
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, customer_id, assigned_admin_id, status, created_at, admin_unread_count, customer_unread_count, latest_message_content, latest_message_at")
        .order("created_at", { ascending: false })
      setConversations(data ?? [])
    }
    load()

    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === payload.new.id ? { ...c, ...payload.new } : c
            )
          )
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          setConversations((prev) => [payload.new as Conversation, ...prev])
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 客服聊天：选中会话时加载消息和商品 + 订阅 conversation_items 实时更新
  useEffect(() => {
    if (!selectedConv) {
      setChatMessages([])
      setChatItems([])
      return
    }
    const loadMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", selectedConv.id)
        .order("created_at", { ascending: true })
      setChatMessages(data ?? [])
    }
    const loadItems = async () => {
      const { data } = await supabase
        .from("conversation_items")
        .select("id, product_id, product_title, product_price, product_cover, quantity")
        .eq("conversation_id", selectedConv.id)
      setChatItems(data ?? [])
    }
    loadMessages()
    loadItems()

    const channel = supabase
      .channel(`conv-items-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_items",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        () => loadItems()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConv])

  // 客服聊天：实时订阅新消息
  useEffect(() => {
    if (!selectedConv) return
    const channel = supabase
      .channel(`chat-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          setChatMessages((prev) => {
            const exists = prev.find((m) => m.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new as Message]
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConv])

  // 客服聊天：自动滚动到底部
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  // 客服聊天：分配管理员（若未分配）+ 清零 admin 未读
  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv)
    const updates: Record<string, unknown> = { admin_unread_count: 0 }
    if (!conv.assigned_admin_id && adminUser?.id) {
      updates.assigned_admin_id = adminUser.id
    }
    await supabase.from("conversations").update(updates).eq("id", conv.id)
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id
          ? { ...c, admin_unread_count: 0, assigned_admin_id: c.assigned_admin_id || adminUser?.id || null }
          : c
      )
    )
  }

  // 客服聊天：创建订单
  const handleCreateOrder = async () => {
    if (!selectedConv || !adminUser || chatItems.length === 0) return
    setCreatingOrder(true)
    const ordersToInsert = chatItems.map((item) => ({
      conversation_id: selectedConv.id,
      customer_id: selectedConv.customer_id,
      admin_id: adminUser.id,
      product_id: item.product_id,
      price: item.product_price * item.quantity,
      status: "pending",
    }))
    const { data: newOrders, error } = await supabase
      .from("orders")
      .insert(ordersToInsert)
      .select("id")
    if (!error && newOrders?.length) {
      const messagesToInsert = newOrders.map((order) => ({
        conversation_id: selectedConv.id,
        sender_id: adminUser.id,
        content: "🧾 客服为您创建了订单",
        order_id: order.id,
      }))
      await supabase.from("messages").insert(messagesToInsert)
      showToast(`已创建 ${newOrders.length} 个订单`)
    } else {
      showToast(error?.message || "创建订单失败", "error")
    }
    setCreatingOrder(false)
  }

  // 客服聊天：标记订单已支付
  const handleMarkOrderPaid = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "paid" }).eq("id", orderId)
    if (!error) {
      showToast("已标记为已支付")
      setOrderRefreshVersions((v) => ({ ...v, [orderId]: (v[orderId] ?? 0) + 1 }))
    } else {
      showToast(error.message, "error")
    }
  }

  // 客服聊天：关闭/重新打开会话
  const handleConversationStatus = async (newStatus: "open" | "closed") => {
    if (!selectedConv) return
    await supabase.from("conversations").update({ status: newStatus }).eq("id", selectedConv.id)
    setSelectedConv({ ...selectedConv, status: newStatus })
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, status: newStatus } : c))
    )
  }

  // 客服聊天：发送消息
  const handleChatSend = async () => {
    if (!chatInput.trim() || !selectedConv || !adminUser) return
    const { data } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: selectedConv.id,
          sender_id: adminUser.id,
          content: chatInput.trim(),
        },
      ])
      .select()
      .single()
    if (data) {
      setChatInput("")
    }
  }

  const ProductForm = () => (
    <div className="product-form">
      <div className="form-row">
        <label>商品标题 *</label>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="请输入商品标题"
        />
      </div>
      <div className="form-row">
        <label>商品描述</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="请输入商品描述"
          rows={3}
        />
      </div>
      <div className="form-row">
        <label>价格展示</label>
        <input
          value={form.price_display}
          onChange={(e) => setForm({ ...form, price_display: e.target.value })}
          placeholder="例如: ¥99 或 起 ¥299"
        />
      </div>
      <div className="form-row">
        <label>封面图 URL</label>
        <input
          value={form.cover_image}
          onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="form-row">
        <label>库存</label>
        <input
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })}
          min={0}
        />
      </div>
      <div className="form-row">
        <label>状态</label>
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "draft" })}
        >
          <option value="active">上架</option>
          <option value="draft">下架</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className="admin-app">
      <header className="admin-header">
        <h1>海淘后台管理</h1>
        <div className="admin-user">
          <Link href="/shop" className="btn-back-shop">回到商店</Link>
          <span>管理员</span>
          <button onClick={handleLogout} className="btn-logout">退出</button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button
          className={`tab ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          商品管理
        </button>
        <button
          className={`tab ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          订单管理
        </button>
        <button
          className={`tab ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          客服聊天
          {(conversations.reduce((s, c) => s + (c.admin_unread_count ?? 0), 0) || 0) > 0 && (
            <span className="tab-unread-badge">
              {conversations.reduce((s, c) => s + (c.admin_unread_count ?? 0), 0)}
            </span>
          )}
        </button>
      </nav>

      <main className="admin-content">
        <section className={`panel ${activeTab === "products" ? "active" : ""}`}>
          <div className="panel-header">
            <h2>商品管理</h2>
            <button onClick={openAddModal} className="btn-add">添加商品</button>
          </div>

          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>价格</th>
                  <th>库存</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">暂无商品，点击「添加商品」新增</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-name">{p.title}</div>
                        {p.description && (
                          <div className="product-desc">{p.description}</div>
                        )}
                      </td>
                      <td>{p.price_display}</td>
                      <td>{p.stock}</td>
                      <td>
                        <span className={`badge ${p.status === "active" ? "on" : "off"}`}>
                          {p.status === "active" ? "上架" : "下架"}
                        </span>
                      </td>
                      <td>
                        <div className="product-actions">
                          <button
                            className="btn-action"
                            onClick={() => openEditModal(p)}
                            disabled={toggleLoadingId === p.id || deleteLoadingId === p.id}
                          >
                            修改
                          </button>
                          <button
                            className="btn-action"
                            onClick={() => handleToggleStatus(p)}
                            disabled={toggleLoadingId === p.id || deleteLoadingId === p.id}
                          >
                            {toggleLoadingId === p.id
                              ? "处理中..."
                              : p.status === "active"
                                ? "下架"
                                : "上架"}
                          </button>
                          <button
                            className="btn-action btn-danger"
                            onClick={() => handleDelete(p)}
                            disabled={toggleLoadingId === p.id || deleteLoadingId === p.id}
                          >
                            {deleteLoadingId === p.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 订单管理 panel（占位） */}
        <section className={`panel ${activeTab === "orders" ? "active" : ""}`}>
          <h2>订单管理</h2>
          <p className="admin-placeholder">功能开发中...</p>
        </section>

        {/* 客服聊天 panel */}
        <section
          id="panel-chat"
          className={`panel ${activeTab === "chat" ? "active" : ""}`}
        >
          <div className="chat-list">
            {conversations.length === 0 ? (
              <p className="chat-empty-hint">暂无会话</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`chat-item ${selectedConv?.id === conv.id ? "active" : ""}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="chat-avatar">👤</div>
                  <div className="chat-meta">
                    <span className="chat-name">
                      客户 {conv.customer_id?.slice(0, 8)}...
                    </span>
                    <span className="chat-preview">
                      {conv.latest_message_content || "暂无消息"}
                    </span>
                    <span className="chat-time">
                      {conv.latest_message_at
                        ? new Date(conv.latest_message_at).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(conv.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {(conv.admin_unread_count ?? 0) > 0 && (
                    <span className="chat-unread-badge">{conv.admin_unread_count}</span>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="chat-window">
            {selectedConv ? (
              <>
                <div className="chat-header">
                  <div className="chat-header-left">
                    <h3>与客户对话</h3>
                    <span className={`conv-status-badge status-${selectedConv.status}`}>
                      {selectedConv.status === "open" ? "进行中" : selectedConv.status === "closed" ? "已关闭" : selectedConv.status}
                    </span>
                  </div>
                  <div className="chat-header-actions">
                    <button
                      type="button"
                      className="btn-conv-action btn-create-order"
                      onClick={handleCreateOrder}
                      disabled={chatItems.length === 0 || creatingOrder}
                    >
                      {creatingOrder ? "创建中..." : "创建订单"}
                    </button>
                    {selectedConv.status !== "closed" ? (
                      <button
                        type="button"
                        className="btn-conv-action btn-close-conv"
                        onClick={() => handleConversationStatus("closed")}
                      >
                        关闭会话
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-conv-action btn-reopen-conv"
                        onClick={() => handleConversationStatus("open")}
                      >
                        重新打开
                      </button>
                    )}
                  </div>
                </div>

                <div className="chat-messages">
                  {chatItems.length > 0 && (
                    <div className="admin-chat-order-preview">
                      <p>咨询商品：</p>
                      {chatItems.map((item) => (
                        <div key={item.id} className="admin-order-item">
                          {item.product_cover && (
                            <img src={item.product_cover} alt="" />
                          )}
                          <span>{item.product_title}</span>
                          <span>¥{item.product_price} × {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`msg ${msg.sender_id === adminUser?.id ? "user" : "agent"}`}
                    >
                      {msg.order_id ? (
                        <OrderCard
                          key={`${msg.order_id}-${orderRefreshVersions[msg.order_id] ?? 0}`}
                          orderId={msg.order_id}
                          isAdmin
                          onMarkPaid={() => handleMarkOrderPaid(msg.order_id!)}
                        />
                      ) : (
                        <span>{msg.content}</span>
                      )}
                      <span className="msg-time">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                <div className="chat-input">
                  <input
                    type="text"
                    placeholder="输入回复..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                  />
                  <button
                    type="button"
                    className="btn-send"
                    onClick={handleChatSend}
                  >
                    发送
                  </button>
                </div>
              </>
            ) : (
              <div className="chat-window-empty">
                <p>从左侧选择一个会话开始对话</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 添加商品弹窗 */}
      <div className={`product-modal ${showAddModal ? "show" : ""}`} onClick={() => setShowAddModal(false)}>
        <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="product-modal-header">
            <h3>添加商品</h3>
            <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
          </div>
          <div className="product-modal-body">
            <ProductForm />
            <div className="product-modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>取消</button>
              <button className="btn-submit" onClick={handleAdd} disabled={addLoading}>
                {addLoading ? "添加中..." : "确定添加"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 编辑商品弹窗 */}
      <div className={`product-modal ${showEditModal ? "show" : ""}`} onClick={() => setShowEditModal(false)}>
        <div className="product-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="product-modal-header">
            <h3>修改商品</h3>
            <button className="btn-close" onClick={() => setShowEditModal(false)}>×</button>
          </div>
          <div className="product-modal-body">
            <ProductForm />
            <div className="product-modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>取消</button>
              <button className="btn-submit" onClick={handleEdit}>保存</button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}