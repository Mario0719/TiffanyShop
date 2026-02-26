"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import "./css/common.css"
import "./css/main.css"

export default function ShopPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }
    checkUser()
  }, [])

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">🌏 定制海淘</Link>
          <nav className="nav">
            <a href="#products">精选商品</a>
            <a href="#custom">定制代购</a>

            {user ? (
              <Link href="/profile" className="nav-login">我的</Link>
            ) : (
              <Link href="/login" className="nav-login">登录</Link>
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
            <article className="product-card">
              <div className="product-img">📱</div>
              <div className="product-info">
                <h3>电子产品</h3>
                <p>手机、配件、智能设备</p>
                <span className="price">起 ¥299</span>
              </div>
            </article>

            <article className="product-card">
              <div className="product-img">👕</div>
              <div className="product-info">
                <h3>服饰鞋包</h3>
                <p>淘宝/拼多多热门款式</p>
                <span className="price">起 ¥99</span>
              </div>
            </article>
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

            <Link href="/chat" className="btn-primary btn-block">
              点击开始定制代购
            </Link>
          </div>
        </section>

      </main>

      {/* IM 浮动 */}
      <Link href="/chat" className="im-fab">
        💬 在线
      </Link>
    </div>
  )
}