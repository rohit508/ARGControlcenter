// Display-only per-person override — the underlying role name stays "CEO" everywhere in the
// backend (permissions, RBAC checks, the Admin/CEO view-scope toggle) and for every other CEO,
// so none of that logic changes. Only Asad Ali's own screen shows "Director" instead of "CEO";
// every other person holding the CEO role (e.g. Syed Shujaat Ali) still sees "CEO".
const CEO_AS_DIRECTOR_EMAILS = new Set(["asad.ali@erp.local"]);
const CEO_AS_DIRECTOR_NAMES = new Set(["Asad Ali"]);

function relabel(roleName: string, shouldRelabel: boolean): string {
  return shouldRelabel && roleName === "CEO" ? "Director" : roleName;
}

// For the logged-in user's own header — keyed by login email, the identifier the session actually
// carries.
export function roleDisplayLabelsFor(roleNames: string[], userEmail: string | null | undefined): string {
  const shouldRelabel = !!userEmail && CEO_AS_DIRECTOR_EMAILS.has(userEmail);
  return roleNames.map((r) => relabel(r, shouldRelabel)).join(", ");
}

// For an Employee record being viewed/edited elsewhere (Employees page, edit modal) — those don't
// carry a login email in the Employee type, so this keys off full name instead.
export function roleDisplayLabelForEmployee(roleName: string, employeeFullName: string | null | undefined): string {
  const shouldRelabel = !!employeeFullName && CEO_AS_DIRECTOR_NAMES.has(employeeFullName);
  return relabel(roleName, shouldRelabel);
}
