/* eslint-disable react/no-array-index-key -- blocks are re-derived from the text, never reordered */
import { Fragment, type ReactNode } from "react";

import Link from "next/link";

// A deliberately tiny markdown subset for assistant answers: **bold**, line
// breaks, `- ` bullet lists and [text](url) links. It only ever builds React
// elements, so model output can never inject HTML.
const INLINE = /\*\*(.+?)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

const renderLink = (label: string, href: string, key: string): ReactNode => {
  // "//host" and "/\\host" are protocol-relative in browsers: not internal links.
  if (href.startsWith("/") && !/^\/[/\\]/.test(href)) {
    return (
      <Link key={key} href={href} className="font-medium text-primary underline">
        {label}
      </Link>
    );
  }
  if (/^https?:\/\//i.test(href)) {
    return (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline"
      >
        {label}
      </a>
    );
  }
  // Any other scheme (javascript:, data:, mailto:…) is shown as plain text.
  return label;
};

const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index;
    if (index > last) nodes.push(text.slice(last, index));
    const key = `${keyPrefix}-${index}`;
    const [, bold, label, href] = match;
    if (bold !== undefined) {
      nodes.push(<strong key={key}>{renderInline(bold, key)}</strong>);
    } else if (label !== undefined && href !== undefined) {
      nodes.push(renderLink(label, href, key));
    }
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

type Block = { type: "list"; items: string[] } | { type: "text"; lines: string[] };

const toBlocks = (content: string): Block[] => {
  const blocks: Block[] = [];
  for (const line of content.replace(/\r\n/g, "\n").split("\n")) {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const previous = blocks.at(-1);
    if (bullet) {
      if (previous?.type === "list") previous.items.push(bullet[1]);
      else blocks.push({ type: "list", items: [bullet[1]] });
    } else if (!line.trim()) {
      blocks.push({ type: "text", lines: [] });
    } else if (previous?.type === "text" && previous.lines.length > 0) {
      previous.lines.push(line);
    } else {
      blocks.push({ type: "text", lines: [line] });
    }
  }
  return blocks.filter((block) => (block.type === "list" ? true : block.lines.length > 0));
};

const renderAssistantMarkdown = (content: string): ReactNode =>
  toBlocks(content).map((block, blockIndex) =>
    block.type === "list" ? (
      <ul key={blockIndex} className="my-1 list-disc space-y-0.5 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item, `${blockIndex}-${itemIndex}`)}</li>
        ))}
      </ul>
    ) : (
      <p key={blockIndex} className="my-1 first:mt-0 last:mb-0">
        {block.lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {renderInline(line, `${blockIndex}-${lineIndex}`)}
          </Fragment>
        ))}
      </p>
    ),
  );

export function AssistantMarkdown({ content }: { content: string }) {
  return <div className="break-words">{renderAssistantMarkdown(content)}</div>;
}
