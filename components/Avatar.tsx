export default function Avatar({
  initials,
  size = 40,
  ring = false,
}: {
  initials: string;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-black/[0.06] font-semibold text-ink ${
        ring ? 'ring-2 ring-white' : ''
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
