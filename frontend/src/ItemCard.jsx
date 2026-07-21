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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateValue))
}

function ItemCard({ item }) {
  const isCompleted = item.status === 'completed'

  return (
    <article className={`item-card${isCompleted ? ' item-card--completed' : ''}`}>
      <div className="item-card__image-wrap">
        {item.image || item.image_url ? (
          <img
            src={item.image_url || item.image}
            alt={item.name}
            className="item-card__image"
          />
        ) : (
          <div className="item-card__placeholder">
            <span>No Image</span>
          </div>
        )}

        <span className={`item-status-pill item-status-pill--${item.status || 'pending'}`}>
          {isCompleted ? '✓ Completed' : formatStatus(item.status || 'pending')}
        </span>
      </div>

      <div className="item-card__body">
        <div className="item-card__code-row">
          <span>{`Item No. ${item.item_number ?? item.id ?? '-'}`}</span>
          <span>{item.category || 'Uncategorized'}</span>
        </div>

        <h2>{item.name || 'Unnamed Item'}</h2>

        <p className="item-card__location">
          📍 {item.location || 'Location not provided'}
        </p>

        <p className="item-card__date">
          Found: {formatDate(item.date_found)}
        </p>

        <p className="item-card__description">
          {item.description || 'No description provided.'}
        </p>
      </div>
    </article>
  )
}

export default ItemCard
