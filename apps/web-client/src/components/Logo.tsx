export function Logo({ className }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight text-brand ${className ?? ''}`}>
      Banderoli<span className="text-accent">.AI</span>
    </span>
  );
}
