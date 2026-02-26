'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [price_display, setPrice_display] = useState('')
  const [stock, setStock] = useState('')

  // 检查是否 admin
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')
        return
      }

      setUser(user)
      loadProducts()
    }

    checkUser()
  }, [])

  const loadProducts = async () => {
    const { data } = await supabase.from('products').select('*')
    if (data) setProducts(data)
  }

  const addProduct = async () => {
    if (!title || !price_display) return

    await supabase.from('products').insert([
      {
        title: title,
        price_display: Number(price_display),
        stock: Number(stock),
      },
    ])

    setTitle('')
    setPrice_display('')
    setStock('')
    loadProducts()
  }

  const deleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id)
    loadProducts()
  }

  if (!user) return <div style={{ padding: 40 }}>Checking admin...</div>

  return (
    <div style={{ padding: 40, maxWidth: 600 }}>
      <h1>Admin 产品管理</h1>

      <hr />

      <h2>新增产品</h2>

      <input
        placeholder="产品标题"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      />
      <br />
      <br />

      <input
        placeholder="价格"
        value={price_display}
        onChange={(e) => setPrice_display(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      />
      <br />
      <br />

      <input
        placeholder="库存"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      />
      <br />
      <br />

      <button onClick={addProduct} style={{ padding: 10 }}>
        新增
      </button>

      <hr />

      <h2>产品列表</h2>

      {products.map((p) => (
        <div
          key={p.id}
          style={{
            border: '1px solid #ccc',
            padding: 12,
            marginBottom: 12,
            borderRadius: 6,
          }}
        >
          <div><strong>标题:</strong> {p.title}</div>
          <div><strong>价格:</strong> {p.price_display}</div>
          <div><strong>库存:</strong> {p.stock}</div>

          <br />

          <button
            onClick={() => deleteProduct(p.id)}
            style={{ padding: 6 }}
          >
            删除
          </button>
        </div>
      ))}
    </div>
  )
}