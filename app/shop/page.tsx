"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import "./css/common.css"
import "./css/main.css"

type Product = {
  id: string
  title: string
  description: string | null
  price_display: string | number
  cover_image: string | null
  status: string
}

type CartItem = {
  id: string
  product_id: string
  quantity: number
  products: {
    id: string
    title: string
    price_display: string | number
    cover_image: string | null
  } | null
}

export default function ShopPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [addingProductId, setAddingProductId] = useState<string | null>(null)

  const loadCart = async () => {
    if (!user) {
      setCartItems([])
      return
    }
    const { data } = await supabase
      .from("cart_items")
      .select(`
        id,
        product_id,
        quantity,
        products (
          id,
          title,
          price_display,
          cover_image
        )
      `)
      .eq("user_id", user.id)
    const items = (data ?? []).map((item: any) => ({
      ...item,
      products: Array.isArray(item.products) ? item.products[0] ?? null : item.products,
    })) as CartItem[]
    setCartItems(items)
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single()
        setRole(profile?.role ?? "customer")
      } else {
        setRole(null)
      }
    }
    checkUser()

    const loadProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, description, price_display, cover_image, status")
        .eq("status", "active")
      setProducts(data ?? [])
    }
    loadProducts()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUser()
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    loadCart()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    setCartItems([])
    setShowCart(false)
  }

  const handleChatClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault()
      router.push("/shop/login?redirect=/shop/chat")
    }
  }

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      router.push("/shop/login?redirect=/shop")
      return
    }
    setAddingProductId(productId)
    const { error } = await supabase.rpc("add_to_cart", {
      p_user_id: user.id,
      p_product_id: productId,
      p_quantity: 1,
    })
    if (!error) loadCart()
    setAddingProductId(null)
  }

  const handleUpdateCartQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return
    await supabase.from("cart_items").update({ quantity }).eq("id", cartItemId)
    loadCart()
  }

  const handleRemoveFromCart = async (cartItemId: string) => {
    await supabase.from("cart_items").delete().eq("id", cartItemId)
    loadCart()
  }

  const cartTotalCount = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  const parsePrice = (v: string | number): number => {
    if (typeof v === "number") return v
    const m = String(v).match(/[\d.]+/)
    return m ? parseFloat(m[0]) : 0
  }

  const cartSubtotals = cartItems.map((item) => ({
    unitPrice: parsePrice(item.products?.price_display ?? 0),
    quantity: item.quantity,
    subtotal: parsePrice(item.products?.price_display ?? 0) * item.quantity,
    priceDisplay: item.products?.price_display ?? "¥0",
  }))
  const cartTotal = cartSubtotals.reduce((sum, s) => sum + s.subtotal, 0)

  const handleCheckoutToChat = async () => {
    if (!user) return
    if (cartItems.length === 0) return
  
    // 1️⃣ 创建 conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert([
        {
          customer_id: user.id,
          status: "open",
        },
      ])
      .select()
      .single()
  
    if (convError || !conversation) {
      console.error("创建会话失败", convError)
      return
    }
  
    // 2️⃣ 把购物车商品写入 conversation_items（这里就是“快照”）
    const items = cartItems.map((item) => ({
      conversation_id: conversation.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product_title: item.products?.title ?? "",
      product_price:
        typeof item.products?.price_display === "number"
          ? item.products.price_display
          : parseFloat(
              String(item.products?.price_display).replace(/[^\d.]/g, "")
            ) || 0,
      product_cover: item.products?.cover_image ?? null,
    }))
  
    const { error: itemError } = await supabase
      .from("conversation_items")
      .insert(items)
  
    if (itemError) {
      console.error("写入会话商品失败", itemError)
      return
    }
  
    // 3️⃣ 清空购物车
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
  
    setCartItems([])
    setShowCart(false)
  
    // 4️⃣ 跳转到聊天页面
    router.push(`/shop/chat?conversation=${conversation.id}`)
  }

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <Link href="/shop" className="logo">🌏 定制海淘</Link>
          <nav className="nav">
            <a href="#products">精选商品</a>
            <a href="#custom">定制代购</a>

            {user ? (
              <div className="nav-user">
                <button
                  type="button"
                  className="nav-cart-btn"
                  onClick={() => setShowCart(true)}
                  title="购物车"
                >
                  🛒 购物车
                  {cartTotalCount > 0 && (
                    <span className="cart-badge">{cartTotalCount}</span>
                  )}
                </button>
                <span className="nav-role">
                  {role === "admin" ? "管理员" : "普通用户"}
                </span>
                {role === "admin" && (
                  <Link href="/admin" className="nav-admin">进入管理后台</Link>
                )}
                <button type="button" className="nav-logout" onClick={handleLogout}>
                  退出登录
                </button>
              </div>
            ) : (
              <Link href="/shop/login" className="nav-login">登录</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main">

        {/* Hero */}
        <section className="hero">
          <div className="hero-content">
            <h1>专属于您的中国好物代购</h1>
            <p>告诉我们您想要的，我们帮您从中国采购、验货、发货</p>
            <a href="#custom" className="btn-cta">开始定制代购</a>
          </div>
        </section>

        {/* Products */}
        <section className="section" id="products">
          <h2 className="section-title">精选商品</h2>

          <div className="product-grid">
            {products.length === 0 ? (
              <p className="product-empty">暂无上架商品</p>
            ) : (
              products.map((p) => (
                <article key={p.id} className="product-card">
                  <div className="product-img">
                    {p.cover_image ? (
                      <img src={p.cover_image} alt={p.title} />
                    ) : (
                      <span>🛍️</span>
                    )}
                  </div>
                  <div className="product-info">
                    <h3>{p.title}</h3>
                    <p>{p.description || ""}</p>
                    <span className="price">{p.price_display}</span>
                    <button
                      type="button"
                      className="btn-add-cart"
                      onClick={() => handleAddToCart(p.id)}
                      disabled={addingProductId === p.id}
                    >
                      {addingProductId === p.id ? "添加中..." : "加入购物车"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Custom */}
        <section className="section section-alt" id="custom">
          <h2 className="section-title">定制化代购</h2>

          <div className="custom-card">
            <div className="custom-steps">
              <div className="step">
                <span className="step-num">1</span>
                <p>描述您想要的商品或发送链接</p>
              </div>
              <div className="step">
                <span className="step-num">2</span>
                <p>我们帮您询价、核实商品信息</p>
              </div>
              <div className="step">
                <span className="step-num">3</span>
                <p>确认后签约付款，我们代购发货</p>
              </div>
            </div>

            {user ? (
              <Link href="/shop/chat" className="btn-primary btn-block">
                点击开始定制代购
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={handleChatClick}
              >
                点击开始定制代购
              </button>
            )}
          </div>
        </section>

      </main>

      {/* 购物车悬浮窗 */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h3>购物车</h3>
              <button type="button" className="cart-close" onClick={() => setShowCart(false)}>
                ×
              </button>
            </div>
            <div className="cart-body">
              {cartItems.length === 0 ? (
                <p className="cart-empty">购物车是空的</p>
              ) : (
                <ul className="cart-list">
                  {cartItems.map((item, idx) => (
                    <li key={item.id} className="cart-item">
                      <div className="cart-item-img">
                        {item.products?.cover_image ? (
                          <img src={item.products.cover_image} alt="" />
                        ) : (
                          <span>🛍️</span>
                        )}
                      </div>
                      <div className="cart-item-info">
                        <div className="cart-item-title">{item.products?.title}</div>
                        <div className="cart-item-price-row">
                          <span className="cart-item-price">价格：{item.products?.price_display}</span>
                          <span className="cart-item-subtotal">小计：¥{cartSubtotals[idx]?.subtotal.toFixed(0)}</span>
                        </div>
                        <div className="cart-item-actions">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity - 1)}
                          >
                            −
                          </button>
                          <span className="cart-qty">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="cart-remove"
                            onClick={() => handleRemoveFromCart(item.id)}
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total-row">
                  <span>总计</span>
                  <span className="cart-total-amount">¥{cartTotal.toFixed(0)}</span>
                </div>

                <button
                type="button"
                className="cart-checkout-btn"
                onClick={handleCheckoutToChat}
                >
                带着购物车的商品去沟通
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IM 浮动 */}
      {user ? (
        <Link href="/shop/chat" className="im-fab">
          💬 在线
        </Link>
      ) : (
        <button
          type="button"
          className="im-fab im-fab-btn"
          onClick={handleChatClick}
        >
          💬 在线
        </button>
      )}
    </div>
  )
}