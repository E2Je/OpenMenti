# OpenMenti

חלופה חופשית וקוד פתוח ל-Mentimeter. מצגות אינטראקטיביות בזמן אמת, בעברית מלאה (RTL), עד ~150 משתתפים אנונימיים מהנייד - ללא עלות.

בנוי על **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, ו-**Supabase** (Auth + Realtime + Postgres).

---

## למה זה לא הורג את ה-Free Tier

150 משתתפים שכותבים ישירות ל-Postgres היו מפוצצים את המגבלות. במקום זה:

- **דפוס send-only:** משתתפים שולחים הצבעות דרך Realtime Broadcast מעל HTTP **בלי להירשם** לערוץ. רק מסך המנחה מנוי ב-websocket ומקבל. כך הצבעה מגיעה לנמען אחד (המנחה) ולא מתפזרת ל-149 המשתתפים האחרים.
- **התמדה מווסתת:** המנחה צובר את התוצאות בזיכרון ושומר ל-DB פעם ב-2 שניות לכל היותר.
- **ערוץ בקרה בתדירות נמוכה:** המנחה משדר החלפת שקופית; המשתתפים מסונכרנים מיידית.

ראה: `src/lib/realtime.ts`, `src/hooks/usePresenterSession.ts`.

---

## הקמה (5 דקות)

### 1. פרויקט Supabase
1. צרו פרויקט חינמי ב-[supabase.com](https://supabase.com).
2. ב-**SQL Editor** הריצו את כל התוכן של [`supabase/schema.sql`](supabase/schema.sql). זה יוצר את הטבלאות, האינדקסים ומדיניות ה-RLS.
3. ב-**Project Settings → API** העתיקו את `Project URL` ואת `anon public key`.

### 2. משתני סביבה
```bash
cp .env.local.example .env.local
```
מלאו ב-`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. הרצה
```bash
npm install
npm run dev
```
פתחו [http://localhost:3000](http://localhost:3000).

---

## מבנה המסכים

| נתיב | תיאור |
|---|---|
| `/` | דף נחיתה |
| `/login` | התחברות / הרשמה (Supabase Auth) |
| `/admin` | לוח בקרה - יצירת מצגות |
| `/admin/[id]` | עורך שקופיות בסגנון Mentimeter |
| `/present/[id]` | מסך מנחה - מסך מלא, QR, בקרות, ייצוא PDF |
| `/play` | משתתף - הזנת קוד הצטרפות |
| `/play/[id]` | תצוגת המשתתף בנייד, מסונכרנת לשקופית הפעילה |

---

## סוגי שקופיות

| סוג | סטטוס |
|---|---|
| הוראות + QR | ✅ |
| טקסט | ✅ |
| בחירה מרובה (גרף עמודות חי) | ✅ |
| ענן מילים (כולל סינון מילים גסה) | ✅ |
| שאלה פתוחה (כרטיסים + Focus Mode) | ⏳ בפיתוח |
| דירוג | ⏳ בפיתוח |
| סימון על תמונה | ⏳ בפיתוח |

---

## ייצוא PDF

מיושם ב-`src/lib/pdf.ts`. הדפדפן מרנדר את העברית (RTL + bidi תקין) ו-`html2canvas` מצלם, כך שנמנעים מבעיות הפונט/כיווניות של jsPDF. שקופיות ויזואליות מצולמות; טקסט ארוך (שאלה פתוחה) ירונדר בגובה מלא offscreen ויחולק לעמודים.

---

## פריסה (Vercel)

1. דחפו ל-GitHub.
2. ב-Vercel: **Import Project**, בחרו את הריפו.
3. הוסיפו את אותם משתני סביבה (כולל `NEXT_PUBLIC_SITE_URL` עם הדומיין של Vercel).
4. Deploy.

---

## רישיון
MIT
