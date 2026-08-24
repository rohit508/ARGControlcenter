// Display-only relabeling — the underlying role name stays "CEO" everywhere in the backend
// (permissions, RBAC checks, the Admin/CEO view-scope toggle) so none of that logic needs to
// change; only what the UI prints for that role is different.
const ROLE_DISPLAY_LABELS: Record<string, string> = {
  CEO: "Director",
};

export function roleDisplayLabel(roleName: string): string {
  return ROLE_DISPLAY_LABELS[roleName] ?? roleName;
}

export function roleDisplayLabels(roleNames: string[]): string {
  return roleNames.map(roleDisplayLabel).join(", ");
}
