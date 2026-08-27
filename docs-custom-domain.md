# Custom Domain for PhysiX Academy (Vercel)

Your site is live at **https://physix-academy.vercel.app** (v67).
To use your own domain (e.g., `physixacademy.com`):

1. **Buy domain** (Namecheap / GoDaddy / Google Domains)
2. **Vercel → Project → Settings → Domains → Add** → enter `physixacademy.com` and `www.physixacademy.com`
3. **Add DNS records** at your registrar:
   - Type `A` → `76.76.21.21`
   - Type `CNAME` → `cname.vercel-dns.com` for `www`
4. Wait 5–30 min → Vercel auto-issues HTTPS

No code change needed — static site, no backend. Keep `physix-academy.vercel.app` as fallback.

Vercel Analytics: already added (`/_vercel/insights/script.js` + speed-insights) — enable in Vercel Dashboard → Analytics → Enable.

OG Image: `assets/og-image.png` (1200×630) updated — shows on WhatsApp/Twitter/LinkedIn previews. Test at https://www.opengraph.xyz/
