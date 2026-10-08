import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { MerryGoRoundIllustration } from "@/components/illustrations/merry-go-round";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Payments are processed by PayPal. Unitus never sees your card or bank details.
        </p>
      </div>
      <aside className="relative hidden overflow-hidden bg-band p-12 text-band-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto w-full max-w-md rounded-full bg-background/95 p-4 shadow-2xl">
          <MerryGoRoundIllustration className="w-full" idPrefix="auth" />
        </div>
        <blockquote className="relative max-w-md">
          <p className="font-heading text-2xl leading-snug">
            &ldquo;Our family is spread over four countries, but every first of the month we&apos;re one chama
            again.&rdquo;
          </p>
          <footer className="mt-4 text-sm text-band-foreground/70">Demo testimonial · Umoja Diaspora Chama</footer>
        </blockquote>
      </aside>
    </div>
  );
}
