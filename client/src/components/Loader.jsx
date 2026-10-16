// Centered spinner used while we wait for data (e.g. checking if the user is logged in)
export default function Loader({ text = "Loading..." }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3" role="status">
      <div className="size-9 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}
