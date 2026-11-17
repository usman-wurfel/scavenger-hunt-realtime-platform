import type { Metadata } from "next";

import { toAbsoluteUrl } from "@/lib/app-url";
import { withCacheBust } from "@/lib/branding-assets";
import { getOrCreateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy & Terms of Play · 15Hunt",
  description:
    "Privacy Policy, Terms of Play & Liability for the 15Hunt scavenger hunt game.",
};

const LAST_UPDATED = "July 17, 2026";

const sectionStyle: React.CSSProperties = {
  marginTop: 32,
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

const listStyle: React.CSSProperties = {
  margin: "0 0 12px",
  paddingLeft: 20,
  fontSize: 15.5,
  lineHeight: 1.7,
  color: "#334155",
};

export default async function PrivacyPolicyPage() {
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
            <span
              style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}
            >
              {appName}
            </span>
          )}
        </div>
      </nav>

      <main
        style={{
          padding: "32px 16px",
        }}
      >
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
            Privacy Policy &amp; Terms of Play
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>
            15Hunt Scavenger Hunt · Last updated {LAST_UPDATED}
          </p>
        </header>

        <section style={sectionStyle}>
          <p style={paragraphStyle}>
            Welcome to 15Hunt. This page explains how we handle your information
            and the terms under which you take part in our scavenger hunt games.
            By downloading, accessing, or playing, you agree to the terms below.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Terms of Play &amp; Liability</h2>
          <p style={paragraphStyle}>
            By participating in this scavenger hunt, you agree that this game is
            free to play, intended for entertainment purposes only, and offers
            exactly one prize per game to the first eligible winner.
          </p>
          <p style={paragraphStyle}>
            The app is provided &ldquo;as is.&rdquo; We are not responsible for
            technical glitches, GPS inaccuracies, app errors, or any injuries,
            losses, or damages that occur during gameplay. Play safely, respect
            local laws, and stay aware of your surroundings.
          </p>
          <ul style={listStyle}>
            <li>The game is free to play and for entertainment only.</li>
            <li>
              Each game awards exactly one prize to the first eligible winner, as
              determined by our system records.
            </li>
            <li>
              You are solely responsible for your own safety and conduct while
              playing, including obeying all traffic, trespassing, and local
              laws.
            </li>
            <li>
              Do not play while driving or in any situation where the game could
              put you or others at risk.
            </li>
            <li>
              We may modify, pause, or cancel any hunt at any time without prior
              notice.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Information We Collect</h2>
          <p style={paragraphStyle}>
            To run the game and deliver a fair experience, we collect a limited
            amount of information:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Device identifier:</strong> a unique ID generated for your
              device so we can track your participation and scan progress within
              a hunt.
            </li>
            <li>
              <strong>Push notification token (FCM):</strong> used to send you
              hunt updates, reminders, and prize messages.
            </li>
            <li>
              <strong>Location data:</strong> your approximate/GPS location while
              a hunt is active, used to show nearby clues and proximity alerts.
              Location is used during gameplay and is not sold to third parties.
            </li>
            <li>
              <strong>Gameplay data:</strong> hunts you join, QR scans, scan
              rank/time, and prize claim status.
            </li>
            <li>
              <strong>An auto-generated username</strong> assigned to you for a
              hunt (you are not required to provide your real name).
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>How We Use Your Information</h2>
          <ul style={listStyle}>
            <li>Register and track your participation in a hunt.</li>
            <li>Determine scan order and the first eligible winner.</li>
            <li>
              Send push notifications about hunt start, reminders, prize
              messages, and admin announcements for hunts you join.
            </li>
            <li>Show live clues and proximity alerts based on your location.</li>
            <li>Improve the reliability and fairness of the game.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Push Notifications</h2>
          <p style={paragraphStyle}>
            If you join a hunt, you may receive notifications related to that
            hunt (for example, when it starts, when it is about to start, prize
            messages, and messages from the organizer). You can disable
            notifications at any time from your device settings.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Location Data</h2>
          <p style={paragraphStyle}>
            Location access is used only to power gameplay features such as
            nearby clues and proximity alerts while a hunt is active. GPS results
            can be inaccurate; we are not responsible for any consequences of
            GPS inaccuracy. You can revoke location permission at any time in
            your device settings, though this may limit gameplay.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data Sharing</h2>
          <p style={paragraphStyle}>
            We do not sell your personal information. We use trusted service
            providers (such as Firebase Cloud Messaging for notifications) solely
            to operate the app. We may disclose information if required by law or
            to protect the rights, safety, and property of our users or the
            public.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Data Retention</h2>
          <p style={paragraphStyle}>
            We retain gameplay and device data for as long as needed to operate
            the game, resolve prize eligibility, and comply with legal
            obligations. You may request deletion of your data by contacting us.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Children&rsquo;s Privacy</h2>
          <p style={paragraphStyle}>
            The game is intended for a general audience. If you believe a child
            has provided information without appropriate consent, please contact
            us so we can remove it.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Changes to This Policy</h2>
          <p style={paragraphStyle}>
            We may update this Privacy Policy and Terms of Play from time to
            time. The &ldquo;Last updated&rdquo; date above reflects the most
            recent changes. Continued use of the app after changes means you
            accept the updated terms.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={headingStyle}>Contact Us</h2>
          <p style={paragraphStyle}>
            If you have any questions about this Privacy Policy or the Terms of
            Play, please contact us at{" "}
            <a href="mailto:support@example.local" style={{ color: "#2563eb" }}>
              support@example.local
            </a>
            .
          </p>
        </section>

        <footer
          style={{
            marginTop: 36,
            paddingTop: 20,
            borderTop: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#94a3b8",
          }}
        >
          © {new Date().getFullYear()} 15Hunt. All rights reserved.
        </footer>
      </article>
      </main>
    </div>
  );
}
