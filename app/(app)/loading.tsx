// Squelette affiché INSTANTANÉMENT à chaque navigation (frontière Suspense).
// Sans ce fichier, le routeur attend toute la réponse serveur avant d'afficher
// la page → impression de lenteur / d'écran figé au clic.
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-2 h-7 w-56 rounded-lg bg-black/[0.06]" />
      <div className="mb-6 h-4 w-80 max-w-full rounded bg-black/[0.05]" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-black/[0.05]" />
        ))}
      </div>
      <div className="space-y-4">
        <div className="h-36 rounded-xl bg-black/[0.05]" />
        <div className="h-36 rounded-xl bg-black/[0.05]" />
      </div>
    </div>
  );
}
