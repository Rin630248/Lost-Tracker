function formatStatus(status) {
  if (!status) {
    return 'Unknown'
  }

  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Date not provided'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateValue))
}

function ItemCard({ item }) {
  const isCompleted = item.status === 'completed'

  return (
    <article className={`item-card${isCompleted ? ' item-card--completed' : ''}`}>
      <div className="item-card__media">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="item-card__placeholder">No photo uploaded</div>
        )}
      </div>

      <div className="item-card__content">
        <div className="item-card__topline">
          <p className="item-card__number">Item No. {item.item_number}</p>
          <span className={`status-badge status-badge--${item.status}`}>{formatStatus(item.status)}</span>
        </div>

        <h2>{item.name}</h2>

        <div className="item-card__meta">
          <span>Code: {item.item_code}</span>
          <span>{item.category || 'Uncategorized'}</span>
          <span>Found: {formatDate(item.date_found)}</span>
        </div>

        <p className="item-card__location">Location: {item.location}</p>
        <p className="item-card__description">{item.description || 'No extra description provided yet.'}</p>
      </div>
    </article>
  )
}

export default ItemCard
