export default function Avatar({
  initials,
  src,
  size = 40,
  ring = false,
}: {
  initials: string;
  src?: string | null;
  color?: string;
  size?: number;
  ring?: boolean;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className={`shrink-0 rounded-full object-cover ${ring ? 'ring-2 ring-white' : ''}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full bg-black/[0.06] font-semibold text-ink ${
        ring ? 'ring-2 ring-white' : ''
      }`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
