import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  // Resolution note state for admin inline updating
  const [editingResolutionId, setEditingResolutionId] = useState(null);
  const [resolutionText, setResolutionText] = useState("");

  // New task form state (for Chairperson)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    urgency: "medium",
    dueDate: "",
  });

  const isAdmin = user && (user.role === "admin" || user.role === "faculty_advisor");
  const isChairperson = user && (user.role === "chairperson" || user.role === "committee_head");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tasks");
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const handleRaiseTask = async (e) => {
    e.preventDefault();
    setActionMessage("");
    try {
      await api.post("/tasks", newTask);
      setActionMessage("Task / Issue raised successfully for the administration!");
      setShowRaiseModal(false);
      setNewTask({ title: "", description: "", urgency: "medium", dueDate: "" });
      fetchTasks();
    } catch (err) {
      setActionMessage(err.response?.data?.message || "Failed to raise task");
    }
  };

  // Strictly Admin can mark done, pending, or in progress
  const handleStatusChange = async (taskId, newStatus) => {
    if (!isAdmin) return;
    try {
      await api.put(`/tasks/${taskId}`, {
        status: newStatus,
        resolutionNotes: resolutionText || undefined,
      });
      setEditingResolutionId(null);
      setResolutionText("");
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update task status");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>
            {isAdmin
              ? "Tasks & Issues Management Board"
              : isChairperson
              ? "Committee Tasks & Issues Board"
              : "Campus Tasks & Issues Directory"}
          </h1>
          <p className="subtitle">
            {isAdmin
              ? "Review and resolve tasks/issues raised by committee chairpersons. Mark them as done, in-progress, or pending."
              : isChairperson
              ? "Raise a task or issue for administration. Monitor whether your raised requests have been solved by the admin."
              : "Read-only view of tasks and issues raised by committee leadership across the college."}
          </p>
        </div>

        {/* ONLY Chairperson (or Admin) can raise a task */}
        {isChairperson && (
          <button className="primary-btn" onClick={() => setShowRaiseModal(true)}>
            + Raise a Task / Issue for Admin
          </button>
        )}
      </div>

      {actionMessage && <div className="hint">{actionMessage}</div>}

      {/* Status filter bar */}
      <div className="filter-toggle" style={{ marginBottom: "1.5rem" }}>
        {[
          { key: "all", label: "ALL" },
          { key: "pending", label: "PENDING" },
          { key: "in_progress", label: "IN PROGRESS" },
          { key: "completed", label: "SOLVED / DONE" },
        ].map((st) => (
          <button
            key={st.key}
            className={statusFilter === st.key ? "active" : ""}
            onClick={() => setStatusFilter(st.key)}
          >
            {st.label} ({tasks.filter((t) => (st.key === "all" ? true : t.status === st.key)).length})
          </button>
        ))}
      </div>

      {/* Raise Task Modal / Form for Chairperson */}
      {showRaiseModal && (
        <div className="card form-card" style={{ marginBottom: "2rem", border: "2px solid #4f46e5" }}>
          <h3>Raise a New Task or Issue for Administration</h3>
          <p className="subtitle">
            Submit a task, requirement, equipment request, or approval issue for the System Administrator to review and solve.
          </p>

          <form onSubmit={handleRaiseTask}>
            <label>Task / Issue Title</label>
            <input
              required
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Request 15 Arduino boards & Lab 2 access for Hackfest"
            />

            <label>Detailed Description & Justification</label>
            <textarea
              rows={4}
              required
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Explain the background, materials or assistance required from administration..."
            />

            <div className="form-row">
              <div>
                <label>Urgency Level</label>
                <select
                  value={newTask.urgency}
                  onChange={(e) => setNewTask({ ...newTask, urgency: e.target.value })}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical (Event / Competition Blocker)</option>
                </select>
              </div>

              <div>
                <label>Target Date / Needed By (optional)</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
              <button type="submit" className="primary-btn">Submit to Administration</button>
              <button type="button" className="btn-link" onClick={() => setShowRaiseModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task List */}
      {loading && <p>Loading tasks...</p>}

      {!loading && filteredTasks.length === 0 && (
        <div className="card empty-state">
          <p>No tasks or issues found for this filter.</p>
        </div>
      )}

      <div className="grid">
        {filteredTasks.map((t) => {
          const isDone = t.status === "completed";
          const isInProgress = t.status === "in_progress";

          return (
            <div
              key={t._id}
              className="card task-card"
              style={{
                borderLeft: `4px solid ${
                  isDone ? "#10b981" : isInProgress ? "#3b82f6" : "#f59e0b"
                }`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      className="badge"
                      style={{
                        position: "static",
                        background: isDone ? "#10b981" : isInProgress ? "#3b82f6" : "#f59e0b",
                      }}
                    >
                      {isDone ? "✓ SOLVED / DONE" : isInProgress ? "⚙️ IN PROGRESS" : "⏳ PENDING"}
                    </span>

                    {t.urgency && (
                      <span
                        className="tag"
                        style={{
                          background:
                            t.urgency === "critical"
                              ? "#fee2e2"
                              : t.urgency === "high"
                              ? "#ffedd5"
                              : "#f1f5f9",
                          color:
                            t.urgency === "critical"
                              ? "#991b1b"
                              : t.urgency === "high"
                              ? "#9a3412"
                              : "#475569",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {t.urgency}
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: "8px 0 4px" }}>{t.title}</h3>
                  {t.committee && (
                    <p className="subtitle" style={{ fontSize: "0.85rem", margin: 0 }}>
                      Committee: <strong>{t.committee.name}</strong>
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <button onClick={() => handleDeleteTask(t._id)} className="btn-small danger">
                    Delete
                  </button>
                )}
              </div>

              <p style={{ margin: "12px 0", color: "#334155", fontSize: "0.92rem", lineHeight: 1.5 }}>
                {t.description || "No description provided."}
              </p>

              <div style={{ fontSize: "0.83rem", color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                <span>✍️ Raised by: <strong>{t.assignedBy?.name || "Chairperson"}</strong> ({t.assignedBy?.role || "Chairperson"})</span>
                <br />
                <span>📅 Raised: {new Date(t.createdAt).toLocaleDateString()}</span>
                {t.dueDate && (
                  <span style={{ marginLeft: "10px" }}>
                    ⏰ Target: {new Date(t.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Admin Resolution Section */}
              {isDone && (
                <div style={{ marginTop: "12px", padding: "10px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                  <span style={{ color: "#166534", fontWeight: 700, fontSize: "0.85rem" }}>
                    ✅ Solved by Administration
                  </span>
                  {t.resolvedBy && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#15803d" }}>
                      Resolved by: {t.resolvedBy.name}
                    </p>
                  )}
                  {t.resolutionNotes && (
                    <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#166534" }}>
                      <strong>Notes:</strong> {t.resolutionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Status indicator for Chairperson / other roles */}
              {!isAdmin && (
                <div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "6px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}>
                  {isDone ? (
                    <span style={{ color: "#166534", fontWeight: 600 }}>
                      🎉 Solved by Administration
                    </span>
                  ) : isInProgress ? (
                    <span style={{ color: "#1d4ed8", fontWeight: 600 }}>
                      ⚙️ Administration is actively working on this task
                    </span>
                  ) : (
                    <span style={{ color: "#b45309", fontWeight: 600 }}>
                      ⏳ Pending Administration Action
                    </span>
                  )}
                </div>
              )}

              {/* Controls strictly for System Administrator */}
              {isAdmin && (
                <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                  <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                    ADMIN ACTIONS (Mark Status):
                  </span>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    {t.status !== "completed" ? (
                      <button
                        className="btn-small"
                        style={{ background: "#10b981", color: "white" }}
                        onClick={() => handleStatusChange(t._id, "completed")}
                      >
                        ✓ Mark as Solved (Done)
                      </button>
                    ) : (
                      <button
                        className="btn-small"
                        style={{ background: "#f59e0b", color: "white" }}
                        onClick={() => handleStatusChange(t._id, "pending")}
                      >
                        Re-open as Pending
                      </button>
                    )}

                    {t.status !== "in_progress" && (
                      <button
                        className="btn-small"
                        style={{ background: "#3b82f6", color: "white" }}
                        onClick={() => handleStatusChange(t._id, "in_progress")}
                      >
                        Mark In Progress
                      </button>
                    )}

                    {editingResolutionId !== t._id ? (
                      <button
                        className="btn-link"
                        style={{ fontSize: "0.82rem", color: "#4f46e5" }}
                        onClick={() => {
                          setEditingResolutionId(t._id);
                          setResolutionText(t.resolutionNotes || "");
                        }}
                      >
                        + Add Resolution Note
                      </button>
                    ) : (
                      <div style={{ width: "100%", marginTop: "8px" }}>
                        <input
                          placeholder="Type resolution notes..."
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          style={{ marginBottom: "6px", width: "100%" }}
                        />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn-small"
                            onClick={() => handleStatusChange(t._id, t.status)}
                          >
                            Save Note
                          </button>
                          <button
                            className="btn-small danger"
                            onClick={() => setEditingResolutionId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
