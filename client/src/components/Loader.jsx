// Centered spinner used while we wait for data (e.g. checking if the user is logged in)
export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-32" role="status">
      <div className="size-8 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-hidden="true" />
      <p className="type-small text-fg-muted">{text}</p>
    </div>
  );
}
