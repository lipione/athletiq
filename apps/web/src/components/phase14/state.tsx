import type { ReactNode } from 'react';

type StateBlockProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function EmptyState({ title, message, action }: StateBlockProps) {
  return (
    <section className="state-block" aria-live="polite">
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="state-block__action">{action}</div> : null}
    </section>
  );
}

export function ErrorState({ title, message, action }: StateBlockProps) {
  return (
    <section className="state-block state-block--error" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {action ? <div className="state-block__action">{action}</div> : null}
    </section>
  );
}

export function LoadingState({ title = 'Loading workspace' }: { title?: string }) {
  return (
    <section className="state-block" aria-live="polite" aria-busy="true">
      <div className="loading-bar" />
      <h2>{title}</h2>
      <p>Preparing verified sports operations data.</p>
    </section>
  );
}
