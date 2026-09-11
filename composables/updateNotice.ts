export const UPDATE_NOTICE_VERSION = "2026-09-update-1";

export function updateNoticeSubject(id: unknown, token: unknown, loaded: boolean): string | null {
  return loaded &&
    typeof token === "string" &&
    token.length > 0 &&
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id.toLowerCase()
    : null;
}

export function updateNoticeKey(subject: string): string {
  return `bootstrap-academy:update-notice:${UPDATE_NOTICE_VERSION}:${subject}`;
}

export interface UpdateNoticeView {
  visible: boolean;
  revision: number;
  dismiss: () => void;
}

/** This marker records an explicit local dismissal, never consent or acceptance. */
export function createUpdateNotice(options: {
  dismissed: Set<string>;
  storage: () => Pick<Storage, "getItem" | "setItem">;
  changed: (view: UpdateNoticeView) => void;
}) {
  const dismissed = options.dismissed;
  let subject: string | null = null;
  let revision = 0;
  let alive = true;

  function publish() {
    const owner = subject;
    const ticket = revision;
    options.changed({
      visible: owner !== null && !dismissed.has(owner),
      revision: ticket,
      dismiss: () => {
        if (
          !alive ||
          owner === null ||
          owner !== subject ||
          ticket !== revision ||
          dismissed.has(owner)
        )
          return;
        dismissed.add(owner);
        try {
          options.storage().setItem(updateNoticeKey(owner), "1");
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
      if (next !== null) {
        try {
          if (options.storage().getItem(updateNoticeKey(next)) === "1") dismissed.add(next);
        } catch {
          // Displaying the notice never needs a persistent write.
        }
      }
      publish();
    },
    storageChanged(key: string | null, value: string | null) {
      if (!alive || subject === null || key !== updateNoticeKey(subject) || value !== "1") return;
      dismissed.add(subject);
      publish();
    },
    dispose() {
      alive = false;
      revision++;
    },
  };
}
