# Content authors and learner profiles

The course catalogue's `authors` entries are content credits; exercise `creator`
IDs are technical references used for ownership and filtering. Neither grants
access to a learner profile or their XP. These values remain in the catalogue
and exercise contracts, including for private authors.

The active course/lesson pages do not render an author profile or catalogue
author URL. The unused legacy `CourseHeader` component, which had raw author
links, is removed. Current-user profile navigation remains unchanged. The
publication UI prepares only the owner's preview, not a foreign profile route;
`profilePublicationEnabled` remains false by default.

Before adding any foreign person projection or profile link, implement the
server publication contract for the verified Academy audience and current
`academy-verified-v1` scope. Use the fixed field list and fresh publication
epoch; UUIDs, catalogue URLs, cached identities and client scope strings provide
no permission. Use private/no-store responses and the same refusal for private
and unknown foreign targets. Keep this separate from content access and private
owner/support APIs.

`content-owner-boundary.test.mjs` executes the actual exercise controller. A
private author's content loads and records the learner's own attempt without
fetching that author's identity, access or progress. Creator-based exclusion
for the learner's own exercises remains intact. Browser acceptance binds the
active course and lesson pages to this boundary. Challenges supplies separate
real SQL/route and publication tests.
