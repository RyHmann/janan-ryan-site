import { useMemo, useState } from "react";
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
function RsvpRow({
  household,
  guest,
  open,
  onToggle,
}: {
  household: AdminHousehold;
  guest: AdminHousehold["guests"][number];
  open: boolean;
  onToggle: () => void;
}) {
  const responded =
    guest.ceremonyStatus !== null || guest.receptionStatus !== null;
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
          {guest.rsvpFor === "both" ? "Ceremony & reception" : guest.rsvpFor}
        </td>
        <td>
          <span
            className={`status-pill ${responded ? "responded" : "pending"}`}
          >
            {responded ? "Responded" : "Awaiting response"}
          </span>
        </td>
        <td>{format(guest.updatedAt)}</td>
      </tr>
      {open && (
        <tr className="admin-rsvp-detail">
          <td colSpan={5}>
            <div className="response-detail">
              <div>
                <strong>Ceremony</strong>
                <span>{guest.ceremonyStatus ?? "No response"}</span>
              </div>
              <div>
                <strong>Reception</strong>
                <span>{guest.receptionStatus ?? "No response"}</span>
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
  const guests = filteredGuests;
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
                    <th>Guest</th>
                    <th>Household</th>
                    <th>Events</th>
                    <th>Response</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
									{guests.map(({ household, guest }) => (
										<RsvpRow key={guest.id} household={household} guest={guest} open={expanded === guest.id} onToggle={() => setExpanded(expanded === guest.id ? null : guest.id)} />
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
