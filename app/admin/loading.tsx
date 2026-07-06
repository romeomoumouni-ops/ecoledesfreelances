// Squelette de chargement instantané pour l'espace admin (frontière Suspense).
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-2 h-6 w-52 rounded-lg bg-black/[0.06]" />
      <div className="mb-6 h-4 w-72 max-w-full rounded bg-black/[0.05]" />
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-black/[0.05]" />
        ))}
      </div>
    </div>
  );
}
