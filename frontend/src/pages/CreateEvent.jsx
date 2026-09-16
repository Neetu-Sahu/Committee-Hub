import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function CreateEvent() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedCommitteeId = searchParams.get("committee") || searchParams.get("committeeId");

  const [committees, setCommittees] = useState([]);
  const [form, setForm] = useState({
    committeeId: "",
    title: "",
    description: "",
    posterUrl: "",
    date: "",
    venue: "",
    registrationLink: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.get("/committees").then((res) => {
      const commId = String(user.assignedCommittee?._id || user.assignedCommittee || user.headOf);
      const list = res.data.filter(
        (c) =>
          String(c._id) === commId ||
          String(c._id) === preselectedCommitteeId ||
          String(c.chairperson?._id || c.chairperson) === String(user._id) ||
          String(c.head?._id || c.head) === String(user._id) ||
          (c.coordinators || []).some((coord) => String(coord._id || coord) === String(user._id))
      );
      setCommittees(list);
      const initialId =
        preselectedCommitteeId && list.some((c) => String(c._id) === preselectedCommitteeId)
          ? preselectedCommitteeId
          : list[0]?._id || "";
      setForm((f) => ({ ...f, committeeId: initialId }));
    });
  }, [user, preselectedCommitteeId]);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      await api.post("/events", form);
      setStatus("Event created and scheduled successfully!");
      setForm({
        ...form,
        title: "",
        description: "",
        posterUrl: "",
        date: "",
        venue: "",
        registrationLink: "",
      });
    } catch (err) {
      setStatus(err.response?.data?.message || "Failed to post event");
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Create & Schedule Committee Event</h1>
          <p className="subtitle">
            Organize workshops, hackathons, seminars, and club activities for college students.
          </p>
        </div>
      </div>

      {status && <div className="hint">{status}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        <label>Committee</label>
        <select value={form.committeeId} onChange={update("committeeId")} required>
          {committees.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.category})
            </option>
          ))}
        </select>

        <label>Event Title</label>
        <input
          value={form.title}
          onChange={update("title")}
          placeholder="e.g. Hackfest 2026: 24h Hackathon"
          required
        />

        <label>Description</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={update("description")}
          placeholder="Overview, rules, eligibility..."
          required
        />

        <label>Poster Image URL (optional)</label>
        <input
          value={form.posterUrl}
          onChange={update("posterUrl")}
          placeholder="https://..."
        />

        <div className="form-row">
          <div>
            <label>Date & Time</label>
            <input type="datetime-local" value={form.date} onChange={update("date")} required />
          </div>
          <div>
            <label>Venue / Location</label>
            <input
              value={form.venue}
              onChange={update("venue")}
              placeholder="e.g. CS Block Auditorium"
            />
          </div>
        </div>

        <label>Registration Link (optional)</label>
        <input
          value={form.registrationLink}
          onChange={update("registrationLink")}
          placeholder="https://forms.gle/... or website link"
        />

        <button type="submit" className="primary-btn">Schedule Event</button>
      </form>
    </div>
  );
}
