function ItemCard({ name, location, status }) {
  const isCompleted = status === "Completed"

  return (
    <div style={{
      border: "1px solid gray",
      padding: "20px",
      marginBottom: "10px",
      opacity: isCompleted ? 0.5 : 1
    }}>
      <h3>{name}</h3>
      <p>Location: {location}</p>
      <p>Status: {status} {isCompleted ? "✔️" : ""}</p>
    </div>
  )
}

export default ItemCard