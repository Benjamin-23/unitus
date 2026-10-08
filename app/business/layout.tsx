import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function BusinessLayout({ children }: LayoutProps<"/business">) {
  return (
    <div className="flex min-h-svh flex-col bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="secondary" className="h-6 px-2.5">For business</Badge>
          </div>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
