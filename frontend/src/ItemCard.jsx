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

function ItemCard({ item, onComplete, showCompleteAction = false, actionDisabled = false }) {
  const isCompleted = item.status === 'completed'
  const imageSrc = getImageSrc(item.image)
  const itemNumber = item.item_number ?? item.id ?? 'N/A'
  const itemCode = item.item_code || 'Unassigned'
  const category = item.category || 'Uncategorized'
  const location = item.location || 'Location not provided'

  return (
    <article className={`item-card${isCompleted ? ' item-card--completed' : ''}`}>
      <div className="item-card__image-wrap">
        {imageSrc ? (
          <img className="item-card__image" src={imageSrc} alt={item.name || 'Lost and found item'} />
        ) : (
          <div className="item-card__placeholder">No photo uploaded</div>
        )}

        <span
          className={`item-status-pill${isCompleted ? ' item-status-pill--completed' : ''}`}
        >
          {formatStatus(item.status)}
        </span>
      </div>

      <div className="item-card__body">
        <div className="item-card__code-row">
          <span>Item No. {itemNumber}</span>
          <span>Code: {itemCode}</span>
        </div>

        <h2>{item.name || 'Unnamed item'}</h2>

        <p className="item-card__location">Category: {category}</p>
        <p className="item-card__location">Location: {location}</p>
        <p className="item-card__date">Found: {formatDate(item.date_found)}</p>
        <p className="item-card__description">
          {item.description || 'No extra description provided yet.'}
        </p>

        {showCompleteAction && !isCompleted ? (
          <button
            type="button"
            className="item-card__action"
            disabled={actionDisabled}
            onClick={() => onComplete?.(item.id)}
          >
            Mark Completed
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default ItemCard
