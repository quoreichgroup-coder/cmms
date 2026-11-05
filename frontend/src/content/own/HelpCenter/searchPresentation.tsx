import { Box } from '@mui/material';
import { normalizeHelpSearch } from './normalizeHelpSearch';

interface TextRange {
  start: number;
  end: number;
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

const getHighlightRanges = (text: string, query: string): TextRange[] => {
  const foldedCharacters: string[] = [];
  const sourceRanges: TextRange[] = [];

  for (let offset = 0; offset < text.length; ) {
    const codePoint = text.codePointAt(offset);
    if (codePoint === undefined) break;
    const character = String.fromCodePoint(codePoint);
    const folded = normalizeHelpSearch(character);
    for (let index = 0; index < folded.length; index += 1) {
      foldedCharacters.push(folded[index]);
      sourceRanges.push({ start: offset, end: offset + character.length });
    }
    offset += character.length;
  }

  const foldedText = foldedCharacters.join('');
  const terms = normalizeHelpSearch(query)
    .split(/\s+/)
    .filter(Boolean);
  const ranges: TextRange[] = [];

  terms.forEach((term) => {
    let searchFrom = 0;
    while (searchFrom < foldedText.length) {
      const matchAt = foldedText.indexOf(term, searchFrom);
      if (matchAt < 0) break;
      const first = sourceRanges[matchAt];
      const last = sourceRanges[matchAt + term.length - 1];
      if (first && last) ranges.push({ start: first.start, end: last.end });
      searchFrom = matchAt + Math.max(1, term.length);
    }
  });

  return ranges
    .sort((first, second) => first.start - second.start)
    .reduce<TextRange[]>((merged, current) => {
      const previous = merged[merged.length - 1];
      if (previous && current.start <= previous.end)
        previous.end = Math.max(previous.end, current.end);
      else merged.push({ ...current });
      return merged;
    }, []);
};

export const getSearchExcerpt = (
  text: string,
  query: string,
  maxLength = 180
): string => {
  const content = text.replace(/\s+/g, ' ').trim();
  if (!content) return '';
  const firstMatch = getHighlightRanges(content, query)[0];
  if (!firstMatch)
    return content.length > maxLength
      ? `${content.slice(0, maxLength).trimEnd()}…`
      : content;

  const start = Math.max(0, firstMatch.start - Math.floor(maxLength / 3));
  const end = Math.min(content.length, start + maxLength);
  return `${start > 0 ? '…' : ''}${content
    .slice(start, end)
    .trim()}${end < content.length ? '…' : ''}`;
};

export const Highlight = ({
  text,
  query
}: {
  text: string;
  query: string;
}): JSX.Element => {
  const ranges = getHighlightRanges(text, query);
  if (!ranges.length) return <>{text}</>;

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor)
      segments.push({ text: text.slice(cursor, range.start), highlighted: false });
    segments.push({ text: text.slice(range.start, range.end), highlighted: true });
    cursor = range.end;
  });
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlighted: false });

  return (
    <>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <Box
            component="mark"
            key={`${segment.text}-${index}`}
            sx={{ bgcolor: 'primary.light', color: 'text.primary', px: 0.15 }}
          >
            {segment.text}
          </Box>
        ) : (
          <span key={`${segment.text}-${index}`}>{segment.text}</span>
        )
      )}
    </>
  );
};
