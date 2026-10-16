import { useEffect, useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { AdminHousehold } from "../../lib/admin/server/repository";
import "./AdminApp.css";

const api = "/api/admin";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
  return data as T;
}
const format = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(date),
      )
    : "—";
const attendanceLabel = (guest: AdminHousehold["guests"][number]) => {
  const statuses = guest.rsvpFor === "ceremony"
    ? [guest.ceremonyStatus]
    : guest.rsvpFor === "reception"
      ? [guest.receptionStatus]
      : [guest.ceremonyStatus, guest.receptionStatus];
  if (statuses.includes("attending")) return "Attending";
  if (statuses.length > 0 && statuses.every((status) => status === "declined")) return "Not attending";
  return "Awaiting response";
};
function RsvpRow({
  household,
  guest,
  open,
  onToggle,
  onMemberAdded,
}: {
  household: AdminHousehold;
  guest: AdminHousehold["guests"][number];
  open: boolean;
  onToggle: () => void;
  onMemberAdded: () => Promise<unknown>;
}) {
  const [attendance, setAttendance] = useState(guest.ceremonyStatus ?? guest.receptionStatus ?? "pending");
  const [comments, setComments] = useState(household.additionalComments);
  const [dietary, setDietary] = useState(guest.dietaryRequirements);
  const [dietaryOther, setDietaryOther] = useState(guest.dietaryOther);
  const [manageOpen, setManageOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setAttendance(guest.ceremonyStatus ?? guest.receptionStatus ?? "pending");
    setDietary(guest.dietaryRequirements);
    setDietaryOther(guest.dietaryOther);
    setComments(household.additionalComments);
  }, [guest.ceremonyStatus, guest.receptionStatus, guest.dietaryRequirements, guest.dietaryOther, household.additionalComments]);
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (dietary.includes("other") && !dietaryOther.trim()) {
        throw new Error("Please describe the other dietary requirement.");
      }
      await request("/rsvps", { method: "PUT", body: JSON.stringify({ guestId: guest.id, attendance, dietaryRequirements: dietary, dietaryOther, additionalComments: comments }) });
      setManageOpen(false);
      await onMemberAdded();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to save this RSVP.");
    } finally {
      setSaving(false);
    }
  };
  const addMember = async (event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAdding(true);
    try { await request(`/households/${household.id}/members`, { method: "POST", body: JSON.stringify({ fullName: form.get("fullName") }) }); event.currentTarget.reset(); onMemberAdded(); }
    finally { setAdding(false); }
  };
  const label = attendanceLabel(guest);
  return (
    <>
      <tr
        className={`admin-rsvp-row ${open ? "expanded" : ""}`}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggle();
          }
        }}
        tabIndex={0}
        aria-expanded={open}
      >
        <td>
          <strong>{guest.fullName}</strong>
          <span className="row-chevron">{open ? "⌃" : "⌄"}</span>
        </td>
        <td>
          {household.displayName}
          <small>{household.primaryEmail}</small>
        </td>
        <td>
          <span
            className={`status-pill ${label === "Awaiting response" ? "pending" : label === "Not attending" ? "not-attending" : "responded"}`}
          >
            {label}
          </span>
        </td>
        <td>{format(guest.updatedAt)}</td>
      </tr>
      {open && (
        <tr className="admin-rsvp-detail">
          <td colSpan={4}>
            <div className="response-detail">
              <div>
                <strong>Attendance</strong>
                <span>{label}</span>
              </div>
              <div>
                <strong>Dietaries</strong>
                <span>
                  {guest.dietaryRequirements.length
                    ? `${guest.dietaryRequirements.join(", ")}${guest.dietaryOther ? ` — ${guest.dietaryOther}` : ""}`
                    : "None noted"}
                </span>
              </div>
              <div>
                <strong>Comments</strong>
                <span>{household.additionalComments || "None"}</span>
              </div>
              <button className="admin-manage-button" onClick={(event) => { event.stopPropagation(); setManageOpen(!manageOpen); }}>{manageOpen ? "Hide manage form" : "Manage RSVP"}</button>
            </div>
          </td>
        </tr>
      )}
      {manageOpen && (
        <tr className="admin-modal-row">
          <td colSpan={5}>
            <div className="admin-modal-backdrop" role="presentation">
              <section className="admin-modal" aria-labelledby={`manage-${guest.id}`}>
                <button className="admin-modal-close" aria-label="Close manage RSVP" onClick={() => setManageOpen(false)}>×</button>
                <p className="admin-eyebrow">Admin response</p>
                <h2 id={`manage-${guest.id}`}>RSVP for {guest.fullName}</h2>
                <p className="admin-modal-intro">Enter the same details a guest would submit through the RSVP form.</p>
                <label>Attendance
                  <select value={attendance} onChange={(event) => setAttendance(event.target.value)}>
                    <option value="pending">No response</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Unable to attend</option>
                  </select>
                </label>
                <fieldset>
                  <legend>Dietary requirements</legend>
                  {[["gluten_free", "Gluten free"], ["vegan", "Vegan"], ["vegetarian", "Vegetarian"], ["other", "Other"]].map(([value, label]) => (
                    <label className="admin-checkbox" key={value}><input type="checkbox" checked={dietary.includes(value)} onChange={(event) => setDietary(event.target.checked ? [...dietary, value] : dietary.filter((item) => item !== value))} /> {label}</label>
                  ))}
                </fieldset>
                {dietary.includes("other") && <label>Dietary details<input value={dietaryOther} maxLength={500} onChange={(event) => setDietaryOther(event.target.value)} /></label>}
                <label>Additional household comments<textarea value={comments} maxLength={2000} onChange={(event) => setComments(event.target.value)} /></label>
                <div className="admin-modal-actions"><button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save RSVP"}</button><button className="admin-secondary" onClick={() => setManageOpen(false)}>Cancel</button></div>
                {error && <p className="admin-error" role="alert">{error}</p>}
                <hr />
                <h3>Add household member</h3>
                <form className="admin-add-member" onSubmit={addMember}><input name="fullName" required maxLength={200} placeholder="Full name" /><button disabled={adding}>{adding ? "Adding…" : "Add member"}</button></form>
              </section>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Dashboard() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "all" | "attending" | "unable" | "responded" | "pending"
  >("all");
  const [view, setView] = useState<"rsvps" | "add">("rsvps");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: "guest" | "household" | "response" | "updated"; direction: "asc" | "desc" }>({ key: "guest", direction: "asc" });
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const households = useQuery({
    queryKey: ["households"],
    queryFn: () =>
      request<{ households: AdminHousehold[] }>("/households").then(
        (x) => x.households,
      ),
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["households"] });
  const create = useMutation({
    mutationFn: (body: unknown) =>
      request("/households", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      setNotice("Household created.");
      refresh();
    },
    onError: (e) => setNotice(e.message),
  });
  const importBatch = useMutation({
    mutationFn: async ({
      file,
      expiresOn,
    }: {
      file: File;
      expiresOn: string;
    }) => {
      const response = await fetch(`${api}/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: await file.text(), expiresOn }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Unable to import this batch.");
      }
      const download = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = download;
      link.download = "wedding-yamm-invitations.csv";
      link.click();
      URL.revokeObjectURL(download);
    },
    onSuccess: () => {
      setNotice(
        "Guests imported and YAMM invitation CSV downloaded. Keep that file private.",
      );
      refresh();
    },
    onError: (e) => setNotice(e.message),
  });
  const logout = async () => {
    await request("/logout", { method: "POST" });
    location.assign("/admin");
  };
  const allGuests = useMemo(
    () =>
      (households.data ?? []).flatMap((household) =>
        household.guests.map((guest) => ({ household, guest })),
      ),
    [households.data],
  );
  const matchesSearch = ({ household, guest }: (typeof allGuests)[number]) => {
    const q = search.toLowerCase().trim();
    return (
      !q ||
      [guest.fullName, household.displayName, household.primaryEmail].some(
        (value) => value.toLowerCase().includes(q),
      )
    );
  };
  const hasResponded = (guest: (typeof allGuests)[number]["guest"]) =>
    guest.ceremonyStatus !== null || guest.receptionStatus !== null;
  const isAttending = (guest: (typeof allGuests)[number]["guest"]) =>
    guest.ceremonyStatus === "attending" || guest.receptionStatus === "attending";
  const isUnableToAttend = (guest: (typeof allGuests)[number]["guest"]) => {
    const statuses = [guest.ceremonyStatus, guest.receptionStatus].filter(
      (value): value is string => value !== null,
    );
    return statuses.length > 0 && statuses.every((value) => value === "declined");
  };
  const matchesStatus = (guest: (typeof allGuests)[number]["guest"], filter: typeof status) =>
    filter === "all" ||
    (filter === "attending" && isAttending(guest)) ||
    (filter === "unable" && isUnableToAttend(guest)) ||
    (filter === "responded" && hasResponded(guest)) ||
    (filter === "pending" && !hasResponded(guest));
  const filteredGuests = useMemo(
    () => allGuests.filter(({ guest, household }) => matchesSearch({ guest, household }) && matchesStatus(guest, status)),
    [allGuests, search, status],
  );
  const searchGuests = useMemo(
    () => allGuests.filter(matchesSearch),
    [allGuests, search],
  );
  const countFor = (filter: typeof status) =>
    searchGuests.filter(({ guest }) => matchesStatus(guest, filter)).length;
  const guests = useMemo(() => [...filteredGuests].sort((a, b) => {
    const valueFor = (item: (typeof allGuests)[number]) => {
      if (sort.key === "guest") return item.guest.fullName;
      if (sort.key === "household") return item.household.displayName;
      if (sort.key === "response") return attendanceLabel(item.guest);
      return item.guest.updatedAt ? new Date(item.guest.updatedAt).getTime() : 0;
    };
    const left = valueFor(a);
    const right = valueFor(b);
    const comparison = typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
    return sort.direction === "asc" ? comparison : -comparison;
  }), [filteredGuests, sort, allGuests]);
  const toggleSort = (key: typeof sort.key) => setSort((current) => current.key === key ? { key, direction: current.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });
  const sortIndicator = (key: typeof sort.key) => sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : "";
  const ariaSort = (key: typeof sort.key) => sort.key === key ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <section className="admin-shell panel">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Private dashboard</p>
          <h1>Wedding RSVP administration</h1>
          <p>Create invitations, track responses, and export the guest list.</p>
        </div>
        <button className="admin-secondary" onClick={logout}>
          Sign out
        </button>
      </header>
      <nav className="admin-tabs" aria-label="Admin sections">
        <button
          className={view === "rsvps" ? "active" : ""}
          onClick={() => setView("rsvps")}
        >
          RSVPs <span>{guests.length}</span>
        </button>
        <button
          className={view === "add" ? "active" : ""}
          onClick={() => setView("add")}
        >
          Add RSVP
        </button>
      </nav>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {inviteUrl && (
        <section className="admin-secret">
          <strong>Copy this invitation URL now.</strong>
          <p>It will not be shown again after you close this message.</p>
          <div>
            <input readOnly value={inviteUrl} aria-label="New invitation URL" />
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(inviteUrl)
                  .then(() => setNotice("Invitation URL copied."))
              }
            >
              Copy
            </button>
            <button
              className="admin-secondary"
              onClick={() => setInviteUrl(null)}
            >
              Close
            </button>
          </div>
        </section>
      )}
      {view === "add" ? (
        <>
          <section className="admin-create">
            <h2>Add one household</h2>
            <p>
              Add a guest or household manually, then generate their invitation
              link below.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const names = String(form.get("guests"))
                  .split("\n")
                  .map((name) => name.trim())
                  .filter(Boolean);
                create.mutate({
                  displayName: form.get("displayName"),
                  primaryEmail: form.get("primaryEmail"),
                  guests: names.map((fullName) => ({ fullName })),
                });
                event.currentTarget.reset();
              }}
            >
              <input
                name="displayName"
                required
                maxLength={200}
                placeholder="Household name"
              />
              <input
                name="primaryEmail"
                required
                type="email"
                placeholder="Contact email"
              />
              <textarea
                name="guests"
                required
                maxLength={4000}
                placeholder="One guest name per line"
              />
              <button disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add household"}
              </button>
            </form>
          </section>
          <section className="admin-import">
            <h2>Import guest list</h2>
            <p>
              Upload a CSV to create households and generate invitation links in
              bulk.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const file = form.get("guestCsv");
                const expiresOn = String(form.get("expiresOn") ?? "");
                if (file instanceof File && file.size)
                  importBatch.mutate({ file, expiresOn });
              }}
            >
              <label>
                Guest-list CSV
                <input
                  name="guestCsv"
                  type="file"
                  accept=".csv,text/csv"
                  required
                />
              </label>
              <label>
                Link expiry date
                <input
                  name="expiresOn"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  required
                />
              </label>
              <button disabled={importBatch.isPending}>
                {importBatch.isPending
                  ? "Importing…"
                  : "Import & download YAMM CSV"}
              </button>
            </form>
          </section>
        </>
      ) : (
        <>
          <div className="admin-toolbar">
            <label>
              Search guest, household or email
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Start typing to search"
              />
            </label>
            <div className="admin-actions">
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
                aria-label="Filter attendance status"
              >
                <option value="all">Everyone ({countFor("all")})</option>
                <option value="attending">Attending ({countFor("attending")})</option>
                <option value="unable">Unable to attend ({countFor("unable")})</option>
                <option value="responded">Responded ({countFor("responded")})</option>
                <option value="pending">Awaiting response ({countFor("pending")})</option>
              </select>
              <a className="admin-secondary" href={`${api}/export.csv`}>
                Export CSV
              </a>
            </div>
          </div>
          {households.isLoading ? (
            <p>Loading RSVPs…</p>
          ) : households.isError ? (
            <p className="admin-error">{households.error.message}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th><button className="admin-sort-button" onClick={() => toggleSort("guest")} aria-label={`Sort by guest ${ariaSort("guest")}`}>Guest{sortIndicator("guest")}</button></th>
                    <th><button className="admin-sort-button" onClick={() => toggleSort("household")} aria-label={`Sort by household ${ariaSort("household")}`}>Household{sortIndicator("household")}</button></th>
                    <th><button className="admin-sort-button" onClick={() => toggleSort("response")} aria-label={`Sort by response ${ariaSort("response")}`}>Response{sortIndicator("response")}</button></th>
                    <th><button className="admin-sort-button" onClick={() => toggleSort("updated")} aria-label={`Sort by updated date ${ariaSort("updated")}`}>Updated{sortIndicator("updated")}</button></th>
                  </tr>
                </thead>
                <tbody>
									{guests.map(({ household, guest }) => (
										<RsvpRow key={guest.id} household={household} guest={guest} open={expanded === guest.id} onToggle={() => setExpanded(expanded === guest.id ? null : guest.id)} onMemberAdded={refresh} />
									))}
									{/* rows are rendered by RsvpRow */}
									{/*
									<tr key={guest.id}>
                      <td>
                        <strong>{guest.fullName}</strong>
                      </td>
                      <td>
                        {household.displayName}
                        <small>{household.primaryEmail}</small>
                      </td>
                      <td>
                        {guest.rsvpFor === "both"
                          ? "Ceremony & reception"
                          : guest.rsvpFor}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${guest.ceremonyStatus !== null || guest.receptionStatus !== null ? "responded" : "pending"}`}
                        >
                          {guest.ceremonyStatus !== null ||
                          guest.receptionStatus !== null
                            ? "Responded"
                            : "Awaiting response"}
                        </span>
                      </td>
                      <td>{format(guest.updatedAt)}</td>
										</tr>*/}
                </tbody>
              </table>
              {!guests.length && <p>No RSVPs match these filters.</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
const queryClient = new QueryClient();
export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}
