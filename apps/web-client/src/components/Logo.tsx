export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight text-navy ${className ?? ''}`}>
      Banderoli<span className="text-brand">.AI</span>
    </span>
  );
}
