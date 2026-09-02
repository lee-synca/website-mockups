# A.R.T Site Editor — backend deploy guide

This is the small Cloudflare Worker that powers the band's editor login and
commits their changes to the site. Do this once. ~10–15 minutes.

## 1. Create a GitHub token (scoped to just this repo)

1. Go to **github.com/settings/personal-access-tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name:** `A.R.T site editor`
3. **Resource owner:** `lee-synca`
4. **Expiration:** 1 year (set a reminder to renew).
5. **Repository access:** *Only select repositories* → **website-mockups**.
6. **Permissions:** expand **Repository permissions** → **Contents** → **Read and write**. (Leave everything else as "No access".)
7. **Generate token** → copy it (starts with `github_pat_…`). You'll paste it in step 3.

That token can only read/write files in this one repo — nothing else.

## 2. Create the Worker

**Easiest (dashboard):**
1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it **`art-site-editor`** → **Deploy** (it deploys a placeholder).
3. **Edit code** → delete the placeholder → paste the entire contents of **`worker/worker.js`** → **Deploy**.

**Or CLI:** from `art-editor/worker/`, run `npx wrangler deploy`.

## 3. Add the settings & secrets

In the Worker → **Settings** → **Variables and Secrets**:

**Plain variables (Text):**
| Name | Value |
|------|-------|
| `GH_OWNER` | `lee-synca` |
| `GH_REPO` | `website-mockups` |
| `GH_BRANCH` | `main` |
| `SITE_DIR` | `art` |
| `ALLOWED_ORIGIN` | `https://mockups.getsynca.com.au` |

**Secrets (Encrypt / “Secret” type):**
| Name | Value |
|------|-------|
| `GH_TOKEN` | the token from step 1 |
| `EDITOR_PASSWORD` | the shared password the band will type |
| `SESSION_SECRET` | any long random string (e.g. from a password generator, 30+ chars) |

Save/Deploy.

## 4. Send me the Worker URL

It looks like **`https://art-site-editor.<your-subdomain>.workers.dev`**
(shown at the top of the Worker page). Send it to me and I'll:
- test the login + save endpoints directly to confirm the backend works, and
- wire the editor app to it.

## Later: moving to the A.R.T repo / new domain

Only the plain variables change — update `GH_OWNER`, `GH_REPO`, `GH_BRANCH`,
`SITE_DIR`, `ALLOWED_ORIGIN` in the Worker settings. No code changes, no
re-deploy of the app.
