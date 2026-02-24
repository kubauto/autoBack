import "dotenv/config";
import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();

/* =========================
   CONFIG
========================= */

const PORT = Number(process.env.PORT || 3001);
const TO_EMAIL = process.env.TO_EMAIL || "rudoy.kolya@gmail.com";
const PUBLIC_ORIGINS = [
    "https://<USERNAME>.github.io", // <-- замени
    "http://localhost:5173",        // dev
];

const resend = new Resend(process.env.RESEND_API_KEY);

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.json({ limit: "1mb" }));

/* =========================
   HELPERS
========================= */

const normalizePhone = (v) =>
    String(v || "").trim().replace(/[()\s-]/g, "");

const E164 = /^\+?[1-9]\d{7,14}$/;

const safe = (v, max = 5000) =>
    String(v ?? "").replace(/\r/g, "").slice(0, max).trim();

/* =========================
   PRE-ORDER
========================= */

app.post("/api/preorder", async (req, res) => {
    try {
        const b = req.body || {};

        // honeypot
        if (b.companyWebsite) return res.json({ ok: true });

        const phone = normalizePhone(b.phone);
        if (!E164.test(phone)) {
            return res.status(400).send("Invalid phone format");
        }

        const subject = `KUB AUTO Pre-Order: ${safe(b.make, 80)} ${safe(
            b.model,
            80
        )} (${safe(b.year, 10)})`;

        const text = `
PRE-ORDER REQUEST

Vehicle:
- Make: ${safe(b.make, 120)}
- Model: ${safe(b.model, 120)}
- Year: ${safe(b.year, 20)}
- Mileage: ${safe(b.mileage, 40)}
- Fuel: ${safe(b.fuelType, 40)}
- Body: ${safe(b.bodyType, 40)}
- Preferences: ${safe(b.preferences, 2000)}

Buyer:
- Type: ${safe(b.buyerType, 40)}
- Name / Company: ${safe(b.buyerName, 200)}
- Address: ${safe(b.address, 400)}
- Phone: ${phone}
- Email: ${safe(b.email, 200)}
`.trim();

        await resend.emails.send({
            from: "KUB AUTO <onboarding@resend.dev>",
            to: TO_EMAIL,
            reply_to: b.email || undefined,
            subject,
            text,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send("Failed to send email");
    }
});

/* =========================
   CONTACT
========================= */

app.post("/api/contact", async (req, res) => {
    try {
        const b = req.body || {};

        if (b.companyWebsite) return res.json({ ok: true });

        const name = safe(b.name, 140);
        const email = safe(b.email, 200);
        const message = safe(b.message, 3000);

        if (!name) return res.status(400).send("Name required");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).send("Valid email required");
        if (message.length < 10)
            return res.status(400).send("Message too short");

        const subject = `KUB AUTO Contact: ${name}`;

        const text = `
CONTACT MESSAGE

From:
- Name: ${name}
- Email: ${email}

Message:
${message}
`.trim();

        await resend.emails.send({
            from: "KUB AUTO <onboarding@resend.dev>",
            to: TO_EMAIL,
            reply_to: email,
            subject,
            text,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send("Failed to send email");
    }
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});