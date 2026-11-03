// Letters and digits drawn as SVG strokes, for decorations that look like text (monogram
// initials, oversized section numbers). They're paths, not <text>, so a PDF never contains
// them as text: an ATS never reads a stray "PR" or "01".
// Each glyph is a monoline drawing on a 10 × 14 grid (cap height 14, baseline at y = 14).

const GLYPHS = {
  A: "M0.5 14 L5 0 L9.5 14 M2.3 8.6 H7.7",
  B: "M1 0 V14 M1 0 H5.5 C8.6 0 8.6 6.8 5.5 6.8 H1 M5.5 6.8 C9.6 6.8 9.6 14 5.5 14 H1",
  C: "M9.3 2.2 C8.2 0.8 6.8 0 5.3 0 C2.3 0 0.5 3 0.5 7 C0.5 11 2.3 14 5.3 14 C6.8 14 8.2 13.2 9.3 11.8",
  D: "M1 0 V14 H4.3 C7.8 14 9.5 11 9.5 7 C9.5 3 7.8 0 4.3 0 Z",
  E: "M9 0 H1 V14 H9 M1 6.8 H7.2",
  F: "M9 0 H1 V14 M1 6.8 H7.2",
  G: "M9.3 2.2 C8.2 0.8 6.8 0 5.3 0 C2.3 0 0.5 3 0.5 7 C0.5 11 2.3 14 5.3 14 C7.5 14 9.5 12.6 9.5 10 V7.6 H5.8",
  H: "M1 0 V14 M9 0 V14 M1 6.8 H9",
  I: "M5 0 V14 M3 0 H7 M3 14 H7",
  J: "M8 0 V9.8 C8 12.4 6.6 14 4.5 14 C2.5 14 1 12.6 1 10.4",
  K: "M1 0 V14 M9.2 0 L1 8.6 M4 5.5 L9.5 14",
  L: "M1 0 V14 H9",
  M: "M0.5 14 V0 L5 9 L9.5 0 V14",
  N: "M1 14 V0 L9 14 V0",
  O: "M5 0 C2.2 0 0.5 3 0.5 7 C0.5 11 2.2 14 5 14 C7.8 14 9.5 11 9.5 7 C9.5 3 7.8 0 5 0 Z",
  P: "M1 14 V0 H5.6 C9.2 0 9.2 7.4 5.6 7.4 H1",
  Q: "M5 0 C2.2 0 0.5 3 0.5 7 C0.5 11 2.2 14 5 14 C7.8 14 9.5 11 9.5 7 C9.5 3 7.8 0 5 0 Z M6 10.2 L9.8 14.6",
  R: "M1 14 V0 H5.6 C9.2 0 9.2 7.4 5.6 7.4 H1 M5.4 7.4 L9.4 14",
  S: "M8.9 2 C8 0.7 6.6 0 5 0 C2.6 0 1 1.4 1 3.5 C1 8.2 9.1 5.9 9.1 10.5 C9.1 12.6 7.4 14 5 14 C3.1 14 1.6 13.2 0.7 11.9",
  T: "M0.3 0 H9.7 M5 0 V14",
  U: "M1 0 V9.5 C1 12.3 2.8 14 5 14 C7.2 14 9 12.3 9 9.5 V0",
  V: "M0.3 0 L5 14 L9.7 0",
  W: "M0 0 L2.4 14 L5 4.2 L7.6 14 L10 0",
  X: "M0.6 0 L9.4 14 M9.4 0 L0.6 14",
  Y: "M0.3 0 L5 7.2 L9.7 0 M5 7.2 V14",
  Z: "M0.8 0 H9.2 L0.8 14 H9.2",
  0: "M5 0 C2.4 0 1 3 1 7 C1 11 2.4 14 5 14 C7.6 14 9 11 9 7 C9 3 7.6 0 5 0 Z",
  1: "M2.4 3 L5.8 0 V14",
  2: "M1.2 3.6 C1.2 1.5 2.9 0 5 0 C7.2 0 8.9 1.5 8.9 3.7 C8.9 6.5 6.4 8.2 1 14 H9.3",
  3: "M1 1.6 C1.9 0.6 3.4 0 5 0 C7.2 0 8.7 1.4 8.7 3.5 C8.7 5.6 7 6.9 4.6 6.9 C7.4 6.9 9.1 8.4 9.1 10.5 C9.1 12.6 7.4 14 5 14 C3.2 14 1.7 13.4 0.8 12.4",
  4: "M7 14 V0 L0.6 9.8 H9.4",
  5: "M8.4 0 H2.1 L1.4 6.2 C2.4 5.5 3.6 5.1 5 5.1 C7.5 5.1 9.1 6.9 9.1 9.5 C9.1 12.2 7.3 14 4.8 14 C3 14 1.6 13.3 0.8 12.2",
  6: "M8 1 C7.2 0.3 6.2 0 5.2 0 C2.6 0 1 2.6 1 7.4 C1 11.6 2.6 14 5.1 14 C7.4 14 9 12.3 9 9.8 C9 7.3 7.4 5.7 5.1 5.7 C3.4 5.7 1.8 6.8 1.1 8.4",
  7: "M0.6 0 H9.4 L3.6 14",
  8: "M5 6.8 C2.7 6.8 1.4 5.5 1.4 3.4 C1.4 1.4 2.9 0 5 0 C7.1 0 8.6 1.4 8.6 3.4 C8.6 5.5 7.3 6.8 5 6.8 Z M5 6.8 C7.5 6.8 9.1 8.3 9.1 10.4 C9.1 12.6 7.4 14 5 14 C2.6 14 0.9 12.6 0.9 10.4 C0.9 8.3 2.5 6.8 5 6.8 Z",
  9: "M2 13 C2.8 13.7 3.8 14 4.8 14 C7.4 14 9 11.4 9 6.6 C9 2.4 7.4 0 4.9 0 C2.6 0 1 1.7 1 4.2 C1 6.7 2.6 8.3 4.9 8.3 C6.6 8.3 8.2 7.2 8.9 5.6",
};

const GLYPH_WIDTH = 10;
const GLYPH_HEIGHT = 14;
const TRACK = 3; // Space between glyphs, in grid units

// The characters of `text` that can be drawn (others are skipped)
const drawable = (text) => [...text.toUpperCase()].filter((char) => GLYPHS[char]).join("");

// Draws `text` (A-Z, 0-9) as strokes.
//   height - cap height as a CSS length; the width follows
//   weight - stroke width in grid units (a cap height is 14)
export function DrawnText({ text, height = "24pt", weight = 1, className = "", style }) {
  const chars = [...drawable(text)];
  if (chars.length === 0) return null;
  const pad = weight / 2; // So strokes at the edges aren't clipped
  const width = chars.length * GLYPH_WIDTH + (chars.length - 1) * TRACK;

  return (
    <svg
      className={`block shrink-0 ${className}`}
      style={{ height, width: `calc(${height} * ${(width + weight) / (GLYPH_HEIGHT + weight)})`, ...style }}
      viewBox={`${-pad} ${-pad} ${width + weight} ${GLYPH_HEIGHT + weight}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {chars.map((char, index) => (
        <path key={index} d={GLYPHS[char]} transform={`translate(${index * (GLYPH_WIDTH + TRACK)} 0)`} />
      ))}
    </svg>
  );
}
