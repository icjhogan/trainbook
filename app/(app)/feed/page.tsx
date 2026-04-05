export default function FeedPage() {
  return (
    <div className="px-5 pt-14">
      <h1 className="text-xl font-semibold tracking-tight">entries</h1>
      <p className="text-sm text-[var(--color-muted)] mt-2">
        your training journal is empty.
        <br />
        tap + to add your first workout.
      </p>
    </div>
  );
}
