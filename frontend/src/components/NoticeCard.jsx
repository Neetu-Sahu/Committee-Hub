export default function NoticeCard({ notice }) {
  return (
    <div className="card feed-card">
      <div className="feed-card-header">
        <span className="feed-type notice">Notice</span>
        <span className="feed-committee">{notice.committee?.name}</span>
        {notice.pinned && <span className="badge pin">Pinned</span>}
      </div>
      <h4>{notice.title}</h4>
      <p>{notice.content}</p>
      {notice.attachmentUrl && (
        <a href={notice.attachmentUrl} target="_blank" rel="noreferrer">
          View attachment
        </a>
      )}
      <div className="feed-card-footer">
        <span>By {notice.createdBy?.name}</span>
        <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
