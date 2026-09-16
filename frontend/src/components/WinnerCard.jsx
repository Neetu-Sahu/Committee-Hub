export default function WinnerCard({ winner }) {
  return (
    <div className="card winner-card">
      {winner.photoUrl ? (
        <img src={winner.photoUrl} alt={winner.studentName} className="winner-photo" />
      ) : (
        <div className="winner-photo placeholder">🏆</div>
      )}
      <div>
        <h4>{winner.studentName}</h4>
        <p className="achievement">{winner.achievement}</p>
        <span className="tag category-tag">{winner.committee?.name}</span>
        <span className="year">{winner.year}</span>
      </div>
    </div>
  );
}
