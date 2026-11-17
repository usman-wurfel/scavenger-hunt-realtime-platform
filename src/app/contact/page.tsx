import type { Metadata } from "next";

import { toAbsoluteUrl } from "@/lib/app-url";
import { withCacheBust } from "@/lib/branding-assets";
import { getOrCreateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Us · 15Hunt",
  description:
    "Get in touch with the 15Hunt team for support, questions, or feedback about the scavenger hunt game.",
};

const CONTACT_PHONE_DISPLAY = "+92 312 9014938";
const CONTACT_PHONE_TEL = "+923129014938";
const CONTACT_EMAIL = "support@example.local";

const sectionStyle: React.CSSProperties = {
  marginTop: 28,
};

const headingStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: "0 0 12px",
  color: "#0f172a",
};

const paragraphStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 15.5,
  lineHeight: 1.7,
  color: "#334155",
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 18px",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#f8fafc",
  marginBottom: 12,
  textDecoration: "none",
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#64748b",
  margin: 0,
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 16.5,
  fontWeight: 700,
  color: "#0f172a",
  margin: "2px 0 0",
};

const iconWrapStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  flexShrink: 0,
  borderRadius: 10,
  background: "#e0f2fe",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
};

export default async function ContactUsPage() {
  const settings = await getOrCreateSettings();
  const logoSrc = withCacheBust(
    toAbsoluteUrl(settings.logo),
    settings.updatedAt.toISOString(),
  );
  const appName = settings.appName || "15Hunt";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={appName}
              height={90}
              width={90}
              style={{ height: 90, width: 90, objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
              {appName}
            </span>
          )}
        </div>
      </nav>

      <main style={{ padding: "32px 16px" }}>
        <article
          style={{
            maxWidth: 760,
            margin: "0 auto",
            background: "#ffffff",
            borderRadius: 16,
            padding: "36px 28px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
          }}
        >
          <header style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: "#0f172a" }}>
              Contact Us
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>
              We&rsquo;re here to help with the {appName} scavenger hunt.
            </p>
          </header>

          <section style={sectionStyle}>
            <p style={paragraphStyle}>
              Have a question, need help during a hunt, or want to report an
              issue? Reach out to us using any of the options below and our team
              will get back to you as soon as possible.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Get in touch</h2>

            <a href={`tel:${CONTACT_PHONE_TEL}`} style={cardStyle}>
              <span style={iconWrapStyle} aria-hidden>
                📞
              </span>
              <span>
                <p style={cardLabelStyle}>Phone / WhatsApp</p>
                <p style={cardValueStyle}>{CONTACT_PHONE_DISPLAY}</p>
              </span>
            </a>

            <a href={`mailto:${CONTACT_EMAIL}`} style={cardStyle}>
              <span style={iconWrapStyle} aria-hidden>
                ✉️
              </span>
              <span>
                <p style={cardLabelStyle}>Email</p>
                <p style={cardValueStyle}>{CONTACT_EMAIL}</p>
              </span>
            </a>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Support hours</h2>
            <p style={paragraphStyle}>
              Our support team is available Monday to Saturday, 9:00 AM to 6:00
              PM (PKT). Messages received outside these hours will be answered on
              the next working day.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>What to include</h2>
            <p style={paragraphStyle}>
              To help us assist you faster, please include the following when you
              contact us:
            </p>
            <ul
              style={{
                margin: "0 0 12px",
                paddingLeft: 20,
                fontSize: 15.5,
                lineHeight: 1.7,
                color: "#334155",
              }}
            >
              <li>The hunt name or event code (if applicable).</li>
              <li>The username shown in your app.</li>
              <li>A short description of the issue or question.</li>
              <li>Your device type (Android / iPhone), if reporting a bug.</li>
            </ul>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>More information</h2>
            <p style={paragraphStyle}>
              You can review how we handle your data and the rules of play on our{" "}
              <a href="/privacy-policy" style={{ color: "#2563eb" }}>
                Privacy Policy &amp; Terms of Play
              </a>{" "}
              page.
            </p>
          </section>

          <footer
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid #e2e8f0",
              fontSize: 13,
              color: "#94a3b8",
            }}
          >
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </footer>
        </article>
      </main>
    </div>
  );
}
