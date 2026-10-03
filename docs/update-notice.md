# In-app update notices

`UpdateNotice.vue` displays one sentence with a direct link and a close button in the normal page flow. It never submits consent or calls an API. Public legal/intake routes suppress it so their purpose remains clear.

`UPDATE_NOTICE_WINDOW` in `composables/updateNotice.ts` defines a version and an inclusive start/exclusive expiry in UTC. The mounted component checks expiry every minute and releases its timer/listener on unmount. For a future notice, change the version, window, link and DE/EN translations together. Previous version markers never suppress a new notice.

Only an explicit close stores `bootstrap-academy:update-notice:<version>:<subject>` in Local Storage. Guests use the browser subject; signed-in users use their validated, loaded account identifier. Dismissal is per browser and account, with no server synchronization. Cross-tab storage events also hide the notice. If browser storage is unavailable, the App-owned set keeps the dismissal for the current App lifetime, including layout changes. Account switches invalidate stale close handlers.

Run `node --test tests/update-notice.test.mjs` for guest/account isolation, reload, blocked storage, window boundaries, expiry, version changes and the real App/component/button contract in both languages. Check the actual page flow and anchor in a browser at mobile and desktop widths before publishing.
