/**
 * Highlight Text Component Tests
 *
 * Story 3.2: Session Search & Filtering
 * AC #2 (search result highlighting)
 * Task 6: Text highlighting
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HighlightText } from "../highlight-text";

describe("HighlightText", () => {
  it("renders text without highlights when ranges is empty", () => {
    render(<HighlightText ranges={[]} text="Hello World" />);

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.queryByRole("mark")).not.toBeInTheDocument();
  });

  it("highlights a single match", () => {
    render(
      <HighlightText ranges={[{ start: 0, end: 5 }]} text="Hello World" />
    );

    const mark = screen.getByText("Hello");
    expect(mark.tagName).toBe("MARK");
    expect(screen.getByText("World")).toBeInTheDocument();
  });

  it("highlights multiple matches", () => {
    render(
      <HighlightText
        ranges={[
          { start: 0, end: 5 },
          { start: 6, end: 11 },
        ]}
        text="Hello World"
      />
    );

    const marks = screen.getAllByRole("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveTextContent("Hello");
    expect(marks[1]).toHaveTextContent("World");
  });

  it("handles highlight at end of text", () => {
    render(
      <HighlightText ranges={[{ start: 6, end: 11 }]} text="Hello World" />
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    const mark = screen.getByText("World");
    expect(mark.tagName).toBe("MARK");
  });

  it("handles highlight in middle of text", () => {
    render(
      <HighlightText ranges={[{ start: 2, end: 5 }]} text="Hello World" />
    );

    expect(screen.getByText("He")).toBeInTheDocument();
    const mark = screen.getByText("llo");
    expect(mark.tagName).toBe("MARK");
    // The remaining text includes leading space
    expect(
      screen.getByText((_, element) => {
        return element?.textContent === " World";
      })
    ).toBeInTheDocument();
  });

  it("applies correct styling classes to mark elements", () => {
    render(
      <HighlightText ranges={[{ start: 0, end: 5 }]} text="Hello World" />
    );

    const mark = screen.getByRole("mark");
    expect(mark).toHaveClass("bg-yellow-200");
    expect(mark).toHaveClass("dark:bg-yellow-800");
    expect(mark).toHaveClass("rounded");
    expect(mark).toHaveClass("px-0.5");
  });

  it("handles adjacent ranges without overlap", () => {
    render(
      <HighlightText
        ranges={[
          { start: 0, end: 3 },
          { start: 3, end: 6 },
        ]}
        text="HelloWorld"
      />
    );

    const marks = screen.getAllByRole("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveTextContent("Hel");
    expect(marks[1]).toHaveTextContent("loW");
  });

  it("handles empty text", () => {
    const { container } = render(<HighlightText ranges={[]} text="" />);

    expect(container.textContent).toBe("");
  });

  it("handles text with no unhighlighted portions", () => {
    render(<HighlightText ranges={[{ start: 0, end: 5 }]} text="Hello" />);

    const mark = screen.getByRole("mark");
    expect(mark).toHaveTextContent("Hello");
    // Only one text node - the mark
    const element = screen.queryByText("Hello");
    expect(element?.parentElement?.childNodes).toHaveLength(1);
  });
});
