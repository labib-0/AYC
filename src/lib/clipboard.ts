/**
 * Robust Cross-Browser Clipboard Utility
 *
 * Copies clean text to the system clipboard across modern and legacy browsers,
 * handling secure context requirements, permission failures, and iframe environments gracefully.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== "string") {
    return false;
  }

  // 1. Try Modern Async Clipboard API (supported in secure HTTPS or localhost contexts)
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy execCommand fallback if permission rejected or document unfocused
    }
  }

  // 2. Legacy textarea fallback with document.execCommand('copy')
  if (typeof document !== "undefined" && document.body) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "1px";
      textArea.style.height = "1px";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.style.opacity = "0";
      textArea.setAttribute("readonly", "");

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return Boolean(successful);
    } catch {
      return false;
    }
  }

  return false;
}
