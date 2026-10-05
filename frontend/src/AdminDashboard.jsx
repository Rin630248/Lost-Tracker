import { useEffect, useState } from 'react'
import { notifyItemsChanged } from './itemSync'


const PUBLIC_ITEMS_ENDPOINT = '/api/items/'
const ADMIN_ITEMS_ENDPOINT = '/api/admin/items/'
const DJANGO_ADMIN_LOGIN_PATH = '/django-admin/login/?next=/django-admin/'
const AUTH_REQUIRED_MESSAGE =
  'Admin authentication is required. Sign in through the Django admin and try again.'

function normalizeItemsResponse(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.results)) {
    return payload.results
  }

  return []
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Date not provided'
  }

  let parsedDate = null

  if (typeof dateValue === 'string') {
    const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (match) {
      const [, year, month, day] = match
      parsedDate = new Date(Number(year), Number(month) - 1, Number(day))
    }
  }

  if (!parsedDate) {
    parsedDate = new Date(dateValue)
  }

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date not provided'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsedDate)
}

function getImageSrc(image) {
  return typeof image === 'string' && image.trim() ? image : ''
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : []

  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split('=')

    if (cookieName === name) {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return ''
}

function getCsrfHeaders() {
  const csrfToken = getCookie('csrftoken')

  if (!csrfToken) {
    return {}
  }

  return {
    'X-CSRFToken': csrfToken,
  }
}

async function getApiErrorMessage(response, fallbackMessage) {
  let payload

  try {
    payload = await response.json()
  } catch {
    return fallbackMessage
  }

  if (typeof payload?.detail === 'string' && payload.detail) {
    return payload.detail
  }

  if (payload && typeof payload === 'object') {
    const fieldMessages = Object.entries(payload)
      .map(([fieldName, value]) => {
        if (Array.isArray(value)) {
          return `${fieldName}: ${value.join(' ')}`
        }

        if (typeof value === 'string') {
          return `${fieldName}: ${value}`
        }

        return ''
      })
      .filter(Boolean)

    if (fieldMessages.length > 0) {
      return fieldMessages.join(' ')
    }
  }

  return fallbackMessage
}

function matchesSearch(item, searchTerm) {
 if (!searchTerm) {
  return true
}

const normalizedTerm = searchTerm.toLowerCase()
const fields = [
  item.id,
  item.item_number,
  item.name,
  item.category,
  item.description,
  item.location,
]

return fields.some((value) => String(value ?? '').toLowerCase().includes(normalizedTerm))
}

function mergeItemIntoList(items, nextItem) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id)

  if (existingIndex === -1) {
    return [nextItem, ...items]
  }

  return items.map((item) => (item.id === nextItem.id ? nextItem : item))
}

function AdminDashboard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [statusUpdatingItemId, setStatusUpdatingItemId] = useState(null)
  const [deletingItemId, setDeletingItemId] = useState(null)
  const [statusUpdateError, setStatusUpdateError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [formState, setFormState] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    date_found: '',
  })
  const [imageFile, setImageFile] = useState(null)

  async function loadItems({ signal, preserveLoading = false, preserveItemsOnError = false } = {}) {
    if (!preserveLoading) {
      setLoading(true)
      setError('')
    }

    try {
     const response = await fetch(ADMIN_ITEMS_ENDPOINT, {
  signal,
  cache: 'no-store',
  credentials: 'same-origin',
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

      if (!preserveItemsOnError) {
        setItems([])
      }
      setError('Unable to load the admin inventory right now.')
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      await loadItems({ signal: controller.signal, preserveLoading: true })
    })()

    return () => controller.abort()
  }, [])

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter
    return matchesStatus && matchesSearch(item, search.trim())
  })

  const totalItems = items.length
  const pendingItems = items.filter((item) => item.status === 'pending').length
  const completedItems = items.filter((item) => item.status === 'completed').length

  function handleFieldChange(event) {
    const { name, value } = event.target

    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }))
  }

  function handleEdit(item) {
    setEditingItemId(item.id)
    setFormState({
      name: item.name || '',
      category: item.category || '',
      description: item.description || '',
      location: item.location || '',
      date_found: typeof item.date_found === 'string' ? item.date_found.slice(0, 10) : '',
    })
    setImageFile(null)
    setSubmitError('')
    setSubmitSuccess('')
    document.getElementById('register-item-form')?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingItemId(null)
    setFormState({
      name: '',
      category: '',
      description: '',
      location: '',
      date_found: '',
    })
    setImageFile(null)
    setSubmitError('')
    setSubmitSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const isEditing = editingItemId !== null
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')

    const requestBody = new FormData()

    Object.entries(formState).forEach(([fieldName, value]) => {
      requestBody.append(fieldName, value)
    })

    if (imageFile) {
      requestBody.append('image', imageFile)
    }

    try {
      const response = await fetch(
        isEditing ? `${ADMIN_ITEMS_ENDPOINT}${editingItemId}/` : ADMIN_ITEMS_ENDPOINT,
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: requestBody,
          credentials: 'same-origin',
          headers: getCsrfHeaders(),
        }
      )

      if (response.status === 403) {
        throw new Error(AUTH_REQUIRED_MESSAGE)
      }

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            isEditing ? 'Unable to save the item changes.' : 'Unable to register the item right now.'
          )
        )
      }

      const savedItem = await response.json()

      setFormState({
        name: '',
        category: '',
        description: '',
        location: '',
        date_found: '',
      })
      setImageFile(null)
      setEditingItemId(null)
      setSubmitSuccess(isEditing ? 'Item changes saved successfully.' : 'Item registered successfully.')
      setItems((currentItems) => mergeItemIntoList(currentItems, savedItem))
      if (isEditing) {
        await loadItems({ preserveLoading: true, preserveItemsOnError: true })
      }
      notifyItemsChanged()
} catch (requestError) {
      setSubmitError(
        requestError.message ||
          (isEditing ? 'Unable to save the item changes.' : 'Unable to register the item right now.')
      )
} finally {
      setSubmitting(false)
}
}

async function handleStatusToggle(item) {
const nextStatus = item.status === 'completed' ? 'pending' : 'completed'
    let claimDetails = {}

    if (nextStatus === 'completed') {
      const unid = window.prompt('Enter claimant UNID:', item.unid || '')
      if (unid === null) return

      const claimedDate = window.prompt(
        'Enter claimed date (YYYY-MM-DD):',
        item.claimed_date || ''
      )
      if (claimedDate === null) return

      const adminNote = window.prompt('Enter admin note:', item.admin_note || '')
      if (adminNote === null) return

      claimDetails = {
        unid: unid.trim(),
        claimed_date: claimedDate.trim() || null,
        admin_note: adminNote.trim(),
      }
    }
    setStatusUpdatingItemId(item.id)
    setStatusUpdateError('')
    setSubmitSuccess('')

    try {
      const response = await fetch(`${ADMIN_ITEMS_ENDPOINT}${item.id}/`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: {
          ...getCsrfHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: nextStatus,
          ...claimDetails,
        }),
      })

      if (response.status === 403) {
        throw new Error(AUTH_REQUIRED_MESSAGE)
      }

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to update the item status.'))
      }

      const updatedItem = await response.json()

      setItems((currentItems) => mergeItemIntoList(currentItems, updatedItem))
      setSubmitSuccess(
        nextStatus === 'completed'
          ? 'Item marked as completed.'
          : 'Item moved back to pending.'
      )
      notifyItemsChanged()
    } catch (requestError) {
      setStatusUpdateError(requestError.message || 'Unable to update the item status.')
    } finally {
      setStatusUpdatingItemId(null)
    }
  }

  async function handleDelete(item) {
    const itemLabel = item.name || `item #${item.item_number ?? item.id}`
    if (!window.confirm(`Are you sure you want to delete ${itemLabel}? This cannot be undone.`)) {
      return
    }

    setDeletingItemId(item.id)
    setDeleteError('')
    setSubmitSuccess('')

    try {
      const response = await fetch(`${ADMIN_ITEMS_ENDPOINT}${item.id}/`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: getCsrfHeaders(),
      })

      if (response.status === 403) {
        throw new Error(AUTH_REQUIRED_MESSAGE)
      }

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Unable to delete the item.'))
      }

      setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))
      if (editingItemId === item.id) {
        handleCancelEdit()
      }
      setSubmitSuccess('Item deleted successfully.')
      await loadItems({ preserveLoading: true, preserveItemsOnError: true })
      notifyItemsChanged()
    } catch (requestError) {
      setDeleteError(requestError.message || 'Unable to delete the item.')
    } finally {
      setDeletingItemId(null)
    }
  }

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar light-sidebar">
        <div className="sidebar-title">UAC Lost &amp; Found Portal</div>

        <nav className="sidebar-nav">
          <a className="sidebar-link active" href="/admin">
            Dashboard
          </a>
          <a className="sidebar-link" href="/">
            Browse Items
          </a>
          <a className="sidebar-link active-red" href="#inventory-table">
            Register Item
          </a>
          <a className="sidebar-link" href={DJANGO_ADMIN_LOGIN_PATH}>
            Admin Login
          </a>
          
        </nav>

        
      </aside>

      <section className="admin-main stitch-admin-main">
        <header className="admin-topbar stitch-topbar">
          <div></div>
          <input
            className="admin-search small-search"
            placeholder="Search records..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
              <span>Pending</span>
              <strong>{pendingItems}</strong>
            </div>

            <div className="compact-stat-card">
              <span>Completed</span>
              <strong>{completedItems}</strong>
            </div>
          </div>
        </section>

        <section className="admin-two-column">
          <div className="admin-left-column">
            <section className="admin-section stitch-form-panel" id="register-item-form">
              <h2>{editingItemId !== null ? 'Edit Item' : 'Register New Item'}</h2>

              {submitError ? <p className="state-message state-message--error">{submitError}</p> : null}
{submitSuccess ? <p className="state-message">{submitSuccess}</p> : null}

<form className="stitch-admin-form" onSubmit={handleSubmit}>
  <label>
    Item Name
    <input
      name="name"
      placeholder="e.g. Blue Hydroflask"
      value={formState.name}
      onChange={handleFieldChange}
      required
    />
  </label>

                <label>
                  Category
                  <select name="category" value={formState.category} onChange={handleFieldChange}>
                    <option value="">Select Category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Keys & Wallets">Keys & Wallets</option>
                    <option value="Books & Study">Books & Study</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label>
                  Location Found
                  <input
                    name="location"
                    placeholder="e.g. Science Building, Room 204"
                    value={formState.location}
                    onChange={handleFieldChange}
                    required
                  />
                </label>

                <label>
                  Date Found
                  <input
                    name="date_found"
                    type="date"
                    value={formState.date_found}
                    onChange={handleFieldChange}
                    required
                  />
                </label>

                <label>
                  Image Upload
                  <input
                    key={editingItemId ?? 'new-item'}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                <label className="stitch-admin-form__description">
                  Description
                  <textarea
                    name="description"
                    placeholder="Optional description of the item"
                    value={formState.description}
                    onChange={handleFieldChange}
                    rows="4"
                  />
                </label>

                <div className="admin-form-actions">
                  <button type="submit" disabled={submitting}>
                    {submitting
                      ? editingItemId !== null
                        ? 'Saving Changes...'
                        : 'Registering...'
                      : editingItemId !== null
                        ? 'Save Changes'
                        : 'Register Item'}
                  </button>
                  {editingItemId !== null ? (
                    <button type="button" className="admin-cancel-edit-button" onClick={handleCancelEdit}>
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="protocol-note stitch-protocol">
              <strong>Admin Access</strong>
              <p>
                Creating items and changing item status uses Django admin permissions. Sign in at{' '}
                <a href={DJANGO_ADMIN_LOGIN_PATH}>/django-admin/login/</a> before using admin actions.
              </p>
            </section>
          </div>

          <section className="admin-section admin-right-column" id="inventory-table">
            {error ? <p className="state-message state-message--error">{error}</p> : null}
            {statusUpdateError ? <p className="state-message state-message--error">{statusUpdateError}</p> : null}
            {deleteError ? <p className="state-message state-message--error">{deleteError}</p> : null}

            <div className="table-toolbar">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>

              <button type="button" disabled>
                Export CSV
              </button>

              <input
               placeholder="Filter by Item No., Name, Category, or Location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="table-wrapper">
              <table className="admin-table">
              <thead>
  <tr>
    <th>Status</th>
    <th>Thumbnail</th>
    <th>Name &amp; Category</th>
    <th>Location</th>
    <th>Date</th>
    <th>Claim Details</th>
    <th>Actions</th>
  </tr>
</thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        Loading items...
                      </td>
                    </tr>
                  ) : null}

                  {!loading && filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        No items found.
                      </td>
                    </tr>
                  ) : null}

                  {!loading
                    ? filteredItems.map((item) => {
                        const imageSrc = getImageSrc(item.image)
                        const isCompleted = item.status === 'completed'

                        return (
                          <tr key={item.id}>
                            <td>
                              <span
                                className={`admin-status-chip${
                                  isCompleted ? ' admin-status-chip--completed' : ''
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td>
                              {imageSrc ? (
                                <img
                                  className="admin-thumbnail"
                                  src={imageSrc}
                                  alt={item.name || 'Lost and found item'}
                                />
                              ) : (
                                <div className="admin-thumbnail admin-thumbnail--placeholder">No photo</div>
                              )}
                            </td>
                            <td>
                              <strong>{item.name || 'Unnamed item'}</strong>
                              <div className="admin-row-meta">
                               #{item.item_number ?? item.id}
                                {item.category || 'Uncategorized'}
                              </div>
                            </td>
                            <td>{item.location || 'Location not provided'}</td>

<td>{formatDate(item.date_found)}</td>

<td>
  {isCompleted ? (
    <div>
      <div><strong>UNID:</strong> {item.unid || '-'}</div>
      <div><strong>Claimed Date:</strong> {formatDate(item.claimed_date)}</div>
      <div><strong>Admin Note:</strong> {item.admin_note || '-'}</div>
    </div>
  ) : (
    <span>-</span>
  )}
</td>

<td>
  <div className="admin-item-actions">
                                <button
                                  type="button"
                                  className="admin-action-button admin-edit-button"
                                  disabled={submitting || statusUpdatingItemId === item.id}
                                  onClick={() => handleEdit(item)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="admin-action-button"
                                  disabled={statusUpdatingItemId === item.id || deletingItemId === item.id}
                                  onClick={() => handleStatusToggle(item)}
                                >
                                  {statusUpdatingItemId === item.id
                                    ? 'Updating...'
                                    : isCompleted
                                      ? 'Mark Pending'
                                      : 'Mark Completed'}
                                </button>
                                <button
                                  type="button"
                                  className="admin-action-button admin-delete-button"
                                  disabled={deletingItemId === item.id || statusUpdatingItemId === item.id}
                                  onClick={() => handleDelete(item)}
                                >
                                  {deletingItemId === item.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    : null}
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
