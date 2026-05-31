function AdminDashboard() {
  const items = []

  const totalItems = items.length
  const pendingItems = items.filter((item) => item.status === 'pending').length

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar light-sidebar">
        <div className="sidebar-title">UAC Lost &amp; Found Portal</div>

        <nav className="sidebar-nav">
          <a className="sidebar-link active" href="/admin">Dashboard</a>
          <a className="sidebar-link" href="#">Overview</a>
          <a className="sidebar-link active-red" href="#">Inventory</a>
          <a className="sidebar-link" href="#">Claims</a>
          <a className="sidebar-link" href="#">Settings</a>
        </nav>

        <button className="sidebar-report-button red-button">+ Report Found Item</button>
      </aside>

      <section className="admin-main stitch-admin-main">
        <header className="admin-topbar stitch-topbar">
          <div></div>
          <input className="admin-search small-search" placeholder="Search records..." />
        </header>

        <section className="admin-header-row">
          <div>
            <h1>Lost-Tracker</h1>
            <p>Review and manage all items logged within the university ecosystem.</p>
          </div>

          <div className="compact-stats">
            <div className="compact-stat-card">
              <span>Total Items</span>
              <strong>{totalItems}</strong>
            </div>

            <div className="compact-stat-card">
              <span>Unclaimed</span>
              <strong>{pendingItems}</strong>
            </div>
          </div>
        </section>

        <section className="admin-two-column">
          <div className="admin-left-column">
            <section className="admin-section stitch-form-panel">
              <h2>＋ Register New Item</h2>

              <form className="stitch-admin-form">
                <label>
                  Item Name
                  <input placeholder="e.g. Blue Hydroflask" />
                </label>

                <label>
                  Category
                  <select defaultValue="">
                    <option value="" disabled>Select Category</option>
                    <option>Electronics</option>
                    <option>Keys & Wallets</option>
                    <option>Books & Study</option>
                    <option>Clothing</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  Location Found
                  <input placeholder="e.g. Science Building, Room 204" />
                </label>

                <label>
                  Date Found
                  <input type="date" />
                </label>

                <label>
                  Image Upload
                  <input type="file" />
                </label>

                <button type="button">Register Item</button>
              </form>
            </section>

            <section className="protocol-note stitch-protocol">
              <strong>Protocol Note</strong>
              <p>
                Ensure high-value items are secured immediately after registration.
                Completed items should remain visible in the system.
              </p>
            </section>
          </div>

          <section className="admin-section admin-right-column">
            <div className="table-toolbar">
              <select>
                <option>All Statuses</option>
                <option>Pending</option>
                <option>Completed</option>
              </select>

              <button>Export CSV</button>

              <input placeholder="Filter by Name or ID..." />
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Thumbnail</th>
                    <th>Name & Category</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td colSpan="6" className="empty-table">
                      No items registered yet.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}

export default AdminDashboard