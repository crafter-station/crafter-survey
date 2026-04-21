import Link from "next/link";

const adminLinks = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/responses", label: "Responses" },
  { href: "/admin/exports", label: "Exports" },
];

export function AdminNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {adminLinks.map((link) => {
        const active = currentPath.startsWith(link.href);

        return (
          <Link
            className={[
              "inline-flex rounded-full border px-4 py-2 text-sm transition-colors",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background hover:border-foreground/30 hover:bg-accent/60",
            ].join(" ")}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
