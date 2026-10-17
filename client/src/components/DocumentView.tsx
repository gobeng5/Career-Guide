import type { ReactNode } from 'react';

// Renders generated resume/letter text as a printed page.
// Handles the light markdown the engines emit: #/##/### headings, bullet lines and **bold**.

const renderInline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );

export const DocumentView = ({ text }: { text: string }) => {
  const blocks: ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-2 pl-5 list-disc marker:text-[#8a94a2]">
        {list.map((item, i) => (
          <li key={i} className="pl-1 mb-1">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•])\s+(.*)$/);

    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();

    if (!line) {
      blocks.push(<div key={i} className="h-3" />);
    } else if (line.startsWith('### ')) {
      blocks.push(
        <p key={i} className="italic text-[#566170] my-1">
          {renderInline(line.slice(4))}
        </p>
      );
    } else if (line.startsWith('## ')) {
      blocks.push(
        <h3
          key={i}
          className="mt-5 mb-2 pb-1 border-b border-[#d9dde2] text-[13px] font-semibold tracking-wide"
        >
          {renderInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={i} className="text-[26px] leading-tight font-semibold">
          {renderInline(line.slice(2))}
        </h2>
      );
    } else {
      blocks.push(
        <p key={i} className="my-0">
          {renderInline(line)}
        </p>
      );
    }
  });
  flushList();

  return <article className="paper">{blocks}</article>;
};
