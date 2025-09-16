import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

type Item = {
  id: string
  title: string
  finalPrice: number
  calories?: number
  proteinGrams?: number
  discountPct?: number
}

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${API}/recommend/top?limit=8`)
        setItems(res.data.items)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">Top Diet Deals</h1>
        {loading && <p>Loading...</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => (
            <div key={p.id} className="bg-white rounded shadow p-4">
              <div className="font-semibold">{p.title}</div>
              <div className="text-sm text-gray-600">Calories: {p.calories ?? '—'}</div>
              <div className="text-sm text-gray-600">Protein: {p.proteinGrams ?? '—'} g</div>
              <div className="mt-2">
                <span className="text-lg font-bold">${p.finalPrice.toFixed(2)}</span>
                {typeof p.discountPct === 'number' && p.discountPct > 0 && (
                  <span className="ml-2 text-green-600">-{p.discountPct}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 