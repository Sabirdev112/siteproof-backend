const HEADING =
  /^(?:SOP\s*)?(?:§\s*)?(\d+(?:\.\d+){0,3})(?:\s*[:.)-]\s*|\s+)(.+)$/i;

function tokenCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function flush(chunks, current) {
  const content = current.body.join(' ').replace(/\s+/g, ' ').trim();
  if (!content) return;
  chunks.push({
    clauseRef: current.ref,
    content: current.title ? `${current.title}. ${content}` : content,
    tokenCount: tokenCount(content),
  });
}

/** Split SOP text on numbered / § clause headings. */
export function chunkByClause(raw) {
  const lines = String(raw)
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const chunks = [];
  let current = { ref: 'SOP §0', title: '', body: [] };

  for (const line of lines) {
    const match = line.match(HEADING);
    if (match && Number(match[1].split('.')[0]) >= 1) {
      flush(chunks, current);
      current = {
        ref: `SOP §${match[1]}`,
        title: match[2].replace(/\.$/, '').trim(),
        body: [],
      };
      continue;
    }
    current.body.push(line);
  }
  flush(chunks, current);

  if (chunks.length <= 1 && raw.trim().length > 400) {
    return fallbackWindows(raw);
  }
  return chunks.filter((c) => c.content.length > 40);
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
