import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function CreateNotice() {
  const { user } = useAuth();
  const [committees, setCommittees] = useState([]);
  const [form, setForm] = useState({
    committeeId: "",
    title: "",
    content: "",
    attachmentUrl: "",
    pinned: false,
    isInstituteWide: false,
  });
  const [status, setStatus] = useState("");

  const isAdmin = user && (user.role === "admin" || user.role === "faculty_advisor");

  useEffect(() => {
    api.get("/committees").then((res) => {
      let list = res.data;
      if (!isAdmin) {
        const commId = String(user.assignedCommittee?._id || user.assignedCommittee || user.headOf);
        list = res.data.filter(
          (c) =>
            String(c._id) === commId ||
            String(c.chairperson?._id || c.chairperson) === String(user._id) ||
            String(c.head?._id || c.head) === String(user._id) ||
            (c.coordinators || []).some((coord) => String(coord._id || coord) === String(user._id))
        );
      }
      setCommittees(list);
      if (list.length > 0) setForm((f) => ({ ...f, committeeId: list[0]._id }));
    });
  }, [user, isAdmin]);

  const update = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      await api.post("/notices", form);
      setStatus("Notice published successfully!");
      setForm({
        ...form,
        title: "",
        content: "",
        attachmentUrl: "",
        isInstituteWide: false,
      });
    } catch (err) {
      setStatus(err.response?.data?.message || "Failed to post notice");
    }
  };

  return (
    <div className="page">
      <h1>Publish an Announcement / Notice</h1>
      {status && <div className="hint">{status}</div>}

      <form className="form-card" onSubmit={handleSubmit}>
        {isAdmin && (
          <label className="checkbox-label" style={{ marginBottom: "1rem", fontWeight: 600, color: "#4f46e5" }}>
            <input
              type="checkbox"
              checked={form.isInstituteWide}
              onChange={update("isInstituteWide")}
            />
            Publish as Institute-wide Official Notice (broadcast to all students & committees)
          </label>
        )}

        {!form.isInstituteWide && (
          <>
            <label>Committee</label>
            <select value={form.committeeId} onChange={update("committeeId")} required={!form.isInstituteWide}>
              {committees.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}

        <label>Notice Title</label>
        <input
          value={form.title}
          onChange={update("title")}
          placeholder="e.g. Hackfest 2026 Registration Guidelines"
          required
        />

        <label>Content</label>
        <textarea
          rows={5}
          value={form.content}
          onChange={update("content")}
          placeholder="Full announcement details..."
          required
        />

        <label>Attachment URL (optional)</label>
        <input
          value={form.attachmentUrl}
          onChange={update("attachmentUrl")}
          placeholder="https://..."
        />

        <label className="checkbox-label">
          <input type="checkbox" checked={form.pinned} onChange={update("pinned")} />
          Pin this notice to top of feed
        </label>

        <button type="submit" className="primary-btn">Publish Notice</button>
      </form>
    </div>
  );
}
