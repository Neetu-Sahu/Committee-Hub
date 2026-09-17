/**
 * Simple, transparent tag-overlap recommendation scorer.
 * No external ML needed - just weighted Jaccard-style overlap between
 * a user's interests/skills and a committee's tags/category.
 *
 * Score contributions:
 *  - +2 for each interest tag that matches a committee tag
 *  - +1 for each skill tag that matches a committee tag
 *  - +1 if the committee's category itself matches an interest tag
 */
function computeMatchScore(user, committee) {
  const interests = new Set((user.interests || []).map((t) => t.toLowerCase()));
  const skills = new Set((user.skills || []).map((t) => t.toLowerCase()));
  const tags = (committee.tags || []).map((t) => t.toLowerCase());

  let score = 0;
  for (const tag of tags) {
    if (interests.has(tag)) score += 2;
    if (skills.has(tag)) score += 1;
  }
  if (interests.has((committee.category || "").toLowerCase())) score += 1;

  return score;
}

function rankCommitteesForUser(user, committees) {
  return committees
    .map((c) => ({
      committee: c,
      score: computeMatchScore(user, c),
    }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { computeMatchScore, rankCommitteesForUser };
