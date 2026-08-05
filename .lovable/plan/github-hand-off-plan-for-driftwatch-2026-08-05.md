# GitHub hand-off plan for DriftWatch

Goal: push the current DriftWatch codebase to a public GitHub repository using Lovable's built-in Git sync, then clean up the repo so it looks like a real project rather than a Lovable template.

## 1. Connect GitHub sync in Lovable

This is a one-time UI action that only the project owner can complete.

1. Open the DriftWatch project in the Lovable editor.
2. Click the **Plus (+)** menu in the chat input (bottom-left) → **GitHub** → **Connect project**.
3. Authorize the **Lovable GitHub App** when prompted.
4. Select the GitHub account/organization that should own the repo.
5. Choose **Create Repository** and name it `driftwatch` (or another repo name you prefer).
6. Set visibility to **Public**.
7. Lovable will push the current codebase to the new repo automatically.

After this step, every future change in Lovable will push to GitHub, and pushes to GitHub will sync back to Lovable.

## 2. Verify the first sync

1. Open the new repo on GitHub (`https://github.com/<you>/driftwatch`).
2. Confirm the latest commit is from Lovable and the full file tree is present (`src/`, `supabase/`, `package.json`, `README.md`, etc.).
3. Check that the `.gitignore` is correctly excluding:
   - `node_modules/`, `dist/`, `.output/`, `.vinxi/`, `.tanstack/**`, `.nitro/`, `*.local`
   - `.wrangler/`, `.dev.vars`
   - editor files and logs

## 3. Clean up the repository for public use

The current README is the generic Lovable template. Replace it with a project-specific README that explains what DriftWatch does and how to run it.

Also create a `.env.example` file so contributors know which environment variables are required without exposing any real secrets.

No source code changes are needed for the Git sync itself; these are presentation-only files.

## 4. Optional best-practice extras

- Add a `LICENSE` file (e.g., MIT) if you want others to use or fork the project.
- Add a GitHub repo description, topics/tags, and a link to the live Lovable preview URL.
- Consider enabling branch protection on `main` after the first sync if you plan to accept external contributions.

## 5. What I will do once you approve

Once you confirm the GitHub repo is connected, I can:

1. Replace the generic README with a DriftWatch-specific README.
2. Create a `.env.example` with the required variables (no secrets).
3. Optionally add a license file.

These changes will then sync to GitHub automatically through Lovable's two-way sync.

## Next step for you

Please complete the GitHub connection in the Lovable UI first, then tell me the repo name/URL and I will do the cleanup in step 3.