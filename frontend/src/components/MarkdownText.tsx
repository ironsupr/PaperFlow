import React from 'react';

// ─── Inline formatter: bold, italic, inline-code ────────────────────────────
function formatInline(text: string): React.ReactNode {
  // Split on **bold**, *italic*, `code` patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i} className="italic text-foreground/90">{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="px-1 py-0.5 rounded bg-accent text-[10px] font-mono text-foreground/90 border border-border/50">{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

interface MarkdownTextProps {
  text: string;
  className?: string;
  // compact reduces spacing — use inside tight panels
  compact?: boolean;
}

const MarkdownText = ({ text, className = '', compact = false }: MarkdownTextProps) => {
  if (!text) return null;

  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    // Blank line → spacer
    if (!t) {
      nodes.push(<div key={i} className={compact ? 'h-0.5' : 'h-2'} />);
      i++;
      continue;
    }

    // Code block (``` ... ```)
    if (t.startsWith('```')) {
      const lang = t.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} className="rounded-lg bg-accent/40 border border-border/50 overflow-hidden my-1">
          {lang && (
            <div className="px-3 py-1 border-b border-border/40 bg-accent/30">
              <span className="text-[9px] mono text-muted-foreground uppercase tracking-widest">{lang}</span>
            </div>
          )}
          <pre className="p-3 text-[10px] font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre">
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++; // skip closing ```
      continue;
    }

    // Horizontal rule
    if (t === '---' || t === '***' || t === '___') {
      nodes.push(<hr key={i} className="border-border/40 my-2" />);
      i++;
      continue;
    }

    // Heading 1
    if (t.startsWith('# ')) {
      nodes.push(
        <p key={i} className={`font-bold text-foreground ${compact ? 'text-[12px] mt-2' : 'text-[13px] mt-3'}`}>
          {formatInline(t.slice(2))}
        </p>
      );
      i++;
      continue;
    }

    // Heading 2
    if (t.startsWith('## ')) {
      nodes.push(
        <p key={i} className={`font-bold text-foreground border-b border-border/30 pb-0.5 ${compact ? 'text-[11px] mt-2' : 'text-[12px] mt-3'}`}>
          {formatInline(t.slice(3))}
        </p>
      );
      i++;
      continue;
    }

    // Heading 3
    if (t.startsWith('### ')) {
      nodes.push(
        <p key={i} className={`font-semibold text-foreground ${compact ? 'text-[10px] mt-1.5' : 'text-[11px] mt-2'}`}>
          {formatInline(t.slice(4))}
        </p>
      );
      i++;
      continue;
    }

    // Unordered list item (-, *, •)
    if (t.match(/^[-*•] /)) {
      // Collect consecutive list items
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*•] /)) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      nodes.push(
        <ul key={i} className={`space-y-1 ${compact ? 'pl-1' : 'pl-2'}`}>
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 items-start">
              <span className="text-primary/60 shrink-0 mt-[3px] text-[8px]">▸</span>
              <span className={`leading-relaxed text-foreground/85 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                {formatInline(item)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list item
    const olMatch = t.match(/^(\d+)\.\s(.+)$/);
    if (olMatch) {
      const items: Array<{ n: string; text: string }> = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(\d+)\.\s(.+)$/);
        if (!m) break;
        items.push({ n: m[1], text: m[2] });
        i++;
      }
      nodes.push(
        <ol key={i} className={`space-y-1 ${compact ? 'pl-1' : 'pl-2'}`}>
          {items.map((item, j) => (
            <li key={j} className="flex gap-2 items-start">
              <span className={`text-primary/60 font-bold mono shrink-0 mt-[2px] min-w-[14px] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                {item.n}.
              </span>
              <span className={`leading-relaxed text-foreground/85 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                {formatInline(item.text)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Plain paragraph
    nodes.push(
      <p key={i} className={`leading-relaxed text-foreground/85 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {formatInline(t)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{nodes}</div>;
};

export default MarkdownText;
