import { useEffect, useState } from 'react'
import './App.css'
import ItemCard from './ItemCard'
import AdminDashboard from './AdminDashboard'
import { subscribeToItemChanges } from './itemSync'

const PUBLIC_ITEMS_ENDPOINT = '/api/items/'

function normalizeItemsResponse(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [refreshVersion, setRefreshVersion] = useState(0)

  const isAdminPage =
    window.location.pathname === '/admin' || window.location.pathname === '/admin/'

  useEffect(() => {
    if (isAdminPage) {
      return undefined
    }

    return subscribeToItemChanges(() => {
      setError('')
      setLoading(true)
      setRefreshVersion((currentVersion) => currentVersion + 1)
    })
  }, [isAdminPage])

  useEffect(() => {
    if (isAdminPage) {
      return undefined
    }

    const controller = new AbortController()
    const normalizedSearch = search.trim()
    const normalizedStatus = statusFilter

    ;(async () => {
      const params = new URLSearchParams()

      if (normalizedStatus !== 'all') {
        params.set('status', normalizedStatus)
      }

      if (normalizedSearch) {
        params.set('search', normalizedSearch)
      }

      const requestUrl = params.toString()
        ? `${PUBLIC_ITEMS_ENDPOINT}?${params.toString()}`
        : PUBLIC_ITEMS_ENDPOINT

      try {
        const response = await fetch(requestUrl, {
          signal: controller.signal,
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const payload = await response.json()
        setItems(normalizeItemsResponse(payload))
      } catch (requestError) {
        if (requestError.name === 'AbortError') {
          return
        }

        setItems([])
        setError('Unable to load items right now. Please try again.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    })()

    return () => controller.abort()
  }, [search, statusFilter, isAdminPage, refreshVersion])

  function handleSearchSubmit(event) {
    event.preventDefault()
  }

  function handleSearchChange(event) {
    setLoading(true)
    setError('')
    setSearch(event.target.value)
  }

  function handleStatusFilterChange(nextStatus) {
    setLoading(true)
    setError('')
    setStatusFilter(nextStatus)
  }

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
          <a className="nav-link" href="/admin">
            Admin Dashboard
          </a>
        </nav>

        <div className="nav-icons" aria-hidden="true">
          <span>?</span>
          <span>+</span>
        </div>
      </header>

      <section className="browse-hero">
        <h1>Lost something on campus?</h1>
        <p>Search our official registry of found items to reclaim your property.</p>

        <form className="stitch-search-row" onSubmit={handleSearchSubmit}>
          <select
            className="category-select"
            defaultValue="all"
            disabled
            title="Category filtering is not connected yet."
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="keys-wallets">Keys &amp; Wallets</option>
            <option value="books-study">Books &amp; Study</option>
            <option value="clothing">Clothing</option>
          </select>

          <input
            type="text"
            placeholder="Search by Item No., Name, Category, or Location..."
            value={search}
            onChange={handleSearchChange}
          />

          <button type="submit" className="search-button">
            SEARCH
          </button>
        </form>
      </section>

      <section className="browse-content">
        <div className="status-tabs">
          <button
            type="button"
            className={statusFilter === 'all' ? 'tab active' : 'tab'}
            onClick={() => handleStatusFilterChange('all')}
          >
            All Items <span>{items.length}</span>
          </button>

          <button
            type="button"
            className={statusFilter === 'pending' ? 'tab active' : 'tab'}
            onClick={() => handleStatusFilterChange('pending')}
          >
            Pending
          </button>

          <button
            type="button"
            className={statusFilter === 'completed' ? 'tab active' : 'tab'}
            onClick={() => handleStatusFilterChange('completed')}
          >
            Completed
          </button>

          <button className="advanced-filter" type="button" disabled>
            Advanced Filters
          </button>
        </div>

        {error ? <p className="state-message state-message--error">{error}</p> : null}

        {!error && loading ? (
          <p className="state-message">Fetching the latest lost and found items...</p>
        ) : null}

        {!error && !loading && items.length === 0 ? (
          <p className="state-message">No items found.</p>
        ) : null}

        <div className="item-grid stitch-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        {!loading && items.length > 0 ? (
          <div className="pagination" aria-label="Pagination">
            <button type="button" disabled>
              {'<'}
            </button>
            <button type="button" className="active">
              1
            </button>
            <button type="button" disabled>
              {'>'}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
