import type {
  PublicationChoice,
  PublicationPreview,
  PublicationSettings,
  PublicationView,
} from "~/types/publicationTypes";

export const PUBLICATION_SCOPE = "academy-verified-v1";
export const PUBLICATION_NOTICE_DE =
  "Andere angemeldete Nutzer mit bestätigter E-Mail-Adresse sehen deinen Anzeigenamen, den Standard-Avatar, deine Gesamt-XP sowie Plätze und Punkte der Gesamt-, Aufgaben- und Sprachbestenlisten. Neue XP und Punkte werden mit angezeigt. Einzelne Skills, Bio, Tags, Lösungen und Projektstände bleiben privat. Du kannst jederzeit wieder privat stellen. Frühere Kopien können wir nicht zurückholen.";
export const PUBLICATION_NOTICE_EN =
  "Other signed-in users with a verified email address can see your display name, standard avatar, total XP, and ranks and scores in the overall, task and language leaderboards. Newly earned XP and scores update this view. Individual skills, bio, tags, solutions and project state stay private. You can make your profile private again at any time. We cannot retrieve earlier copies.";
export const PUBLICATION_NOTICE = PUBLICATION_NOTICE_DE + "\n" + PUBLICATION_NOTICE_EN;
export const PUBLICATION_NOTICE_HASH =
  "07434654b73f77ea6d552365142d459125f6d13e734c6a84bfa141cc9090a0a5";

export function publicationSettings(value: any): PublicationSettings {
  if (
    !["private", "shared"].includes(value?.profile_visibility) ||
    !Number.isSafeInteger(value?.visibility_revision) ||
    value.visibility_revision < 0
  )
    throw { statusCode: 503 };
  return {
    profile_visibility: value.profile_visibility,
    visibility_revision: value.visibility_revision,
  };
}

export function emptyPublicationView(): PublicationView {
  return { settings: null, preview: null, busy: false, error: "", success: "", uncertain: false };
}

/** Owner and generation checks fence reads and writes, including A → B → A. */
export function createProfilePublication(options: {
  view: PublicationView;
  owner: () => string;
  userId: () => string;
  get: (path: string) => Promise<any>;
  put: (path: string, choice: PublicationChoice) => Promise<any>;
  uuid: () => string;
  changed: () => void;
}) {
  const view = options.view;
  let generation = 0;
  let pending: PublicationChoice | null = null;
  const capture = () => ({ owner: options.owner(), generation });
  const current = (fence: ReturnType<typeof capture>) =>
    !!fence.owner && fence.owner === options.owner() && fence.generation === generation;

  function clear() {
    generation++;
    pending = null;
    Object.assign(view, emptyPublicationView());
  }

  function errorKey(error: any) {
    const status = error?.statusCode ?? error?.status ?? error?.response?.status;
    if (status === 401) return "SignIn";
    if (status === 403) return "Verify";
    if (status === 409) return "Changed";
    if (status === 422) return "NewPreview";
    return "Unavailable";
  }

  async function reload() {
    clear();
    const fence = capture();
    if (!fence.owner) return;
    view.busy = true;
    try {
      const settings = publicationSettings(await options.get("/auth/users/me/publication"));
      if (current(fence)) view.settings = settings;
    } catch (error) {
      if (current(fence)) view.error = errorKey(error);
    } finally {
      if (current(fence)) view.busy = false;
    }
  }

  async function preview() {
    if (view.busy || view.uncertain || !view.settings) return;
    const fence = capture();
    const userId = options.userId();
    view.busy = true;
    view.preview = null;
    view.error = view.success = "";
    try {
      const result = await options.get("/auth/users/me/publication-preview");
      if (!current(fence)) return;
      const settings = publicationSettings(result?.publication);
      if (
        result?.profile?.user_id !== userId ||
        typeof result?.profile?.display_name !== "string" ||
        result?.profile?.avatar_url !== null ||
        result?.scope_version !== PUBLICATION_SCOPE ||
        result?.notice_hash !== PUBLICATION_NOTICE_HASH ||
        result?.notice !== PUBLICATION_NOTICE ||
        typeof result?.preview_token !== "string" ||
        !result.preview_token ||
        settings.visibility_revision !== view.settings?.visibility_revision
      )
        throw { statusCode: 422 };
      // The owner API contains per-skill data. Only total XP enters the card.
      const xp = await options.get("/skills/xp/me");
      if (!current(fence)) return;
      if (!Number.isSafeInteger(xp?.total_xp) || xp.total_xp < 0) throw { statusCode: 503 };
      view.settings = settings;
      view.preview = {
        profile: {
          user_id: userId,
          display_name: result.profile.display_name,
          avatar_url: null,
        },
        publication: settings,
        scope_version: PUBLICATION_SCOPE,
        notice_hash: PUBLICATION_NOTICE_HASH,
        notice: PUBLICATION_NOTICE,
        preview_token: result.preview_token,
        card: { display_name: result.profile.display_name, total_xp: xp.total_xp },
      } satisfies PublicationPreview;
    } catch (error) {
      if (current(fence)) view.error = errorKey(error);
    } finally {
      if (current(fence)) view.busy = false;
    }
  }

  async function reconcile(fence: ReturnType<typeof capture>, choice: PublicationChoice) {
    const settings = publicationSettings(await options.get("/auth/users/me/publication"));
    if (!current(fence)) return;
    if (
      settings.visibility_revision <
      (view.settings?.visibility_revision ?? choice.expected_revision)
    )
      throw { statusCode: 503 };
    view.settings = settings;
    if (settings.visibility_revision > choice.expected_revision) {
      pending = null;
      view.uncertain = false;
    }
  }

  async function choose(visibility: "private" | "shared", retry = false) {
    if (view.busy || (!retry && !view.settings) || (view.uncertain && !retry)) return;
    const fence = capture();
    let choice: PublicationChoice;
    if (retry) {
      if (!pending || !view.uncertain) return;
      choice = pending;
    } else {
      if (visibility === "shared" && !view.preview) return;
      choice = {
        profile_visibility: visibility,
        expected_revision: view.settings!.visibility_revision,
        request_id: options.uuid(),
        ...(visibility === "shared"
          ? {
              scope_version: view.preview!.scope_version,
              notice_hash: view.preview!.notice_hash,
              preview_token: view.preview!.preview_token,
            }
          : {}),
      };
      pending = choice;
    }
    view.busy = true;
    view.error = view.success = "";
    view.preview = null;
    try {
      // No automatic PUT retry. A user retry retains the exact request ID/CAS.
      const response = await options.put("/auth/users/me/publication", choice);
      if (!current(fence)) return;
      const settings = publicationSettings(response?.current);
      if (settings.visibility_revision <= choice.expected_revision) throw { statusCode: 503 };
      view.settings = settings;
      view.uncertain = false;
      options.changed();
      // Always reread: a share replay can carry an old receipt after withdrawal.
      await reconcile(fence, choice);
      if (current(fence))
        view.success = view.settings?.profile_visibility === "shared" ? "Shared" : "PrivateAgain";
    } catch (error: any) {
      if (!current(fence)) return;
      view.error = errorKey(error);
      view.uncertain = view.error === "Unavailable" || view.error === "SignIn";
      if (!view.uncertain) pending = null;
      // A write may have committed even if its answer was lost. Clear cached
      // people immediately, and ask the authority before offering another write.
      options.changed();
      try {
        await reconcile(fence, choice);
      } catch {
        if (current(fence)) view.settings = null;
      }
    } finally {
      if (current(fence)) view.busy = false;
    }
  }

  return { reload, preview, choose, clear, retry: () => choose("private", true) };
}
