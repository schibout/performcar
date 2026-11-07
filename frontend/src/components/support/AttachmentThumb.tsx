"use client";

import { useState } from "react";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface AttachmentThumbProps {
  url: string;
  filename: string | null;
}

// Attachment files are served from Cloudinary. The backend is the trust
// boundary, but as defense-in-depth we refuse to turn any other origin — or a
// `javascript:`/`data:` URL from a tampered record — into a clickable link.
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

// A single message-attachment preview. `next/image` renders nothing until the
// Cloudinary bytes arrive, so we hold a `loaded` flag and show a pulsing
// skeleton box meanwhile, then fade the image in. On error we still clear the
// skeleton so the browser's broken-image glyph isn't masked behind it.
export function AttachmentThumb({ url, filename }: AttachmentThumbProps) {
  const [loaded, setLoaded] = useState(false);

  const settle = () => {
    setLoaded(true);
  };

  const isTrusted = url.startsWith(CLOUDINARY_PREFIX);

  const thumb = (
    <span
      className={cn(
        "block h-20 w-20 overflow-hidden rounded-lg",
        !loaded && "animate-pulse bg-muted",
      )}
    >
      <Image
        src={url}
        alt={filename ?? ""}
        width={80}
        height={80}
        className={cn(
          "h-20 w-20 rounded-lg object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={settle}
        onError={settle}
      />
    </span>
  );

  // Only an untampered Cloudinary URL becomes a clickable external link (plain
  // <a>, not next/link, since it opens a remote file in a new tab). Anything
  // else renders as a non-navigable preview so a hostile href can never fire.
  return isTrusted ? (
    <a href={url} target="_blank" rel="noreferrer">
      {thumb}
    </a>
  ) : (
    thumb
  );
}
