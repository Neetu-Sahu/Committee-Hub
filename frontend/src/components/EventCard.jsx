export default function EventCard({ event, onSelect }) {
  const isUpcoming = new Date(event.date) >= new Date();

  return (
    <div
      className="card feed-card"
      style={{ cursor: "pointer", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
      onClick={() => onSelect && onSelect(event._id)}
    >
      {event.posterUrl && <img src={event.posterUrl} alt={event.title} className="event-poster" />}
      <div className="feed-card-header">
        <span className={`feed-type event ${isUpcoming ? "" : "past"}`}>
          {isUpcoming ? "Upcoming Event" : "Past Event"}
        </span>
        <span className="feed-committee">{event.committee?.name}</span>
      </div>
      <h4>{event.title}</h4>
      <p>{event.description}</p>
      <div className="event-meta">
        <span>📅 {new Date(event.date).toLocaleDateString()}</span>
        {event.venue && <span>📍 {event.venue}</span>}
      </div>

      {event.assignedCoordinator && (
        <div style={{ fontSize: "0.85rem", color: "#c2410c", marginTop: "4px" }}>
          👤 Coordinator in-charge: <strong>{event.assignedCoordinator.name}</strong>
        </div>
      )}

      <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          className="btn-small"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(event._id);
          }}
        >
          View Event Details →
        </button>
        {isUpcoming && <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Click to register</span>}
      </div>
    </div>
  );
}
