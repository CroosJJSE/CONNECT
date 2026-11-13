const token = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

export function FormattedMemoryText({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 ? '\n' : null}
          {parts(line, index)}
        </span>
      ))}
    </div>
  );
}

function parts(line: string, lineIndex: number) {
  return line.split(token).map((chunk, index) => {
    const key = `${lineIndex}-${index}`;
    if (chunk.startsWith('*') && chunk.endsWith('*') && chunk.length > 2) {
      return (
        <strong key={key} className="font-semibold text-on-surface">
          {chunk.slice(1, -1)}
        </strong>
      );
    }
    if (chunk.startsWith('_') && chunk.endsWith('_') && chunk.length > 2) {
      return (
        <em key={key} className="italic">
          {chunk.slice(1, -1)}
        </em>
      );
    }
    if (chunk.startsWith('~') && chunk.endsWith('~') && chunk.length > 2) {
      return (
        <span key={key} className="line-through">
          {chunk.slice(1, -1)}
        </span>
      );
    }
    return <span key={key}>{chunk}</span>;
  });
}
