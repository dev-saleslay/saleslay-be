export type LegalSection = {
  heading: string;
  content: string[];
};

export type PrivacyPolicySection = {
  heading: string;
  subheading?: string;
  content?: string[];
  bullets?: string[];
};

export type TermsSection = {
  heading: string;
  content?: string[];
  bullets?: string[];
};

export type ContactSection = {
  heading: string;
  content?: string[];
  bullets?: string[];
};

export const privacyPolicyMeta = {
  lastUpdated: "April 2026",
  intro:
    "Welcome to SalesLay. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.",
};

export const privacyPolicySections: PrivacyPolicySection[] = [
  {
    heading: "1. Information We Collect",
    subheading: "1.1 Account Information",
    bullets: ["Name", "Email address", "Password (encrypted)"],
  },
  {
    heading: "1. Information We Collect",
    subheading: "1.2 Customer Data",
    bullets: [
      "Leads uploaded by you (name, email, phone, company)",
      "CRM data (if connected via integrations like HubSpot)",
    ],
  },
  {
    heading: "1. Information We Collect",
    subheading: "1.3 Usage Data",
    bullets: ["Login activity", "Feature usage", "Campaign performance data"],
  },
  {
    heading: "1. Information We Collect",
    subheading: "1.4 Communication Data",
    bullets: ["Messages sent via Email, SMS, RCS", "Replies received from leads"],
  },
  {
    heading: "2. How We Use Your Information",
    content: [
      "We use your data to provide and operate the SalesLay platform.",
      "We use your data to send automated follow-ups (Email, SMS, RCS).",
      "We analyze responses and improve performance.",
      "We improve product features and user experience.",
      "We provide customer support.",
    ],
  },
  {
    heading: "3. Data Sharing",
    content: [
      "We do NOT sell your data.",
      "We may share data with messaging providers (e.g., Twilio, email services), payment providers (e.g., Stripe), and CRM integrations (e.g., HubSpot) only to deliver core functionality.",
    ],
  },
  {
    heading: "4. Data Security",
    content: [
      "We implement industry-standard security measures including encryption of sensitive data, secure servers, and access control systems.",
      "However, no system is 100% secure.",
    ],
  },
  {
    heading: "5. Your Responsibilities",
    content: [
      "You are responsible for uploading leads with proper consent.",
      "You must comply with applicable laws (e.g., GDPR, CAN-SPAM, TCPA).",
      "You must ensure you have permission to contact leads.",
    ],
  },
  {
    heading: "6. Data Retention",
    content: [
      "We retain your data as long as your account is active or as required for legal compliance.",
      "You may request deletion at any time.",
    ],
  },
  {
    heading: "7. Third-Party Services",
    content: [
      "SalesLay uses third-party services such as Twilio (SMS, RCS), Email providers, and Stripe (payments).",
      "These services have their own privacy policies.",
    ],
  },
  {
    heading: "8. Your Rights",
    content: [
      "You may access your data, request correction, and request deletion.",
      "Contact us for any requests.",
    ],
  },
  {
    heading: "9. Changes to This Policy",
    content: [
      "We may update this Privacy Policy at any time. Updates will be posted on this page.",
    ],
  },
  {
    heading: "10. Contact Us",
    content: [
      "For any questions, email: support@saleslay.com",
    ],
  },
];

export const termsOfServiceMeta = {
  lastUpdated: "April 2026",
  intro: "By using SalesLay, you agree to the following terms.",
};

export const termsOfServiceSections: TermsSection[] = [
  {
    heading: "1. Service Overview",
    content: [
      "SalesLay is a lead reactivation platform that enables users to send automated follow-ups via Email, SMS, and RCS.",
    ],
  },
  {
    heading: "2. Eligibility",
    bullets: [
      "Be at least 18 years old",
      "Use the platform for lawful business purposes",
    ],
  },
  {
    heading: "3. User Responsibilities",
    content: [
      "You agree NOT to:",
      "You are fully responsible for your messaging activities.",
    ],
    bullets: [
      "Send spam or unsolicited messages",
      "Upload illegal or unauthorized data",
      "Violate any laws (GDPR, CAN-SPAM, TCPA, etc.)",
    ],
  },
  {
    heading: "4. Account Usage",
    bullets: [
      "You are responsible for maintaining account security",
      "Do not share login credentials",
      "Notify us of unauthorized access",
    ],
  },
  {
    heading: "5. Payments",
    bullets: [
      "Subscription: $199/month",
      "14-day free trial (no credit card required)",
      "Payments processed via Stripe",
    ],
    content: ["Failure to pay may result in account suspension."],
  },
  {
    heading: "6. Refund Policy",
    bullets: [
      "No refunds after billing cycle starts",
      "You may cancel anytime before next billing",
    ],
  },
  {
    heading: "7. Service Availability",
    content: [
      "We strive for uptime but do not guarantee uninterrupted service.",
    ],
  },
  {
    heading: "8. Limitation of Liability",
    content: [
      "SalesLay is not responsible for:",
      "Use the platform at your own risk.",
    ],
    bullets: [
      "Loss of business or revenue",
      "Message delivery failures",
      "Third-party service issues",
    ],
  },
  {
    heading: "9. Termination",
    content: ["We may suspend or terminate accounts for:"],
    bullets: [
      "Violating terms",
      "Abuse or misuse of the platform",
    ],
  },
  {
    heading: "10. Changes to Terms",
    content: [
      "We may update these terms at any time. Continued use means acceptance.",
    ],
  },
  {
    heading: "11. Contact",
    content: [
      "Email: support@saleslay.com",
    ],
  },
];

export const contactMeta = {
  intro: "We're here to help you get the most out of SalesLay.",
  closing: "We'll get back to you as soon as possible.",
};

export const contactSections: ContactSection[] = [
  {
    heading: "Email Support",
    content: ["support@saleslay.com"],
  },
  {
    heading: "Business Inquiries",
    content: ["sales@saleslay.com"],
  },
  {
    heading: "Support Hours",
    content: ["Monday - Friday", "9:00 AM - 6:00 PM (IST)"],
  },
  {
    heading: "Company Information",
    content: [
      "SalesLay",
      "(Your Company Name Here)",
      "India",
    ],
  },
  {
    heading: "Response Time",
    content: ["We typically respond within 24 hours."],
  },
  {
    heading: "Need Help Fast?",
    content: ["Email us with:"],
    bullets: [
      "Your account email",
      "Issue details",
      "Screenshots (if applicable)",
    ],
  },
];
