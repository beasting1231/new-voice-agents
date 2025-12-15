export type TabItem<TId extends string> = {
  id: TId;
  label: string;
};

export type TabsProps<TId extends string> = {
  items: TabItem<TId>[];
  valueId: TId;
  onChangeValueId: (id: TId) => void;
};

export function Tabs<TId extends string>({ items, valueId, onChangeValueId }: TabsProps<TId>) {
  return (
    <div className="ui-tabs" role="tablist" aria-label="Tabs">
      {items.map((t) => {
        const active = t.id === valueId;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={["ui-tabs__tab", active ? "is-active" : ""].filter(Boolean).join(" ")}
            onClick={() => onChangeValueId(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

