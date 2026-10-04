export const UPDATE_NOTICE_VERSION = "2026-10-privacy-statistics-1";
export const UPDATE_NOTICE_BROWSER = "browser";
export const UPDATE_NOTICE_LINK = "/docs/privacy#statistiken";

export interface UpdateNoticeWindow {
  version: string;
  startsAt: number;
  expiresAt: number;
}

export const UPDATE_NOTICE_WINDOW: UpdateNoticeWindow = {
  version: UPDATE_NOTICE_VERSION,
  startsAt: Date.parse("2026-10-03T00:00:00Z"),
  expiresAt: Date.parse("2026-11-02T00:00:00Z"),
};

export function updateNoticeSubject(id: unknown, token: unknown, loaded: boolean): string | null {
  if (token === null || token === undefined || token === "") return UPDATE_NOTICE_BROWSER;
  return loaded &&
    typeof token === "string" &&
    token.length > 0 &&
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id.toLowerCase()
    : null;
}

export function updateNoticeKey(subject: string, version = UPDATE_NOTICE_VERSION): string {
  return `bootstrap-academy:update-notice:${version}:${subject}`;
}

/** Versions no build shows any more. When a notice is replaced, add its version here. */
export const RETIRED_UPDATE_NOTICE_VERSIONS: readonly string[] = ["2026-09-update-1"];

/** A dismissal has no purpose once its notice can no longer appear: retired versions
 * always, the current version after its display window. Unknown versions stay, so an
 * older open tab cannot erase the dismissal of a newer notice. */
export function clearObsoleteUpdateNotices(
  storage: Pick<Storage, "length" | "key" | "removeItem">,
  window = UPDATE_NOTICE_WINDOW,
  now = Date.now()
) {
  const versions = RETIRED_UPDATE_NOTICE_VERSIONS.filter((version) => version !== window.version);
  if (Number.isFinite(now) && now >= window.expiresAt) versions.push(window.version);
  const prefixes = versions.map((version) => updateNoticeKey("", version));
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

export interface UpdateNoticeView {
  visible: boolean;
  revision: number;
  dismiss: () => void;
}

/** This marker records an explicit local dismissal, never consent or acceptance. */
export function createUpdateNotice(options: {
  dismissed: Set<string>;
  storage: () => Pick<Storage, "getItem" | "setItem" | "length" | "key" | "removeItem">;
  changed: (view: UpdateNoticeView) => void;
  window?: UpdateNoticeWindow;
  now?: () => number;
}) {
  const dismissed = options.dismissed;
  const window = options.window ?? UPDATE_NOTICE_WINDOW;
  const now = options.now ?? (() => Date.now());
  const key = (owner: string) => updateNoticeKey(owner, window.version);
  let subject: string | null = null;
  let revision = 0;
  let alive = true;

  function active() {
    const time = now();
    return Number.isFinite(time) && time >= window.startsAt && time < window.expiresAt;
  }

  function readDismissal() {
    try {
      clearObsoleteUpdateNotices(options.storage(), window, now());
    } catch {
      /* Best-effort cleanup if storage is blocked. */
    }
    if (subject !== null && active()) {
      try {
        if (options.storage().getItem(key(subject)) === "1") dismissed.add(key(subject));
      } catch {
        // Displaying the notice never needs a persistent write.
      }
    }
  }

  function publish() {
    const owner = subject;
    const ticket = revision;
    options.changed({
      visible: active() && owner !== null && !dismissed.has(key(owner)),
      revision: ticket,
      dismiss: () => {
        if (
          !alive ||
          !active() ||
          owner === null ||
          owner !== subject ||
          ticket !== revision ||
          dismissed.has(key(owner))
        )
          return;
        dismissed.add(key(owner));
        try {
          options.storage().setItem(key(owner), "1");
        } catch {
          // Keep the explicit dismissal for this mounted app when storage is unavailable.
        }
        publish();
      },
    });
  }

  return {
    select(next: string | null) {
      if (!alive) return;
      if (next !== subject) revision++;
      subject = next;
      readDismissal();
      publish();
    },
    storageChanged(key: string | null, value: string | null) {
      if (
        !alive ||
        subject === null ||
        key !== updateNoticeKey(subject, window.version) ||
        value !== "1"
      )
        return;
      dismissed.add(key);
      publish();
    },
    refresh() {
      if (alive) {
        readDismissal();
        publish();
      }
    },
    dispose() {
      alive = false;
      revision++;
    },
  };
}
