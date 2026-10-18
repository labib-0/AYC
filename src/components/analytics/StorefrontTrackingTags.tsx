import React from "react";

interface SnippetElement {
  tagName: string;
  props: Record<string, string | boolean>;
  content: string;
}

/**
 * Parses raw HTML string into individual DOM element structures.
 * Supports standard Google Tag (<script>, <noscript>, <meta>, <link>) tags
 * and arbitrary attributes while preserving content and tag order.
 */
function parseSnippetTags(html?: string | null): SnippetElement[] {
  if (!html || typeof html !== "string") return [];
  const trimmed = html.trim();
  if (!trimmed) return [];

  // Regex matching both self-closing (<tag ... />) and paired (<tag ...>...</tag>) elements
  const tagRegex =
    /<([a-z0-9_-]+)((?:\s+[^>"'=]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(?:\/>|>([\s\S]*?)<\/\1>)/gi;
  const elements: SnippetElement[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(trimmed)) !== null) {
    const tagName = match[1].toLowerCase();
    const rawAttrs = match[2] || "";
    const content = match[3] || "";

    // Parse element attributes
    const attrRegex = /([a-z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
    let attrMatch: RegExpExecArray | null;
    const props: Record<string, string | boolean> = {};

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1];
      const attrVal =
        attrMatch[2] !== undefined
          ? attrMatch[2]
          : attrMatch[3] !== undefined
          ? attrMatch[3]
          : attrMatch[4] !== undefined
          ? attrMatch[4]
          : true;
      props[attrName] = attrVal;
    }

    elements.push({ tagName, props, content });
  }

  return elements;
}

/**
 * StorefrontHeadTracking — Server-rendered tracking tags inserted into the storefront <head>.
 *
 * Requirements met:
 * 1. Renders directly in the document <head>.
 * 2. Preserves script execution order.
 * 3. Supports complete Google tag (gtag.js), Google Analytics 4, Google Tag Manager head code.
 * 4. Tolerates raw JS input if administrator enters code without outer <script> wrappers.
 * 5. Returns null if snippet is empty, producing zero injected HTML.
 */
export function StorefrontHeadTracking({ snippet }: { snippet?: string | null }) {
  if (!snippet || !snippet.trim()) {
    return null;
  }

  const elements = parseSnippetTags(snippet);

  // If tags were parsed, render them preserving exact order
  if (elements.length > 0) {
    return (
      <>
        {elements.map((el, idx) => {
          const key = `ayaanc-head-tag-${idx}`;

          if (el.tagName === "script") {
            const scriptProps: Record<string, string | boolean | { __html: string } | undefined> = {};

            if (el.props.src) scriptProps.src = el.props.src;
            if (el.props.async !== undefined) {
              scriptProps.async =
                el.props.async === true || el.props.async === "true" || el.props.async === "";
            }
            if (el.props.defer !== undefined) {
              scriptProps.defer =
                el.props.defer === true || el.props.defer === "true" || el.props.defer === "";
            }
            if (el.props.id) scriptProps.id = el.props.id;
            if (el.props.type) scriptProps.type = el.props.type;
            if (el.props.crossorigin || el.props.crossOrigin) {
              scriptProps.crossOrigin = (el.props.crossorigin || el.props.crossOrigin) as string;
            }
            if (el.props.nonce) scriptProps.nonce = el.props.nonce as string;

            // Preserve data-* attributes
            Object.keys(el.props).forEach((k) => {
              if (k.startsWith("data-")) {
                scriptProps[k] = el.props[k];
              }
            });

            if (el.content && el.content.trim()) {
              scriptProps.dangerouslySetInnerHTML = { __html: el.content };
            }

            return <script key={key} {...scriptProps} />;
          }

          if (el.tagName === "noscript") {
            return (
              <noscript
                key={key}
                dangerouslySetInnerHTML={{ __html: el.content }}
              />
            );
          }

          if (el.tagName === "meta") {
            return <meta key={key} {...el.props} />;
          }

          if (el.tagName === "link") {
            return <link key={key} {...el.props} />;
          }

          // Fallback generic tag
          return null;
        })}
      </>
    );
  }

  // Fallback: If no standard HTML tags found but snippet is non-empty,
  // treat as raw inline JavaScript (e.g. user pasted raw script without <script> wrapper)
  return (
    <script
      key="ayaanc-head-raw-script"
      dangerouslySetInnerHTML={{ __html: snippet.trim() }}
    />
  );
}

/**
 * StorefrontBodyTracking — Server-rendered tracking tags inserted immediately after <body>.
 *
 * Requirements met:
 * 1. Placed at the very top of <body>.
 * 2. Supports standard Google Tag Manager <noscript><iframe ...></iframe></noscript> fallback markup.
 * 3. Does not break React hydration or document hierarchy.
 * 4. Returns null if snippet is empty, producing zero injected HTML.
 */
export function StorefrontBodyTracking({ snippet }: { snippet?: string | null }) {
  if (!snippet || !snippet.trim()) {
    return null;
  }

  const elements = parseSnippetTags(snippet);

  // If noscript or other tags were parsed, render them
  if (elements.length > 0) {
    return (
      <>
        {elements.map((el, idx) => {
          const key = `ayaanc-body-tag-${idx}`;

          if (el.tagName === "noscript") {
            return (
              <noscript
                key={key}
                dangerouslySetInnerHTML={{ __html: el.content }}
              />
            );
          }

          if (el.tagName === "script") {
            const scriptProps: Record<string, string | boolean | { __html: string } | undefined> = {};
            if (el.props.src) scriptProps.src = el.props.src;
            if (el.props.async !== undefined) scriptProps.async = true;
            if (el.props.defer !== undefined) scriptProps.defer = true;
            if (el.content && el.content.trim()) {
              scriptProps.dangerouslySetInnerHTML = { __html: el.content };
            }
            return <script key={key} {...scriptProps} />;
          }

          // For iframe or other directly pasted elements inside body snippet,
          // wrap in noscript to guarantee non-disruptive fallback behavior
          return (
            <noscript
              key={key}
              dangerouslySetInnerHTML={{
                __html: `<${el.tagName}>${el.content}</${el.tagName}>`,
              }}
            />
          );
        })}
      </>
    );
  }

  // Fallback: Wrap raw HTML in <noscript> to support GTM fallback iframe markup
  return (
    <noscript
      key="ayaanc-body-raw-noscript"
      dangerouslySetInnerHTML={{ __html: snippet.trim() }}
    />
  );
}
