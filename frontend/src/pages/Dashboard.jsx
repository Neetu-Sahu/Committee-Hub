import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import NoticeCard from "../components/NoticeCard";
import EventCard from "../components/EventCard";
import WinnerCard from "../components/WinnerCard";
import EventDetailModal from "../components/EventDetailModal";

export default function Dashboard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [winners, setWinners] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filter, setFilter] = useState("all"); // all | mine
  const [loading, setLoading] = useState(true);

  // Modals for suggestions and facility reporting
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({ title: "", category: "new_committee", description: "" });
  const [suggestionStatus, setSuggestionStatus] = useState("");

  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [facilityForm, setFacilityForm] = useState({
    title: "",
    facility: "Computer Labs",
    location: "",
    description: "",
    urgency: "medium",
  });
  const [facilityStatus, setFacilityStatus] = useState("");

  const isStudent = user && (user.role === "student" || user.role === "fresher");

  useEffect(() => {
    const params = filter === "mine" ? { mine: "true" } : {};
    setLoading(true);
    Promise.all([
      api.get("/notices", { params }),
      api.get("/events", { params: { ...params, upcoming: "true" } }),
      api.get("/winners"),
    ])
      .then(([n, e, w]) => {
        setNotices(n.data);
        setEvents(e.data);
        setWinners(w.data.slice(0, 3));
      })
      .finally(() => setLoading(false));
  }, [filter]);

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    setSuggestionStatus("");
    try {
      await api.post("/suggestions", suggestionForm);
      setSuggestionStatus("Thank you! Your idea has been sent to college administration.");
      setTimeout(() => {
        setShowSuggestionModal(false);
        setSuggestionForm({ title: "", category: "new_committee", description: "" });
        setSuggestionStatus("");
      }, 1500);
    } catch (err) {
      setSuggestionStatus(err.response?.data?.message || "Failed to submit suggestion");
    }
  };

  const handleFacilitySubmit = async (e) => {
    e.preventDefault();
    setFacilityStatus("");
    try {
      await api.post("/facility-issues", facilityForm);
      setFacilityStatus("Facility issue reported successfully to college administration!");
      setTimeout(() => {
        setShowFacilityModal(false);
        setFacilityForm({ title: "", facility: "Computer Labs", location: "", description: "", urgency: "medium" });
        setFacilityStatus("");
      }, 1500);
    } catch (err) {
      setFacilityStatus(err.response?.data?.message || "Failed to report issue");
    }
  };

  // Merge notices + events into one reverse-chronological feed
  const feed = [
    ...notices.map((n) => ({ type: "notice", date: n.createdAt, data: n })),
    ...events.map((e) => ({ type: "event", date: e.createdAt, data: e })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name.split(" ")[0]} 👋</h1>
          <p className="subtitle">Catch up on campus club activities, announcements, and events.</p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {isStudent && (
            <button
              className="btn-small"
              style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a", fontWeight: 600 }}
              onClick={() => setShowSuggestionModal(true)}
            >
              💡 Suggest Club Idea
            </button>
          )}

          <button
            className="btn-small"
            style={{ background: "#fee2e2", color: "#991b1b", borderColor: "#fecaca", fontWeight: 600 }}
            onClick={() => setShowFacilityModal(true)}
          >
            🛠️ Report Facility Issue
          </button>

          <div className="filter-toggle">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              All Committees
            </button>
            <button className={filter === "mine" ? "active" : ""} onClick={() => setFilter("mine")}>
              My Committees
            </button>
          </div>
        </div>
      </div>

      {winners.length > 0 && (
        <section className="section">
          <h2>🏆 Recent Achievers</h2>
          <div className="grid winners-strip">
            {winners.map((w) => (
              <WinnerCard key={w._id} winner={w} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>Updates & Events</h2>
        {loading && <p>Loading feed...</p>}
        {!loading && feed.length === 0 && (
          <p className="empty-state">
            Nothing here yet. {filter === "mine" ? "Join a committee to see its updates." : ""}
          </p>
        )}
        <div className="grid">
          {feed.map((item) =>
            item.type === "notice" ? (
              <NoticeCard key={`n-${item.data._id}`} notice={item.data} />
            ) : (
              <EventCard
                key={`e-${item.data._id}`}
                event={item.data}
                onSelect={(eventId) => setSelectedEventId(eventId)}
              />
            )
          )}
        </div>
      </section>

      {/* Suggestion Modal */}
      {showSuggestionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card form-card" style={{ maxWidth: "550px", width: "100%", background: "white" }}>
            <h3>💡 Suggest a New Club or Activity</h3>
            <p className="subtitle">
              Have an idea for a committee or activity that SRMS CET needs? Share it directly with college administration.
            </p>
            {suggestionStatus && <div className="hint">{suggestionStatus}</div>}
            <form onSubmit={handleSuggestionSubmit}>
              <label>Proposal Title</label>
              <input
                required
                placeholder="e.g. Photography & Film Making Club"
                value={suggestionForm.title}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, title: e.target.value })}
              />

              <label>Category</label>
              <select
                value={suggestionForm.category}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, category: e.target.value })}
              >
                <option value="new_committee">New Committee / Club Proposal</option>
                <option value="club_activity">Club Activity / Event Idea</option>
                <option value="campus_life">Campus Student Life</option>
                <option value="other">Other Suggestion</option>
              </select>

              <label>Description & Objectives</label>
              <textarea
                rows={4}
                required
                placeholder="Explain why students would love this club, what activities it could host..."
                value={suggestionForm.description}
                onChange={(e) => setSuggestionForm({ ...suggestionForm, description: e.target.value })}
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button type="submit" className="primary-btn">Submit Proposal</button>
                <button type="button" className="btn-link" onClick={() => setShowSuggestionModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Issue Modal */}
      {showFacilityModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="card form-card" style={{ maxWidth: "550px", width: "100%", background: "white" }}>
            <h3>🛠️ Report a Facility or Equipment Issue</h3>
            <p className="subtitle">
              Report issues regarding campus infrastructure (labs, auditorium, sports equipment, etc.) so administration can assign a resolution task.
            </p>
            {facilityStatus && <div className="hint">{facilityStatus}</div>}
            <form onSubmit={handleFacilitySubmit}>
              <label>Issue Title</label>
              <input
                required
                placeholder="e.g. Projector lamp broken in CS Lab 3"
                value={facilityForm.title}
                onChange={(e) => setFacilityForm({ ...facilityForm, title: e.target.value })}
              />

              <div className="form-row">
                <div>
                  <label>Facility Area</label>
                  <select
                    value={facilityForm.facility}
                    onChange={(e) => setFacilityForm({ ...facilityForm, facility: e.target.value })}
                  >
                    <option value="Auditorium">Auditorium</option>
                    <option value="Computer Labs">Computer Labs</option>
                    <option value="Sports Complex & Grounds">Sports Complex & Grounds</option>
                    <option value="Library">Library</option>
                    <option value="Classrooms & Projectors">Classrooms & Projectors</option>
                    <option value="Hostel & Mess">Hostel & Mess</option>
                    <option value="Campus Wi-Fi / Network">Campus Wi-Fi / Network</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label>Urgency</label>
                  <select
                    value={facilityForm.urgency}
                    onChange={(e) => setFacilityForm({ ...facilityForm, urgency: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical (Event/Exam Impact)</option>
                  </select>
                </div>
              </div>

              <label>Location / Room</label>
              <input
                required
                placeholder="e.g. CS Block 2nd Floor, Room 204"
                value={facilityForm.location}
                onChange={(e) => setFacilityForm({ ...facilityForm, location: e.target.value })}
              />

              <label>Description of Issue</label>
              <textarea
                rows={3}
                required
                placeholder="Describe the issue in detail..."
                value={facilityForm.description}
                onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
              />

              <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
                <button type="submit" className="primary-btn">Submit Report</button>
                <button type="button" className="btn-link" onClick={() => setShowFacilityModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEventId && (
        <EventDetailModal
          eventId={selectedEventId}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  );
}
