"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import "./css/common.css"
import "./css/admin.css"

export default function AdminPage() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="admin-app">

      <header className="admin-header">
        <h1>海淘后台管理</h1>
        <div className="admin-user">
          <span>管理员</span>
          <button onClick={handleLogout} className="btn-logout">
            退出
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        <button className="tab active">商品管理</button>
        <button className="tab">订单管理</button>
        <button className="tab">客服聊天</button>
      </nav>

      <main className="admin-content">
        <section className="panel active">
          <h2>商品管理</h2>

          <table className="product-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>价格</th>
                <th>状态</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>电子产品</td>
                <td>¥299 起</td>
                <td>上架</td>
              </tr>
            </tbody>
          </table>

        </section>
      </main>

    </div>
  )
}