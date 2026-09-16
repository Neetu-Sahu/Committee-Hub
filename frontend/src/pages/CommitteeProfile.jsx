import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import NoticeCard from "../components/NoticeCard";
import EventCard from "../components/EventCard";
import EventDetailModal from "../components/EventDetailModal";

export default function CommitteeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [committee, setCommittee] = useState(null);
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [joinMessage, setJoinMessage] = useState("");
  const [joinStatus, setJoinStatus] = useState("");
  const [myApplication, setMyApplication] = useState(null);
  const [actionFeedback, setActionFeedback] = useState("");
  const [meetings, setMeetings] = useState([]);

  const isAdmin = user && (user.role === "admin" || user.role === "faculty_advisor");
  const isStudent = user && (user.role === "student" || user.role === "fresher");

  const isChairperson =
    user &&
    (user.role === "chairperson" || user.role === "committee_head") &&
    (String(committee?.chairperson?._id || committee?.chairperson || committee?.head?._id || committee?.head) ===
      String(user._id) ||
      String(user.assignedCommittee?._id || user.assignedCommittee || user.headOf) === String(id));

  const isCoordinator =
    user &&
    user.role === "coordinator" &&
    ((committee?.coordinators || []).some((c) => String(c._id || c) === String(user._id)) ||
      String(user.assignedCommittee?._id || user.assignedCommittee) === String(id));

  const isMember =
    committee?.members?.some(
      (m) => String(m._id || m) === String(user?._id)
    ) ||
    String(committee?.chairperson?._id || committee?.chairperson) === String(user?._id) ||
    (committee?.coordinators || []).some((c) => String(c._id || c) === String(user?._id));

  const load = () => {
    api.get(`/committees/${id}`).then((res) => setCommittee(res.data));
    api.get("/notices", { params: { committee: id } }).then((res) => setNotices(res.data));
    api.get("/events", { params: { committee: id } }).then((res) => setEvents(res.data));
    api.get("/meetings", { params: { committee: id } }).then((res) => setMeetings(res.data)).catch(() => {});
    if (isStudent) {
      api.get("/join-requests/my").then((res) => {
        const app = res.data.find((r) => String(r.committee?._id || r.committee) === String(id));
        setMyApplication(app || null);
      });
    }
  };

  useEffect(() => {
    load();
  }, [id, user]);

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/join-requests", { committeeId: id, message: joinMessage });
      setJoinStatus("Request sent! The committee chairperson will review it.");
      setMyApplication(res.data);
      setJoinMessage("");
    } catch (err) {
      setJoinStatus(err.response?.data?.message || "Failed to send request");
    }
  };

  const handleAppointCoordinator = async (userId) => {
    try {
      await api.post(`/committees/${id}/coordinators`, { userId });
      setActionFeedback("Coordinator appointed successfully!");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to appoint coordinator");
    }
  };

  const handleRemoveCoordinator = async (userId) => {
    if (!window.confirm("Remove coordinator privileges for this member?")) return;
    try {
      await api.delete(`/committees/${id}/coordinators/${userId}`);
      setActionFeedback("Coordinator privileges removed.");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove coordinator");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member from the committee?")) return;
    try {
      await api.delete(`/committees/${id}/members/${userId}`);
      setActionFeedback("Member removed.");
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  if (!committee) return <div className="page">Loading committee details...</div>;

  const chairperson = committee.chairperson || committee.head;
  const coordinators = committee.coordinators || [];
  // Regular members excluding chairperson and coordinators
  const regularMembers = (committee.members || []).filter(
    (m) =>
      String(m._id) !== String(chairperson?._id) &&
      !coordinators.some((c) => String(c._id) === String(m._id))
  );

  return (
    <div className="page">
      {actionFeedback && <div className="hint" style={{ marginBottom: "1rem" }}>{actionFeedback}</div>}

      <div className="committee-profile-header card">
        {committee.logoUrl ? (
          <img src={committee.logoUrl} alt={committee.name} className="committee-logo large" />
        ) : (
          <div className="committee-logo large placeholder">{committee.name.charAt(0)}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h1>{committee.name}</h1>
            {isChairperson && (
              <span className="badge" style={{ background: "#4f46e5", color: "#fff" }}>
                You are Managing this Committee
              </span>
            )}
          </div>

          <span className="tag category-tag">{committee.category}</span>
          <p style={{ margin: "10px 0" }}>{committee.description}</p>
          <div className="tag-row">
            {(committee.tags || []).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.9rem", color: "#4b5563" }}>
            <span>👤 <strong>Chairperson:</strong> {chairperson?.name || "Unassigned"}</span>
            <span>⚡ <strong>Coordinators:</strong> {coordinators.length}</span>
            <span>👥 <strong>Total Members:</strong> {committee.members?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Chairperson & Coordinator Operations Bar */}
      {(isChairperson || isCoordinator) && (
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
            border: "1px solid #bfdbfe",
            marginTop: "1.25rem",
            padding: "1rem 1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <span style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                👑 {isChairperson ? "Chairperson Control Panel" : "Coordinator Panel"}
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "0.83rem", color: "#475569" }}>
                Broadcast notices, schedule events, assign tasks to members, or record Hall of Fame achievements.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link
                to={`/manage/notice?committee=${committee._id}`}
                className="primary-btn"
                style={{ padding: "8px 14px", fontSize: "0.85rem", textDecoration: "none" }}
              >
                📢 Post Notice
              </Link>
              <Link
                to={`/manage/event?committee=${committee._id}`}
                className="primary-btn"
                style={{ padding: "8px 14px", fontSize: "0.85rem", background: "#059669", textDecoration: "none" }}
              >
                🎉 Post Event
              </Link>
              <Link
                to="/tasks"
                className="btn-small"
                style={{ padding: "8px 14px", fontSize: "0.85rem", textDecoration: "none" }}
              >
                📋 Tasks / Issues
              </Link>
              <Link
                to="/winners"
                className="btn-small"
                style={{ padding: "8px 14px", fontSize: "0.85rem", textDecoration: "none" }}
              >
                🏆 Hall of Fame
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Student Join Application Status & Form (Visible ONLY to students/freshers) */}
      {isStudent && !isMember && (
        <div className="card join-box">
          {myApplication?.status === "pending" ? (
            <div>
              <h3>Application Submitted ⏳</h3>
              <p style={{ color: "#d97706", margin: "6px 0" }}>
                Your request to join <strong>{committee.name}</strong> is currently pending review by the Chairperson.
              </p>
              <Link to="/my-applications" className="btn-small" style={{ marginTop: "8px", display: "inline-block" }}>
                Track in My Applications →
              </Link>
            </div>
          ) : myApplication?.status === "rejected" ? (
            <div>
              <h3>Application Update</h3>
              <p style={{ color: "#dc2626", margin: "6px 0" }}>
                Your application for this committee was not accepted for this cycle.
              </p>
              <form onSubmit={handleJoin} className="join-form" style={{ marginTop: "8px" }}>
                <input
                  placeholder="Re-apply with updated note..."
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                />
                <button type="submit">Re-apply</button>
              </form>
            </div>
          ) : (
            <div>
              <h3>Want to join {committee.name}?</h3>
              <p className="subtitle">Submit an application to the committee chairperson.</p>
              {joinStatus && <p className="hint">{joinStatus}</p>}
              <form onSubmit={handleJoin} className="join-form">
                <input
                  placeholder="Tell the committee chairperson why you'd like to join..."
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                />
                <button type="submit" className="primary-btn">Request to Join</button>
              </form>
            </div>
          )}
        </div>
      )}

      {isMember && !isChairperson && !isCoordinator && (
        <div className="card join-box success" style={{ background: "rgba(16, 185, 129, 0.1)", borderColor: "#10b981", color: "#065f46" }}>
          ✅ You are an active participant of <strong>{committee.name}</strong>. Check your assigned tasks on the Tasks board.
        </div>
      )}

      {/* Committee Governance & Leadership Roster */}
      <section className="section">
        <h2>Leadership & Coordinators</h2>
        <div className="grid">
          {/* Chairperson Card */}
          <div className="card" style={{ borderLeft: "4px solid #4f46e5" }}>
            <span className="tag" style={{ background: "#4f46e5", color: "#fff" }}>CHAIRPERSON</span>
            <h3 style={{ margin: "8px 0 4px" }}>{chairperson?.name || "Unassigned"}</h3>
            <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{chairperson?.email}</p>
            <p style={{ fontSize: "0.85rem" }}>Branch: {chairperson?.branch || "CSE"}, Year {chairperson?.year || "4"}</p>
          </div>

          {/* Coordinators */}
          {coordinators.map((c) => (
            <div key={c._id} className="card" style={{ borderLeft: "4px solid #f59e0b" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="tag" style={{ background: "#f59e0b", color: "#fff" }}>COORDINATOR</span>
                {isChairperson && (
                  <button
                    className="btn-small danger"
                    onClick={() => handleRemoveCoordinator(c._id)}
                    title="Demote to regular member"
                  >
                    Demote
                  </button>
                )}
              </div>
              <h3 style={{ margin: "8px 0 4px" }}>{c.name}</h3>
              <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>{c.email}</p>
              <p style={{ fontSize: "0.85rem" }}>Branch: {c.branch || "N/A"}, Year {c.year || "N/A"}</p>
            </div>
          ))}

          {coordinators.length === 0 && (
            <div className="card empty-state" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p>No coordinators appointed yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Members Section */}
      <section className="section">
        <h2>Committee Members ({committee.members?.length || 0})</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Branch / Year</th>
              <th>Role</th>
              {isChairperson && <th>Leadership Action</th>}
            </tr>
          </thead>
          <tbody>
            {(committee.members || []).map((m) => {
              const isCoord = coordinators.some((c) => String(c._id) === String(m._id));
              const isChair = String(chairperson?._id) === String(m._id);

              return (
                <tr key={m._id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.email}</td>
                  <td>{m.branch || "N/A"} - Yr {m.year || "N/A"}</td>
                  <td>
                    <span className="tag">
                      {isChair ? "Chairperson" : isCoord ? "Coordinator" : "Member"}
                    </span>
                  </td>
                  {isChairperson && (
                    <td>
                      {!isChair && !isCoord && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn-small"
                            onClick={() => handleAppointCoordinator(m._id)}
                          >
                            + Appoint Coordinator
                          </button>
                          <button
                            className="btn-small danger"
                            onClick={() => handleRemoveMember(m._id)}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                      {isCoord && (
                        <button
                          className="btn-small danger"
                          onClick={() => handleRemoveCoordinator(m._id)}
                        >
                          Demote Coordinator
                        </button>
                      )}
                      {isChair && <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Chairperson</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Notices */}
      <section className="section">
        <h2>Announcements & Notices</h2>
        <div className="grid">
          {notices.length === 0 && <p className="empty-state">No notices for this committee yet.</p>}
          {notices.map((n) => (
            <NoticeCard key={n._id} notice={n} />
          ))}
        </div>
      </section>

      {/* Events */}
      <section className="section">
        <h2>Scheduled Events</h2>
        <div className="grid">
          {events.length === 0 && <p className="empty-state">No scheduled events yet.</p>}
          {events.map((e) => (
            <EventCard
              key={e._id}
              event={e}
              onSelect={(eventId) => setSelectedEventId(eventId)}
            />
          ))}
        </div>
      </section>

      {/* Administrative Review Meetings called by System Admin */}
      {meetings.length > 0 && (
        <section className="section">
          <h2>🏛️ Administrative Review Meetings (Called by System Admin)</h2>
          <div className="grid">
            {meetings.map((m) => (
              <div key={m._id} className="card" style={{ borderLeft: "4px solid #4f46e5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="tag" style={{ background: "#e0e7ff", color: "#3730a3" }}>
                    {m.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    📅 {new Date(m.date).toLocaleDateString()} {m.time ? `· ${m.time}` : ""}
                  </span>
                </div>
                <h3 style={{ margin: "8px 0 4px" }}>{m.title}</h3>
                <p style={{ fontSize: "0.88rem", color: "#334155", margin: "4px 0 8px" }}>{m.agenda}</p>
                <div style={{ fontSize: "0.83rem", color: "#64748b" }}>
                  <span>📍 Venue: {m.venue}</span>
                  {m.meetingLink && (
                    <span style={{ marginLeft: "10px" }}>
                      🔗 <a href={m.meetingLink} target="_blank" rel="noreferrer">Meeting Link</a>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event Details & Chairperson Edit Modal */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
