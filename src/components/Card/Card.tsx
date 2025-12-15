import type { PropsWithChildren } from "react";

export type CardProps = PropsWithChildren<{
  title?: string;
  description?: string;
}>;

export function Card({ title, description, children }: CardProps) {
  return (
    <section className="ui-card">
      {(title || description) && (
        <header className="ui-card__header">
          {title && <h1 className="ui-card__title">{title}</h1>}
          {description && <p className="ui-card__description">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
