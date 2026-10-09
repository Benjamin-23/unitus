"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, LinkIcon, MessageCircleIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Invite code + share link for a chama. Rendered only in the browser (after creating). */
export function ShareInvite({ code, chamaName }: { code: string; chamaName: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = `${window.location.origin}/join/${code}`;
  const message = `Join our chama "${chamaName}" on Unitus. Open ${link} or use invite code ${code}.`;
  const canShare = typeof navigator.share === "function";

  async function copy(what: "code" | "link") {
    await navigator.clipboard?.writeText(what === "code" ? code : link);
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-secondary/40 py-3 pr-2 pl-5">
        <span className="font-mono text-2xl font-semibold tracking-widest">{code}</span>
        <Button variant="ghost" size="icon" aria-label="Copy invite code" onClick={() => copy("code")}>
          {copied === "code" ? <CheckIcon className="text-primary" /> : <CopyIcon />}
        </Button>
      </div>

      <div className="flex w-full max-w-md gap-2">
        <div className="relative flex-1">
          <LinkIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input readOnly value={link} aria-label="Invite link" className="h-10 pl-9 text-sm" onFocus={(e) => e.currentTarget.select()} />
        </div>
        <Button variant="outline" className="h-10" onClick={() => copy("link")}>
          {copied === "link" ? <CheckIcon className="text-primary" /> : <CopyIcon />}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#25d366] px-4 text-sm font-semibold text-[#06301a] hover:brightness-95"
        >
          <MessageCircleIcon className="size-4" /> Share on WhatsApp
        </a>
        {canShare && (
          <Button variant="outline" className="h-10" onClick={() => navigator.share({ title: chamaName, text: message, url: link }).catch(() => {})}>
            <Share2Icon /> More options
          </Button>
        )}
      </div>
    </div>
  );
}
