"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import "../css/common.css"
import "../css/login.css"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    const redirect = searchParams.get("redirect")
    router.push(redirect || "/shop")
  }

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="logo">🌏 定制海淘</div>
        <p className="tagline">连接中国好物，专属于您的代购服务</p>
      </div>

      <div className="login-card">
        <h1>欢迎回来</h1>
        <p className="subtitle">登录您的账户</p>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label>邮箱</label>
            <input
              type="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="login-footer">
          <a href="#">忘记密码？</a>
          <span className="divider">|</span>
          <a href="/register">注册新账户</a>
        </div>
      </div>

      <p className="guest-hint">
        暂无账户？<a href="/">先逛逛商品</a>
      </p>
    </div>
  )
}