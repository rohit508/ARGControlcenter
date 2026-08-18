## Finance & Accounts

**Head:** Syed Azfal Ali Zahidi — CFO
**Login:** `syed.azfal.ali.zahidi@erp.local` / `syed.azfal.ali.zahidi@demo123`

| Team Member | Designation |
| --- | --- |
| Gohar Mehdi | IT Manager / Asst. Manager Finance |
| Mumtaz Hussain | Accountant |
| Ishtiaq Ahmed | Office Accounts Assistant |


## Cargo & Operations — IFC Karachi

**Head:** Mohammad Tariq Zubair Khan — Cargo Manager, Sales & Operation
**Login:** `mohammad.tariq.zubair.khan@erp.local` / `mohammad.tariq.zubair.khan@demo123`

| Team Member | Designation |
| --- | --- |
| Muharram Ali | Manager Operation |
| Adnan Shahid | Assistant Manager, Cargo Sales & Operation |
| Ahsan Ali | Cargo Operation South |
| Muhammad Qasim | Assistant Manager |



## Group Operations & Services

**Head:** Zaheer Ahmed — Group Manager
**Login:** `zaheer.ahmed@erp.local` / `zaheer.ahmed@demo123`

| Team Member | Designation |
| --- | --- |
| Muhammad Adeel | Manager Supply Chain |
| Kashif Ali | Travel Manager |
| Tahir Hussain | Manager |



## Regional & Country Offices

**Head:** Shehbaz Ahmed — Director / Country Manager
**Login:** `shehbaz.ahmed@erp.local` / `shehbaz.ahmed@demo123`

| Team Member | Designation |
| --- | --- |
| Kashif Bashir | Director IFC Islamabad |
| Ghulm Sadiq | Manager LHE |
| Muhammad Amjad SKT | Asst. Manager Operation |
| Atif Tasneem | Manager OEP KSA |

---

## Legal, HR & Administration

**Head:** MarJan Farooqui — Legal Officer / HR Manager
**Login:** `marjan.farooqui@erp.local` / `marjan.farooqui@demo123`

| Team Member | Designation |
| --- | --- |
| Shazhad Rahim Ali | Admin Manager / HR IFC |

---

## Technology & AI Automation

**Head:** Usman Amjad — IT Manager
**Login:** `usman.amjad@erp.local` / `usman.amjad@demo123`

| Team Member | Designation |
| --- | --- |
| Shazaib Ahmed | Business Process Analyst |
| Asad Naviad | AI Automation Engineer |
| Ajiya Anwar | AI Automation Engineer |
| M. Danish Meraj | AI Automation Engineer — Intern |

---

## Full-Access Accounts (Admin + CEO)

These two accounts are not scoped to a single department — same role combination, same full
access, no "My Teams" restriction. They get the full Admin navigation (with "Coming Soon"
placeholders for modules outside Admin's primary set) and see every ticket company-wide.

| Name | Designation | Login |
| --- | --- | --- |
| Syed Shujaat Ali | Group Chairman | `syed.shujaat.ali@erp.local` / `syed.shujaat.ali@demo123` |
| Asad Ali | Group Director | `asad.ali@erp.local` / `asad.ali@demo123` |

---

## Notes

- Source of truth for all of the above is the `roster` array in `server/src/db/seed.ts`, seeded
  fresh (and idempotently) every time `npm run seed` runs.
- Department names/ids are defined in the same file's `deptNames` array.
- These credentials are for the local dev/demo database only — `CREDENTIALS.local.csv` is
  gitignored and should never be committed or shared outside the team.
