const units = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function addDuration(from, spec) {
  const match = /^(\d+)(s|m|h|d)$/.exec(spec);
  if (!match) throw new Error(`Invalid duration ${spec}`);
  return new Date(from.getTime() + Number(match[1]) * units[match[2]]);
}
