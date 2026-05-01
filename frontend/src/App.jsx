import { useState } from 'react'
import './App.css'
import ItemCard from './ItemCard'

function App() {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All")

  const items = [
    { name: "Wallet", location: "Library", status: "Pending" },
    { name: "Phone", location: "Cafeteria", status: "Completed" }
  ]

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "All" || item.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1 style={{ color: "red" }}>University Lost & Found</h1>

      <input 
        type="text" 
        placeholder="Search items..." 
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ padding: "8px", marginRight: "10px" }}
      />

      <select 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ padding: "8px" }}
      >
        <option>All</option>
        <option>Pending</option>
        <option>Completed</option>
      </select>

      <div style={{ marginTop: "20px" }}>
        {filteredItems.map((item, index) => (
          <ItemCard 
            key={index}
            name={item.name}
            location={item.location}
            status={item.status}
          />
        ))}
      </div>
    </div>
  )
}

export default App