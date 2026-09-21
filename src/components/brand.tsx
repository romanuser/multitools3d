import { Icon } from "./icons";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-amber text-on-accent shrink-0"
      style={{ width: size, height: size }}
    >
      <Icon name="layers" size={Math.round(size * 0.64)} strokeWidth={2} />
    </span>
  );
}

export function Brand({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <BrandMark size={size} />
      <span className="font-display font-semibold tracking-tight text-ink">Multiferramenta 3D</span>
    </span>
  );
}
