// The user's avatar: their photo (Settings > Profile), else their initials in a circle.
// Decorative: the name is always written next to it.
//   size - "md" (32px: the top bar), "lg" (40px: the account menu), "xl" (80px: Settings)
const SIZES = { md: "size-8 type-small", lg: "size-10 type-label", xl: "size-20 text-2xl" };

const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function Avatar({ user, size = "md", src }) {
  const url = src ?? user?.avatarUrl;
  if (url) return <img src={url} alt="" className={`${SIZES[size]} shrink-0 rounded-full object-cover ring-1 ring-line`} />;
  return (
    <span aria-hidden="true" className={`grid ${SIZES[size]} shrink-0 place-items-center rounded-full border border-line bg-surface-2 font-semibold text-fg`}>
      {initialsOf(user?.name) || "?"}
    </span>
  );
}
