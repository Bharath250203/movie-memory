import { Fragment } from "react";
import { readCitations } from "@/lib/fact-content";
export function FactText({
  text,
  citations,
}: {
  text: string;
  citations: unknown;
}) {
  const valid = readCitations(citations, text);
  let cursor = 0;
  return (
    <p className="fact-text">
      {valid.map((citation, index) => {
        const preceding = text.slice(cursor, citation.start);
        cursor = citation.end;
        return (
          <Fragment key={`${citation.start}-${citation.url}`}>
            {preceding}
            <a
              className="fact-citation"
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              title={citation.title}
              aria-label={`Source ${index + 1}: ${citation.title}`}
            >
              [{index + 1}]
            </a>
          </Fragment>
        );
      })}
      {text.slice(cursor)}
    </p>
  );
}
