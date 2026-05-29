function AdminDashboard() {
  const items = []

  const totalItems = items.length
  const pendingItems = items.filter((item) => item.status === 'pending').length
  const completedItems = items.filter((item) => item.status === 'completed').length

  return (
    <main className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <section className="admin-stats">
        <div className="admin-card">
          <h3>Total Items</h3>
          <p>{totalItems}</p>
        </div>

        <div className="admin-card">
          <h3>Pending Items</h3>
          <p>{pendingItems}</p>
        </div>

        <div className="admin-card">
          <h3>Completed Items</h3>
          <p>{completedItems}</p>
        </div>
      </section>

      <section className="admin-section">
        <h2>Register New Item</h2>

        <form className="admin-form">
          <input placeholder="Item Number / Item Code" />
          <input placeholder="Item Name" />
          <input placeholder="Category" />
          <textarea placeholder="Description" />
          <input placeholder="Location" />
          <input type="date" />
          <input type="file" />
          <select defaultValue="pending">
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <button type="button">Register</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Item Management</h2>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Item Number</th>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Location</th>
              <th>Found Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan="8">No items registered yet.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default AdminDashboard