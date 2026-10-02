import React from "react";

/**
 * Safely parse product description text into React nodes supporting:
 * - Bold: **text** or <b>text</b> or <strong>text</strong>
 * - Italic: *text* or <i>text</i> or <em>text</em>
 * - Exact line breaks and paragraph spacing (via CSS whitespace-pre-wrap)
 *
 * Strips dangerous HTML (script, iframe, style, attributes, etc.) without using dangerouslySetInnerHTML.
 */
export function renderFormattedProductDescription(rawText: string | null | undefined): React.ReactNode {
  if (!rawText) return null;

  // 1. Normalize Windows CRLF and CR to LF
  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Strip dangerous tags and content
  text = text.replace(/<(script|style|iframe|object|embed|applet)[^>]*?>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<(script|style|iframe|object|embed|img|svg|input|form|button)[^>]*?>/gi, "");

  // 3. Convert HTML line breaks / paragraphs if present
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n");
  text = text.replace(/<\/?p[^>]*>/gi, "");

  // 4. Tokenize and parse bold & italic
  return parseRichText(text);
}

/**
 * Tokenize text for bold formatting (**bold**, <b>bold</b>, <strong>bold</strong>)
 */
function parseRichText(text: string): React.ReactNode {
  const boldRegex = /(?:\*\*([^\s*][\s\S]*?)\*\*|<b>([\s\S]+?)<\/b>|<strong>([\s\S]+?)<\/strong>)/gi;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      const beforeText = text.substring(lastIndex, matchIndex);
      nodes.push(...parseItalics(beforeText, `b-${lastIndex}`));
    }

    const boldContent = match[1] ?? match[2] ?? match[3] ?? "";
    const innerNodes = parseItalics(boldContent, `bi-${matchIndex}`);
    nodes.push(
      <strong key={`bold-${matchIndex}`} className="font-bold text-foreground">
        {innerNodes}
      </strong>
    );

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    const afterText = text.substring(lastIndex);
    nodes.push(...parseItalics(afterText, `b-${lastIndex}`));
  }

  return nodes.length === 1 && typeof nodes[0] === "string" ? nodes[0] : nodes;
}

/**
 * Tokenize text for italic formatting (*italic*, <i>italic</i>, <em>italic</em>)
 * Avoids false-matching bullet points (e.g. "* Bullet point")
 */
function parseItalics(text: string, keyPrefix: string): React.ReactNode[] {
  // Italic regex: matches *word*, avoiding bullet points where * is followed by space and no closing * on same line
  const italicRegex = /(?:(?<=\s|^|[([{"'])\*([^\s*][^*\n]*?)\*(?=\s|$|[.,!?:;)\]}"'])|<i>([\s\S]+?)<\/i>|<em>([\s\S]+?)<\/em>)/gi;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = italicRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      nodes.push(text.substring(lastIndex, matchIndex));
    }

    const italicContent = match[1] ?? match[2] ?? match[3] ?? "";
    nodes.push(
      <em key={`${keyPrefix}-it-${matchIndex}`} className="italic text-foreground">
        {italicContent}
      </em>
    );

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

/**
 * Sanitize description text to allow only safe rich-text formatting tags (p, br, strong, b, em, i, u)
 * and strip all unsafe HTML elements (script, iframe, style, etc.) and tag attributes.
 */
export function sanitizeProductDescription(rawText: string | null | undefined): string {
  if (!rawText) return "";

  let clean = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  clean = clean.replace(/<(script|style|iframe|object|embed|applet)[^>]*?>[\s\S]*?<\/\1>/gi, "");
  // Strip dangerous standalone tags
  clean = clean.replace(/<(script|style|iframe|object|embed|img|svg|input|form|button)[^>]*?>/gi, "");
  // Strip all attributes from any tags e.g. <b onclick="..."> -> <b>
  clean = clean.replace(/<([a-z0-9]+)\s+[^>]*>/gi, "<$1>");

  return clean;
}

/**
 * Apply bold or italic formatting to a textarea selection or text with range.
 * Handles wrapping, unwrapping (toggle), and cursor placement.
 */
export function applyFormatting(
  targetOrText: HTMLTextAreaElement | { value: string; selectionStart?: number; selectionEnd?: number } | string,
  selectionOrFormat: { start: number; end: number } | "bold" | "italic",
  maybeFormat?: "bold" | "italic"
): {
  nextValue: string;
  selectionStart: number;
  selectionEnd: number;
  text: string;
  newSelection: { start: number; end: number };
} {
  let text = "";
  let start = 0;
  let end = 0;
  let format: "bold" | "italic";

  if (typeof targetOrText === "string") {
    text = targetOrText;
    const sel = selectionOrFormat as { start: number; end: number };
    start = sel?.start ?? 0;
    end = sel?.end ?? 0;
    format = maybeFormat as "bold" | "italic";
  } else {
    text = targetOrText.value ?? "";
    start = targetOrText.selectionStart ?? 0;
    end = targetOrText.selectionEnd ?? 0;
    format = selectionOrFormat as "bold" | "italic";
  }

  const delimiter = format === "bold" ? "**" : "*";
  const dLen = delimiter.length;
  const selectedText = text.substring(start, end);

  // 1. Check if current selection is already wrapped by delimiter in the surrounding text:
  const isWrapped =
    start >= dLen &&
    end + dLen <= text.length &&
    text.substring(start - dLen, start) === delimiter &&
    text.substring(end, end + dLen) === delimiter;

  if (isWrapped) {
    // Unwrap outer delimiters
    const nextValue =
      text.substring(0, start - dLen) +
      selectedText +
      text.substring(end + dLen);
    const nextStart = start - dLen;
    const nextEnd = end - dLen;
    return {
      nextValue,
      selectionStart: nextStart,
      selectionEnd: nextEnd,
      text: nextValue,
      newSelection: { start: nextStart, end: nextEnd },
    };
  }

  // 2. Check if selectedText itself starts and ends with delimiter:
  if (
    selectedText.length >= dLen * 2 &&
    selectedText.startsWith(delimiter) &&
    selectedText.endsWith(delimiter)
  ) {
    const unwrapped = selectedText.substring(dLen, selectedText.length - dLen);
    const nextValue = text.substring(0, start) + unwrapped + text.substring(end);
    const nextStart = start;
    const nextEnd = start + unwrapped.length;
    return {
      nextValue,
      selectionStart: nextStart,
      selectionEnd: nextEnd,
      text: nextValue,
      newSelection: { start: nextStart, end: nextEnd },
    };
  }

  // 3. Wrap selection or insert empty delimiters for inline typing
  const content = selectedText;
  const nextValue =
    text.substring(0, start) +
    delimiter +
    content +
    delimiter +
    text.substring(end);

  const newStart = start + dLen;
  const newEnd = content ? newStart + content.length : newStart;

  return {
    nextValue,
    selectionStart: newStart,
    selectionEnd: newEnd,
    text: nextValue,
    newSelection: { start: newStart, end: newEnd },
  };
}
