import "dotenv/config";
import express from "express";
import cors from "cors";
import { Resend } from "resend";

const app = express();


const PORT = Number(process.env.PORT || 3001);
const TO_EMAIL = process.env.TO_EMAIL || "rudoy.kolya@gmail.com";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing. Email sending will fail.");
}
const resend = new Resend(RESEND_API_KEY);


const ALLOWED_ORIGINS = [
    "https://auto-nine-zeta.vercel.app",
    "https://kubauto.lt",
];

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin) return cb(null, true);

            if (ALLOWED_ORIGINS.includes(origin)) {
                return cb(null, true);
            }

            return cb(null, false);
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type"],
    })
);

app.options(/.*/, cors());

app.use(express.json({ limit: "1mb" }));


app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
});


const normalizePhone = (v) => String(v || "").trim().replace(/[()\s-]/g, "");
const E164 = /^\+?[1-9]\d{7,14}$/;
const safe = (v, max = 5000) => String(v ?? "").replace(/\r/g, "").slice(0, max).trim();


app.post("/api/preorder", async (req, res) => {
    try {
        const b = req.body || {};

        // honeypot
        if (b.companyWebsite) return res.json({ ok: true });

        const phone = normalizePhone(b.phone);
        if (!E164.test(phone)) return res.status(400).send("Invalid phone format");

        const subject = `KUB AUTO Pre-Order: ${safe(b.make, 80)} ${safe(b.model, 80)} (${safe(b.year, 10)})`;

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
            replyTo: b.email || undefined,
            subject,
            text,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send("Failed to send email");
    }
});

app.post("/api/contact", async (req, res) => {
    try {
        const b = req.body || {};

        if (b.companyWebsite) return res.json({ ok: true });

        const name = safe(b.name, 140);
        const email = safe(b.email, 200);
        const message = safe(b.message, 3000);

        if (!name) return res.status(400).send("Name required");
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).send("Valid email required");
        if (message.length < 10) return res.status(400).send("Message too short");

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
            replyTo: email,
            subject,
            text,
        });

        return res.json({ ok: true });
    } catch (e) {
        console.error(e);
        return res.status(500).send("Failed to send email");
    }
});

app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});