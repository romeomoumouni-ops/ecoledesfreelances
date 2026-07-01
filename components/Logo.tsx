export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 leading-none">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
          <path d="M7 11v4.2c0 .9 2.2 2.3 5 2.3s5-1.4 5-2.3V11" />
          <path d="M21 8.5V14" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col">
          <span className="text-[15px] font-bold tracking-tight text-ink leading-tight">
            L&apos;École des
          </span>
          <span className="text-[15px] font-bold tracking-tight text-muted leading-tight">
            Freelances
          </span>
        </span>
      )}
    </span>
  );
}
