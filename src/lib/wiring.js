export const WIRING_RE =
  /exposed|bare|unsheath|not enclosed|broken wire|broken cable|frayed|cut cable|cut wire|damaged insulation|stripped|nicked|hanging wire|live conductor|open wiring/i;

export const WIRING_CLAUSE_RE =
  /conductor|enclos|wiring|sheath|insulation|isolator|live part|broken|frayed|electrical cover|§3\.3|§3\.7/i;

export function wiringSearchBoost(q) {
  const text = String(q || '').trim();
  if (!WIRING_RE.test(text)) return text;
  return `${text} exposed conductors enclosed wiring damaged insulation broken cable electrical SOP`;
}

export function pickCitedClause(blob, clauses) {
  const list = clauses || [];
  if (!list.length) return null;
  if (WIRING_RE.test(String(blob || ''))) {
    const hit = list.find((c) => WIRING_CLAUSE_RE.test(`${c.clauseRef || ''} ${c.content || ''}`));
    if (hit) return hit;
  }
  return list[0];
}
