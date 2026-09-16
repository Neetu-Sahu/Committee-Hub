import { useEffect, useState } from "react";
import api from "../api/axios";
import CommitteeCard from "../components/CommitteeCard";

const CATEGORIES = [
  "technical", "cultural", "sports", "literary", "social",
  "research", "placement", "anti-ragging", "other",
];

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCommittees = () => {
    setLoading(true);
    api
      .get("/committees", { params: { category: category || undefined, search: search || undefined } })
      .then((res) => setCommittees(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCommittees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCommittees();
  };

  const recommended = committees.filter((c) => c.recommended);
  const others = committees.filter((c) => !c.recommended);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Committee Directory</h1>
      </div>

      <form className="search-row" onSubmit={handleSearch}>
        <input
          placeholder="Search committees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      {loading && <p>Loading committees...</p>}

      {!loading && recommended.length > 0 && (
        <section className="section">
          <h2>Recommended For You</h2>
          <p className="subtitle">Based on the interests you shared during onboarding.</p>
          <div className="grid">
            {recommended.map((c) => (
              <CommitteeCard key={c._id} committee={c} />
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <h2>All Committees</h2>
        <div className="grid">
          {others.map((c) => (
            <CommitteeCard key={c._id} committee={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
