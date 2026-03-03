"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import "../css/common.css"
import "../css/login.css"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    const redirect = searchParams.get("redirect")
    router.push(redirect || "/shop")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")

    if (!email || !password) {
      setMessage("请填写邮箱和密码")
      return
    }

    if (password.length < 6) {
      setMessage("密码至少需要 6 位")
      return
    }

    setLoading(true)

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/shop/login?from=email_confirm`
        : undefined

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage("注册成功，请前往邮箱点击链接完成验证，然后再登录。")
    setMode("login")
  }

  const onSubmit = mode === "login" ? handleLogin : handleRegister

  return (
    <div className="login-page">
      <div className="login-header">
        <div className="logo">🌏 定制海淘</div>
        <p className="tagline">连接中国好物，专属于您的代购服务</p>
      </div>

      <div className="login-card">
        <h1>{mode === "login" ? "欢迎回来" : "创建新账户"}</h1>
        <p className="subtitle">
          {mode === "login" ? "登录您的账户" : "注册后请到邮箱完成验证"}
        </p>

        <form className="login-form" onSubmit={onSubmit}>
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

          {message && <p className="form-message">{message}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? mode === "login"
                ? "登录中..."
                : "注册中..."
              : mode === "login"
                ? "登录"
                : "注册"}
          </button>
        </form>

        <div className="login-footer">
          <a href="#">忘记密码？</a>
          <span className="divider">|</span>
          {mode === "login" ? (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMessage("")
                setMode("register")
              }}
            >
              注册新账户
            </button>
          ) : (
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setMessage("")
                setMode("login")
              }}
            >
              已有账户？去登录
            </button>
          )}
        </div>
      </div>

      <p className="guest-hint">
        暂无账户？<a href="/">先逛逛商品</a>
      </p>
    </div>
  )
}