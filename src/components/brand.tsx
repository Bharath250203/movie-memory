import { Clapperboard } from "lucide-react";
import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Movie Memory home">
      <span className="brand-icon">
        <Clapperboard size={22} />
      </span>
      movie<span className="brand-light">memory</span>
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <span>A little more movie magic.</span>
      <span>
        MADE FOR THE LOVE OF FILM <span aria-hidden="true">✳</span>
      </span>
    </footer>
  );
}
