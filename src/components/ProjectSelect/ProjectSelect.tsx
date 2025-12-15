import { SelectMenu, type SelectMenuItem } from "../SelectMenu";

export type ProjectSelectItem = {
  id: string;
  name: string;
};

export type ProjectSelectProps = {
  items: ProjectSelectItem[];
  valueId: string;
  onChangeValueId: (id: string) => void;
  onNewProject?: () => void;
  label?: string;
};

export function ProjectSelect({ items, valueId, onChangeValueId, onNewProject, label = "Project" }: ProjectSelectProps) {
  const menuItems: SelectMenuItem[] = items.map((p) => ({ id: p.id, label: p.name }));

  return (
    <SelectMenu
      label={label}
      items={menuItems}
      valueId={valueId}
      onChangeValueId={onChangeValueId}
      footerActionLabel="+ New project"
      onFooterAction={onNewProject}
    />
  );
}
