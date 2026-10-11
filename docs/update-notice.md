# In-app update notices

`UpdateNotice.vue` displays a short explanation with a direct link and a close button in the normal page flow. It never submits consent or calls an API. Public legal/intake routes suppress it so their purpose remains clear.

`UPDATE_NOTICE_WINDOW` in `composables/updateNotice.ts` defines a version and an inclusive start/exclusive expiry in UTC. The mounted component checks expiry every minute and releases its timer/listener on unmount. For a future notice, change the version, window, link and DE/EN translations together, and add the replaced version to `RETIRED_UPDATE_NOTICE_VERSIONS`. Previous version markers never suppress a new notice.

The notice is for people with an account: it appears once a signed-in profile is loaded. A visitor without a session sees none, so the landing page, the login and the registration start with what the visitor came for. Someone who opens the site signed out and then signs in sees the notice after the login.

Only an explicit close stores `bootstrap-academy:update-notice:<version>:<subject>` in Local Storage. The subject is the validated, loaded account identifier. Earlier builds also showed the notice to visitors without a session and stored their close under the subject `browser`; nothing reads that marker any more, it never hides the notice of an account, and it leaves with the other markers when the window ends. Dismissal is per browser and account, with no server synchronization. Cross-tab storage events also hide the notice. If browser storage is unavailable, the App-owned set keeps the dismissal for the current App lifetime, including layout changes. Account switches invalidate stale close handlers.

`plugins/storage-cleanup.client.ts` removes dismissals that can no longer matter at every app start: markers of retired versions always, markers of the current version once its window has ended. Unknown versions stay untouched, so an older open tab cannot erase the dismissal of a newer notice.

Run `node --test tests/update-notice.test.mjs` for who sees the notice (no session, signed in and open, signed in and closed), account isolation, reload, blocked storage, window boundaries, expiry, version changes and the real App/component/button contract in both languages. Check the actual page flow and anchor in a browser at mobile and desktop widths before publishing.
