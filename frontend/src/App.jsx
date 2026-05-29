import { useDeferredValue, useEffect, useState } from 'react'
import './App.css'
import ItemCard from './ItemCard'
import StatsWidget from './StatsWidget'
import AdminDashboard from './AdminDashboard' 
const API_ENDPOINT = '/api/items/'

function App() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
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
        if (requestError.name === 'AbortError') {
          return
        }

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
  }, [deferredSearch, filter])

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <p className="eyebrow">Campus Inventory</p>
        <h1>Lost &amp; Found Item Tracker</h1>
        <p className="hero-copy">
          Search by item number, item code, name, category, description, or location.
        </p>

        <div className="controls">
          <label className="search-field">
            <span className="sr-only">Search items</span>
            <input
              type="text"
              placeholder="Try Item No. 1, LF001, wallet, keys..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="filter-field">
            <span className="sr-only">Filter by status</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>

        <div className="summary-bar">
          <span>{loading ? 'Loading items...' : `${items.length} item${items.length === 1 ? '' : 's'} found`}</span>
          <span>Item numbers are assigned automatically in upload order.</span>
        </div>
      </section>

      <section className="results-panel" aria-live="polite">
        {error ? <p className="state-message state-message--error">{error}</p> : null}

        {!error && loading ? <p className="state-message">Fetching the latest lost and found items...</p> : null}

        {!error && !loading && items.length === 0 ? (
          <p className="state-message">
            No items matched this search. Try a different item number, code, or keyword.
          </p>
        ) : null}
<StatsWidget items={items} />
<AdminDashboard /> 
        <div className="item-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  )
}

export default App
