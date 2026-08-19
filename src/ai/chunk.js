const MARK = /SOP\s*§\s*(\d+(?:\.\d+){0,3})\s+([^\n.]{3,80})/gi;

function tokenCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function splitOnMarkers(raw) {
  const text = String(raw).replace(/\r/g, '\n');
  const matches = [...text.matchAll(MARK)];
  if (matches.length < 3) return null;

  const chunks = [];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const block = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (block.length < 40) continue;
    chunks.push({
      clauseRef: `SOP §${matches[i][1]}`,
      content: block,
      tokenCount: tokenCount(block),
    });
  }
  return chunks;
}

function fallbackWindows(raw, size = 900, overlap = 120) {
  const text = raw.replace(/\s+/g, ' ').trim();
  const out = [];
  let i = 0;
  let n = 1;
  while (i < text.length) {
    const slice = text.slice(i, i + size);
    out.push({
      clauseRef: `SOP §auto.${n}`,
      content: slice,
      tokenCount: tokenCount(slice),
    });
    n += 1;
    i += size - overlap;
  }
  return out;
}

/** Split SOP text on numbered / § clause headings. */
export function chunkByClause(raw) {
  const marked = splitOnMarkers(raw);
  if (marked?.length) return marked;
  return fallbackWindows(raw);
}
