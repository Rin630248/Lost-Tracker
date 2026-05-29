import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'
import ItemCard from './ItemCard'
import AdminDashboard from './AdminDashboard'

const API_ENDPOINT = '/api/items/'

function App() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const deferredSearch = useDeferredValue(search.trim())

  const isAdminPage = window.location.pathname === '/admin'

  useEffect(() => {
    if (isAdminPage) return

    const controller = new AbortController()

    async function loadItems() {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (filter !== 'all') {
        params.set('status', filter)
      }

      if (deferredSearch) {
        params.set('search', deferredSearch)
      }

      const requestUrl = params.toString()
        ? `${API_ENDPOINT}?${params.toString()}`
        : API_ENDPOINT

      try {
        const response = await fetch(requestUrl, { signal: controller.signal })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = await response.json()
        setItems(Array.isArray(data) ? data : [])
      } catch (requestError) {
        if (requestError.name === 'AbortError') return

        setError('Unable to load items right now. Please make sure the Django server is running.')
        setItems([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadItems()

    return () => controller.abort()
  }, [deferredSearch, filter, isAdminPage])

  if (isAdminPage) {
    return <AdminDashboard />
  }

  return (
    <main className="public-page">
      <header className="top-nav">
        <div className="nav-brand">CAMPUS RECOVERY PORTAL</div>

        <nav className="nav-links">
  <a className="nav-link active" href="/">
    Browse Items
  </a>
</nav>

        <div className="nav-icons">
          <span>🔔</span>
          <span>◎</span>
        </div>
      </header>

      <section className="browse-hero">
        <h1>Lost something on campus?</h1>
        <p>Search our official registry of found items to reclaim your property.</p>

        <div className="stitch-search-row">
          <select className="category-select">
            <option>All Categories</option>
            <option>Electronics</option>
            <option>Keys & Wallets</option>
            <option>Books & Study</option>
            <option>Clothing</option>
          </select>

          <input
            type="text"
            placeholder="Search by item name, color, or location..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button type="button" className="search-button">
            SEARCH
          </button>
        </div>
      </section>

      <section className="browse-content">
        <div className="status-tabs">
          <button
            className={filter === 'all' ? 'tab active' : 'tab'}
            onClick={() => setFilter('all')}
          >
            All Items <span>{items.length}</span>
          </button>

          <button
            className={filter === 'pending' ? 'tab active' : 'tab'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>

          <button
            className={filter === 'completed' ? 'tab active' : 'tab'}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>

          <button className="advanced-filter" type="button">
            Advanced Filters
          </button>
        </div>

        {error ? <p className="state-message state-message--error">{error}</p> : null}

        {!error && loading ? (
          <p className="state-message">Fetching the latest lost and found items...</p>
        ) : null}

        {!error && !loading && items.length === 0 ? (
          <p className="state-message">
            No items matched this search. Try a different item number, code, or keyword.
          </p>
        ) : null}

        <div className="item-grid stitch-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        <div className="pagination">
          <button>‹</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <span>...</span>
          <button>›</button>
        </div>
      </section>
    </main>
  )
}

export default App

