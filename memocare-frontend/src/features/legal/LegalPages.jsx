import { Link } from 'react-router-dom';
import { useDocumentMeta } from '../../components/seo/DocumentMeta';
import '../auth/auth.css';

const UPDATED = 'October 22, 2026';

function LegalLayout({ eyebrow, title, metaDescription, children }) {
  useDocumentMeta({ title, description: metaDescription });
  return (
    <div className="legal-page">
      <div className="auth-card" style={{ maxWidth: 760, width: '100%' }}>
        <p className="field-hint" style={{ marginBottom: 4 }}>{eyebrow} · Last updated {UPDATED}</p>
        <h1 style={{ marginBottom: 18 }}>{title}</h1>
        {children}
        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '26px 0 14px' }} />
        <p style={{ fontSize: 13, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/cookies">Cookie Policy</Link>
          <Link to="/login">Back to MemoCare</Link>
        </p>
      </div>
    </div>
  );
}

const S = ({ children }) => <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 10 }}>{children}</p>;
const H = ({ children }) => <h2 style={{ fontSize: 17, margin: '22px 0 8px' }}>{children}</h2>;
const L = ({ items }) => (
  <ul style={{ margin: '0 0 10px 20px', fontSize: 14, lineHeight: 1.65 }}>
    {items.map((it) => <li key={it}>{it}</li>)}
  </ul>
);

export function PrivacyPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Privacy Policy"
      title="Privacy Policy"
      metaDescription="How MemoCare collects, protects, uses, and shares patient and caretaker data."
    >
      <S>MemoCare ("we", "us") helps families and hospitals monitor memory health. This policy explains what data we collect, why we need it, and the protections around it.</S>
      <H>1. Data we collect</H>
      <L items={[
        'Account details: name, email address, phone number, role (caretaker, family, hospital staff, medical store, hospital management).',
        'Patient details (entered by you or your hospital): name, date of birth, notes, medical history — these are encrypted at rest.',
        'Voice recordings you upload for speech analysis, plus the analysis results they generate.',
        'App activity: screening test attempts, medication schedules, reminders, notifications.',
        'Technical logs: IP address, browser type, page activity for security and debugging.',
      ]} />
      <H>2. How we use the data</H>
      <L items={[
        'To provide the service: analyze voice recordings, score screening games, show trends and reports.',
        'To alert linked caretakers and hospital staff about HIGH risk results.',
        'To secure the service: detect abuse, spam, and unauthorized access.',
        'To email you essential notices (account verification, password reset, security alerts).',
      ]} />
      <H>3. Who can see what</H>
      <S>Access is enforced in the server, not just hidden in the app: hospital staff only see patients belonging to their hospital; family and caretakers only see patients they are linked to; system administrators have full access for support. A medical store account never has access to patient data.</S>
      <H>4. Data we do NOT sell</H>
      <S>We never sell your data. We never use patient health data for advertising. We share data only with service providers that help the app run (for example the database and email providers), under strict confidentiality.</S>
      <H>5. Security measures</H>
      <L items={[
        'Passwords are hashed with bcrypt; sessions use short-lived signed tokens.',
        'Sensitive patient fields are encrypted at rest.',
        'All traffic must use HTTPS; security headers and rate limiting protect every request.',
        'Every data request is scope-checked against the logged-in user.',
      ]} />
      <H>6. Your rights</H>
      <S>You may request a copy of your data, correction of wrong data, or deletion of your account by contacting your hospital administrator or emailing us. Deleting an account removes its personal data; anonymized analytics may be retained.</S>
      <H>7. Children</H>
      <S>MemoCare is intended for adult use, by patients and their caretakers. We do not knowingly create accounts for children under 13.</S>
      <H>8. Contact</H>
      <S>Any questions about the Privacy Policy can be raised via the Support section of the app or the email address printed on your hospital's account.</S>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Terms & Conditions"
      title="Terms & Conditions"
      metaDescription="The rules of using MemoCare: acceptable use, medical disclaimer, accounts, and liability."
    >
      <S>By creating an account or continuing to use MemoCare you agree to these Terms. If you do not agree, please stop using the service.</S>
      <H>1. Medical disclaimer — important</H>
      <S><strong>MemoCare is a screening and monitoring aid, not a doctor.</strong> Risk scores and reports are only indicators that help you talk to qualified medical professionals. We are not responsible for any medical treatment, delay in treatment, or diagnosis decision made on the basis of MemoCare output alone.</S>
      <H>2. Acceptable use</H>
      <L items={[
        'Use your own account only; do not share credentials with other people.',
        'Do not upload recordings of another person without their permission.',
        'Do not attempt to bypass rate limits, security controls, or other users\' access.',
        'Do not scrape, reverse-engineer, or attempt to overload (DDoS) the service.',
      ]} />
      <S>Breaking these rules may lead to immediate suspension of your account.</S>
      <H>3. Accounts and roles</H>
      <S>MemoCare has multiple roles (family, caretaker, hospital staff, medical store, hospital management). You should use the role that matches your real relationship with the patient. Hospital staff accounts must be approved by their hospital.</S>
      <H>4. Uploading content</H>
      <S>You keep ownership of any recordings or notes you upload. You allow us to store and process the uploaded audio and any analysis results, strictly for the purpose of providing the service to you and the patients you are authorized to help.</S>
      <H>5. Availability</H>
      <S>We try to keep the service online at all times, but we cannot promise an uninterrupted, error-free service. There may be scheduled maintenance, temporary outages, or discontinued features; important clinical decisions should never depend solely on availability of this service.</S>
      <H>6. Limitation of liability</H>
      <S>To the extent permitted by law, MemoCare is not liable for indirect or consequential damages (loss of data, loss of information, loss of production). Our total liability for any claim connected to the service is limited to the amount you paid us for the service in the previous 12 months.</S>
      <H>7. Changes to these terms</H>
      <S>We may update these terms as the product evolves; the "Last updated" date here will change. If the changes are significant, you will be notified through the app.</S>
    </LegalLayout>
  );
}

export function CookiePolicyPage() {
  return (
    <LegalLayout
      eyebrow="Cookie Policy"
      title="Cookie Policy"
      metaDescription="What cookies and local storage MemoCare uses and how you can control them."
    >
      <S>Cookies are small pieces of data a website stores on your device. MemoCare uses very few — this page explains exactly what we store, and how you can change your choice.</S>
      <H>Cookies / storage we use</H>
      <L items={[
        'Auth cookie (essential): keeps you logged in securely. Cannot be disabled, the app cannot function without it.',
        'Session storage (essential): language / theme preferences for the current visit.',
        'Cookie consent reminder (your choice): remembers that you answered the cookie banner so it does not appear again. Stores one word: "accepted" or "essential".',
      ]} />
      <H>What we do NOT do</H>
      <L items={[
        'No advertising cookies, no tracking pixels, no third-party analytics cookies.',
        'No profiling or cross-site tracking of any kind.',
      ]} />
      <H>Changing your choice</H>
      <S>You can clear your browser's cookies and site data for MemoCare at any time — the banner will appear again on your next visit, and "essential only" still lets in the usual functionality of the app.</S>
    </LegalLayout>
  );
}
