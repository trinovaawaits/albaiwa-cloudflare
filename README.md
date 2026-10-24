# Al-Bai' Wa Al-Shiraa (Cloudflare Pages)

Upload this whole folder to a new GitHub repository, then connect it to a Cloudflare Pages project.

Cloudflare Pages settings:
- Build command: (empty)
- Build output directory: public

Environment variables (Production, encrypted):
- SUPABASE_URL
- SUPABASE_SERVICE_KEY (the secret key)
- SESSION_SECRET (long random text)
- GEMINI_API_KEY
- OWNER_USERNAME (ceo)
- OWNER_PASSWORD (owner password)

Database: run supabase/schema.sql once in the Supabase SQL Editor.

Owner: tap the Trinova logo in the footer 3 times.
Shops: created and reset in the owner panel; shop tap the shop logo 3 times.
