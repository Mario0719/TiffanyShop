"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        router.replace("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single()

      if (profile?.role !== "admin") {
        router.replace("/shop")
        return
      }

      setIsAdmin(true)
      setLoading(false)
    }

    checkAdmin()
  }, [])

  // 正在检查
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        正在验证管理员权限...
      </div>
    )
  }

  // 不是 admin 不渲染任何东西
  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}