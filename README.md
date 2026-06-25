# Montörsbokning – GitHub Pages + Supabase + Outlook-prenumeration

Detta paket är gjort för:

- GitHub Pages som webbapp
- Supabase som databas och inloggning
- Mobilanpassad adminvy
- Renare huvudsida
- Inställningsmeny för montörer och kalenderlänkar
- Signage-vy för TV/skärm
- Outlook-prenumeration via `.ics`-flöde

## Sidor

```text
index.html       Logga in
admin.html       Huvudsida: bokningar och kalender
settings.html    Inställningar: montörer och kalenderlänkar
display.html     Signage-vy
```

## 1. Skapa Supabase-projekt

1. Skapa ett projekt i Supabase.
2. Gå till **SQL Editor**.
3. Kör innehållet i `supabase_schema.sql`.

## 2. Skapa användare

I Supabase:

1. Gå till **Authentication**.
2. Skapa användare med e-post och lösenord.
3. Den användaren kan logga in i admin och settings.

## 3. Fyll i config.js

I Supabase, gå till **Project Settings → API** och kopiera:

- Project URL
- anon public key

Fyll i `config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxx.supabase.co",
  SUPABASE_ANON_KEY: "din-anon-key",
  COMPANY_NAME: "Firmanamn",
  CALENDAR_FUNCTION_URL: "https://xxxx.supabase.co/functions/v1/calendar-feed"
};
```

## 4. Lägg upp Edge Function för Outlook/ICS

Installera Supabase CLI och logga in.

Skapa/länka projektet:

```bash
supabase login
supabase link --project-ref DIN_PROJECT_REF
```

Lägg sedan upp funktionen:

```bash
supabase functions deploy calendar-feed --no-verify-jwt
```

Funktionen ligger i:

```text
supabase/functions/calendar-feed/index.ts
```

Viktigt: `--no-verify-jwt` behövs för att Outlook ska kunna läsa ICS-länken utan att logga in.

## 5. Testa lokalt

Kör en lokal server i mappen:

```bash
python -m http.server 8080
```

Öppna:

```text
http://localhost:8080
```

## 6. Publicera på GitHub Pages

1. Skapa GitHub-repo.
2. Lägg upp filerna.
3. Gå till **Settings → Pages**.
4. Välj branch `main` och root `/`.
5. Spara.

## 7. Outlook-prenumeration

I appen:

1. Logga in.
2. Gå till **Inställningar**.
3. Kopiera kalenderlänk för:
   - Alla bokningar
   - En specifik montör

I Outlook:

1. Öppna kalendern.
2. Välj **Lägg till kalender**.
3. Välj **Prenumerera från webben**.
4. Klistra in `.ics`-länken.

Observera att Outlook kan ha fördröjning innan ändringar syns.

## Säkerhet

- Admin och inställningar kräver Supabase-inloggning.
- Signage och ICS-länkar är läsbara utan inloggning.
- Ändringar i bokningar och montörer kräver inloggad användare.

Om ICS-länkarna ska vara privata kan funktionen byggas ut med en hemlig token.
