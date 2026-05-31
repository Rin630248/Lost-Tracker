function StatsWidget({ items = [] }) {
  const totalItems = items.length

  const pendingItems = items.filter((item) =>
    item.status?.toLowerCase() === "pending"
  ).length

  const completedItems = items.filter((item) =>
    item.status?.toLowerCase() === "completed"
  ).length

  return (
    <section className="stats-panel">
      <div className="stat-card">
        <span className="stat-label">Total Items</span>
        <strong>{totalItems}</strong>
      </div>

      <div className="stat-card">
        <span className="stat-label">Pending</span>
        <strong>{pendingItems}</strong>
      </div>

      <div className="stat-card">
        <span className="stat-label">Completed</span>
        <strong>{completedItems}</strong>
      </div>
    </section>
  )
}

export default StatsWidget