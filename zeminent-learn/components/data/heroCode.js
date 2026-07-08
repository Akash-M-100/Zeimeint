export const HERO_CODE = `export function Hero() {
  return (
    <Section>
      <Pill>cohort 04 · jan 12</Pill>
      <Heading>
        Ship engineers,
        not graduates.
      </Heading>
      <Button intent="primary">
        Enroll
      </Button>
    </Section>
  );
}`;

export function colorize(line) {
  const parts = [];
  let i = 0;
  const tokens = [
    { re: /^(export|function|return)\b/, color: "#818cf8" },
    { re: /^("[^"]*")/, color: "#f5b86b" },
    { re: /^(<\/?[A-Za-z]+)/, color: "#5eead4" },
    { re: /^(>)/, color: "#5eead4" },
    { re: /^([{}()=,;])/, color: "#6b7280" },
    { re: /^([A-Za-z_][\w]*)/, color: "#e8ecef" },
    { re: /^(\s+)/, color: "#e8ecef" },
    { re: /^(\.)/, color: "#6b7280" },
    { re: /^(.)/, color: "#e8ecef" },
  ];
  while (i < line.length) {
    const rest = line.slice(i);
    let matched = false;
    for (const t of tokens) {
      const m = rest.match(t.re);
      if (m) {
        parts.push({ text: m[1], color: t.color });
        i += m[1].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      parts.push({ text: rest[0], color: "#e8ecef" });
      i += 1;
    }
  }
  return parts;
}
