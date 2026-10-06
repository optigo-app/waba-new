'use client';

import React from 'react';

// WhatsApp markdown tokenizer — adapted from the lexical editor's
// `tokenizeParagraph` (src/app/components/Template/Create/LexicalEditor.js)
// so that incoming chat messages render with the same formatting rules the
// composer uses, without mounting a heavy editor instance per bubble.
//
// Supports: *bold*, _italic_, ~strikethrough~, `code`, backslash escapes.
// Variable placeholders ({{1}}) are intentionally NOT special-cased here —
// received messages already have their variables resolved by the API.

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const TEL_REGEX = /\+?[\d\s\-]{7,20}/g;

function sameFormats(a, b) {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.strikethrough === b.strikethrough &&
    a.code === b.code
  );
}

export function tokenizeWhatsAppParagraph(text) {
  const tokens = [];
  const stack = [];
  let i = 0;

  const currentFormats = () =>
    stack.reduce((acc, f) => ({ ...acc, [f]: true }), {
      bold: false,
      italic: false,
      strikethrough: false,
      code: false,
    });

  const pushText = (str) => {
    if (!str) return;
    const formats = currentFormats();
    const existing = tokens[tokens.length - 1];
    if (existing && existing.type === 'text' && sameFormats(existing, formats)) {
      existing.text += str;
    } else {
      tokens.push({ type: 'text', text: str, ...formats });
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // Escaped markdown marker → literal character
    if (ch === '\\' && i + 1 < text.length && '*_~`'.includes(text[i + 1])) {
      pushText(text[i + 1]);
      i += 2;
      continue;
    }

    // Inline code spans — content inside is treated literally
    if (ch === '`') {
      if (stack.includes('code')) {
        stack.splice(stack.lastIndexOf('code'), 1);
      } else {
        stack.push('code');
      }
      i += 1;
      continue;
    }

    if (stack.includes('code')) {
      pushText(ch);
      i += 1;
      continue;
    }

    const markerMap = { '*': 'bold', '_': 'italic', '~': 'strikethrough' };
    if (markerMap[ch]) {
      const format = markerMap[ch];
      if (stack.includes(format)) {
        stack.splice(stack.lastIndexOf(format), 1);
      } else {
        stack.push(format);
      }
      i += 1;
      continue;
    }

    pushText(ch);
    i += 1;
  }

  return tokens;
}

function wrapWithFormats(content, formats) {
  let node = content;
  if (formats.code) node = <code className="message-text-code">{node}</code>;
  if (formats.strikethrough) node = <s>{node}</s>;
  if (formats.italic) node = <em>{node}</em>;
  if (formats.bold) node = <strong>{node}</strong>;
  return node;
}

function renderLink(value, onLinkClick, key) {
  const isUrl = /^https?:\/\//i.test(value) || /^www\./i.test(value);
  const href = isUrl
    ? (/^www\./i.test(value) ? `https://${value}` : value)
    : `tel:${value.replace(/\s/g, '')}`;

  const handleClick = (e) => {
    if (isUrl && onLinkClick) {
      e.preventDefault();
      onLinkClick(href);
    }
  };

  return (
    <a
      key={key}
      className="message-text-link"
      href={href}
      target={isUrl ? '_blank' : undefined}
      rel={isUrl ? 'noopener noreferrer' : undefined}
      onClick={handleClick}
    >
      {value}
    </a>
  );
}

function findLinks(text) {
  const matches = [];
  URL_REGEX.lastIndex = 0;
  TEL_REGEX.lastIndex = 0;
  let m;
  while ((m = URL_REGEX.exec(text)) !== null) {
    matches.push({ index: m.index, value: m[0], isUrl: true });
  }
  while ((m = TEL_REGEX.exec(text)) !== null) {
    // Skip phone-like runs that are actually inside a URL match
    const insideUrl = matches.some(
      (u) => m.index >= u.index && m.index + m[0].length <= u.index + u.value.length
    );
    if (!insideUrl) matches.push({ index: m.index, value: m[0], isUrl: false });
  }
  matches.sort((a, b) => a.index - b.index);
  return matches;
}

function renderTextToken(token, onLinkClick, key, linkify) {
  const matches = linkify ? findLinks(token.text) : [];

  if (matches.length === 0) {
    return <React.Fragment key={key}>{wrapWithFormats(token.text, token)}</React.Fragment>;
  }

  const children = [];
  let lastIndex = 0;
  matches.forEach((match, idx) => {
    if (match.index > lastIndex) {
      children.push(
        <React.Fragment key={`${key}-t-${idx}`}>
          {token.text.slice(lastIndex, match.index)}
        </React.Fragment>
      );
    }
    children.push(renderLink(match.value, onLinkClick, `${key}-l-${idx}`));
    lastIndex = match.index + match.value.length;
  });
  if (lastIndex < token.text.length) {
    children.push(
      <React.Fragment key={`${key}-t-end`}>{token.text.slice(lastIndex)}</React.Fragment>
    );
  }

  return <React.Fragment key={key}>{wrapWithFormats(children, token)}</React.Fragment>;
}

// Renders WhatsApp-formatted text. Relies on the parent `.message-text`
// `white-space: pre-wrap` rule to honor the literal "\n" separators.
// `linkify` (default true) turns URLs/phone numbers into clickable links —
// pass false for contexts like the conversation list where they should stay plain text.
export const WhatsAppText = ({ text, onLinkClick, linkify = true }) => {
  if (!text) return null;
  const lines = String(text).split('\n');
  return (
    <>
      {lines.map((line, lineIdx) => {
        const tokens = tokenizeWhatsAppParagraph(line);
        return (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 ? '\n' : null}
            {tokens.map((token, tIdx) =>
              renderTextToken(token, onLinkClick, `l${lineIdx}-t${tIdx}`, linkify)
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default WhatsAppText;
