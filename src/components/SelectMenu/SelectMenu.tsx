import { useEffect, useId, useRef, useState } from "react";

export type SelectMenuItem = {
  id: string;
  label: string;
};

export type SelectMenuProps = {
  label: string;
  items: SelectMenuItem[];
  valueId: string;
  onChangeValueId: (id: string) => void;
  footerActionLabel?: string;
  onFooterAction?: () => void;
  className?: string;
  showLabel?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
};

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M5.5 7.75L10 12.25L14.5 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SelectMenu({
  label,
  items,
  valueId,
  onChangeValueId,
  footerActionLabel,
  onFooterAction,
  className,
  showLabel = true,
  searchable = false,
  searchPlaceholder = "Search...",
}: SelectMenuProps) {
  const buttonId = useId();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [renderPanel, setRenderPanel] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selected = items.find((p) => p.id === valueId) ?? items[0];

  // Filter items based on search query
  const filteredItems = searchable && searchQuery
    ? items.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  useEffect(() => {
    let raf = 0;
    let t = 0;
    let cancelled = false;

    if (open) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setRenderPanel(true);
        setPanelOpen(false);
        raf = window.requestAnimationFrame(() => {
          if (!cancelled) {
            setPanelOpen(true);
            // Focus search input when opening if searchable
            if (searchable) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }
        });
      });
    } else {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setPanelOpen(false);
          // Clear search when closing
          setSearchQuery("");
        }
      });
      if (renderPanel) t = window.setTimeout(() => setRenderPanel(false), 180);
    }

    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      if (t) window.clearTimeout(t);
    };
  }, [open, renderPanel, searchable]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div className={["ui-select-menu", className].filter(Boolean).join(" ")} ref={rootRef}>
      {showLabel && <span className="ui-sidebar__label">{label}</span>}
      <button
        id={buttonId}
        type="button"
        className="ui-select-menu__button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ui-select-menu__value">{selected?.label ?? "Select"}</span>
        <ChevronDown className={["ui-select-menu__chevron", open ? "is-open" : ""].filter(Boolean).join(" ")} />
      </button>

      {renderPanel && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={buttonId}
          className={["ui-select-menu__panel", panelOpen ? "is-open" : "is-closed", searchable ? "is-searchable" : ""].join(" ")}
        >
          {searchable && (
            <div className="ui-select-menu__search">
              <input
                ref={searchInputRef}
                type="text"
                className="ui-select-menu__search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent closing on Escape if there's a search query - clear it instead
                  if (e.key === "Escape" && searchQuery) {
                    e.stopPropagation();
                    setSearchQuery("");
                  }
                }}
              />
            </div>
          )}
          <div className="ui-select-menu__list" role="listbox" aria-label={label}>
            {filteredItems.length === 0 ? (
              <div className="ui-select-menu__empty">No results found</div>
            ) : (
              filteredItems.map((p) => {
                const active = p.id === valueId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={["ui-select-menu__option", active ? "is-active" : "", searchable ? "ui-select-menu__option--searchable" : ""].filter(Boolean).join(" ")}
                    onClick={() => {
                      onChangeValueId(p.id);
                      setOpen(false);
                    }}
                  >
                    {p.label}
                  </button>
                );
              })
            )}
          </div>

          {footerActionLabel && (
            <button
              type="button"
              className="ui-select-menu__footer"
              onClick={() => {
                onFooterAction?.();
                setOpen(false);
              }}
            >
              {footerActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
