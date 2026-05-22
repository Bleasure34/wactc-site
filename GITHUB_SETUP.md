# GitHub + Auto-Deploy Setup

## One-time setup — do this once, then auto-deploy works forever.

---

## STEP 1: Create the GitHub Repo

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `wactc-site`
   - **Visibility:** Private ← important (keeps your code private)
   - Leave everything else unchecked
3. Click **Create repository**
4. Copy the repo URL shown — it will look like:
   `https://github.com/YOUR-USERNAME/wactc-site.git`

---

## STEP 2: Push the site to GitHub

Open **Git Bash** (or any terminal) and run these commands.
Replace `YOUR-USERNAME` with your actual GitHub username.

```bash
cd "C:\Users\Brad\Documents\TNT Main\Customers\WACTC\WACTC Site"
git init
git branch -M main
git add .
git commit -m "Initial commit — WACTC site 5-22-26"
git remote add origin https://github.com/YOUR-USERNAME/wactc-site.git
git push -u origin main
```

If prompted for credentials, use your GitHub username and a **Personal Access Token**
(not your password). Create one at: https://github.com/settings/tokens/new
- Give it a name like "WACTC deploy"
- Check the **repo** scope
- Click Generate and copy the token — paste it as your password

---

## STEP 3: Get your Hostinger FTP credentials

1. Log in to Hostinger hPanel: https://hpanel.hostinger.com
2. Go to **Hosting → Manage → Files → FTP Accounts**
3. Note down (or create) an FTP account for `wactc.tntmanufacturing.shop`:
   - **FTP Host** (e.g. `ftp.tntmanufacturing.shop` or an IP address)
   - **FTP Username**
   - **FTP Password**

---

## STEP 4: Add FTP secrets to GitHub

1. Go to your repo on GitHub
2. Click **Settings → Secrets and variables → Actions**
3. Click **New repository secret** and add each of these:

| Secret Name    | Value                          |
|----------------|--------------------------------|
| `FTP_HOST`     | Your Hostinger FTP host        |
| `FTP_USERNAME` | Your Hostinger FTP username    |
| `FTP_PASSWORD` | Your Hostinger FTP password    |

---

## STEP 5: Verify it worked

After pushing in Step 2, GitHub Actions will automatically run the deploy.

1. Go to your repo → click the **Actions** tab
2. You should see a workflow run called "Deploy to Hostinger"
3. Click it to see the progress — green checkmark = success
4. Visit https://wactc.tntmanufacturing.shop to confirm the site loaded

---

## How to deploy changes going forward

Whenever you make a change to any file in `WACTC Site`:

```bash
cd "C:\Users\Brad\Documents\TNT Main\Customers\WACTC\WACTC Site"
git add .
git commit -m "describe what you changed"
git push
```

That's it — the site updates automatically within ~60 seconds.

---

## Notes

- The `supabase/` folder (edge functions) is **excluded** from FTP deploy.
  Deploy those separately using `switch-and-deploy-production.bat` in the backup folder.
- The `.github/` folder itself is also excluded from the upload — Hostinger doesn't need it.
