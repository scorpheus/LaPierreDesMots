import type { ReactElement, ReactNode } from 'react';
import './message-stable.css';

/** Réserve les retours à la ligne avant le premier refus, à la typographie du moteur. */
export function MessageStable({ messages, children }: {
  readonly messages: readonly string[];
  readonly children: ReactNode;
}): ReactElement {
  return (
    <span className="message-stable">
      {[...new Set(messages)].map((message) => (
        <span key={message} className="message-stable__reserve" aria-hidden="true" data-texte={message} />
      ))}
      <span className="message-stable__texte">{children}</span>
    </span>
  );
}
