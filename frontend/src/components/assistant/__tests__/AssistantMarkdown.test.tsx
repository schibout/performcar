import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssistantMarkdown } from "../AssistantMarkdown";

const renderMd = (content: string) => render(<AssistantMarkdown content={content} />).container;

describe("AssistantMarkdown", () => {
  it("renders bold text and line breaks", () => {
    const container = renderMd("Bonjour **Paul**\nligne 2");
    expect(container.querySelector("strong")?.textContent).toBe("Paul");
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("groups dash lines into a bullet list and splits paragraphs on blank lines", () => {
    const container = renderMd("Intro\n\n- un\n- **deux**\n\nFin");
    const items = container.querySelectorAll("ul > li");
    expect(Array.from(items).map((item) => item.textContent)).toEqual(["un", "deux"]);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("renders relative links in-app and absolute links in a new tab", () => {
    renderMd("Voir [vos devis](/fr/quotes) ou [le site](https://example.com).");
    const internal = screen.getByRole("link", { name: "vos devis" });
    expect(internal.getAttribute("href")).toBe("/fr/quotes");
    expect(internal.getAttribute("target")).toBeNull();
    const external = screen.getByRole("link", { name: "le site" });
    expect(external.getAttribute("target")).toBe("_blank");
    expect(external.getAttribute("rel")).toContain("noopener");
  });

  it("never renders unsafe links or raw HTML", () => {
    const container = renderMd(
      "[clic](javascript:alert(1)) [proto](//evil.example) [bs](/\\evil.example) <img src=x onerror=alert(1)>",
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
