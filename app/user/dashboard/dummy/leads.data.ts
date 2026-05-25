/** CRM lead row shape used by `/api/crm/leads`, Lead table, and Workflow. */
export type PreviewCRMLeadRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  externalId: string;
  provider: string;
  lastSyncedAt: string;
};

const synced = "2026-04-18T16:40:00.000Z";

function row(
  i: number,
  first: string,
  last: string,
  email: string,
  phone: string | null,
  company: string,
  externalId: string,
): PreviewCRMLeadRow {
  return {
    id: `pre-lead-${String(i).padStart(3, "0")}`,
    firstName: first,
    lastName: last,
    email,
    phone,
    company,
    externalId,
    provider: "HUBSPOT",
    lastSyncedAt: synced,
  };
}

/** Static contacts for dashboard preview (pagination matches API shape). */
export const PREVIEW_CRM_LEADS: PreviewCRMLeadRow[] = [
  row(1, "Morgan", "Ashley", "morgan.ashley@northwindcreative.com", "+14155550101", "Northwind Creative", "hs-10001"),
  row(2, "Riley", "Chen", "riley.chen@pixelloft.io", "+14155550102", "Pixelloft Studio", "hs-10002"),
  row(3, "Jordan", "Patel", "jordan.patel@brightlane.co", null, "Brightlane Media", "hs-10003"),
  row(4, "Casey", "Nguyen", "casey.nguyen@oakandanchor.com", "+14155550104", "Oak & Anchor", "hs-10004"),
  row(5, "Taylor", "Brooks", "t.brooks@signalhaus.com", "+14155550105", "Signalhaus", "hs-10005"),
  row(6, "Alex", "Rivera", "alex.rivera@liftline.agency", "+14155550106", "Liftline Agency", "hs-10006"),
  row(7, "Quinn", "Foster", "quinn.foster@marblehq.com", null, "Marble HQ", "hs-10007"),
  row(8, "Jamie", "Okonkwo", "jamie.okonkwo@fieldday.co", "+14155550108", "Fieldday", "hs-10008"),
  row(9, "Sam", "Ibrahim", "sam.ibrahim@stackrow.io", "+14155550109", "Stackrow", "hs-10009"),
  row(10, "Drew", "Martinez", "drew.martinez@northbeam.agency", "+14155550110", "Northbeam", "hs-10010"),
  row(11, "Reese", "Walsh", "reese.walsh@canvaspeak.com", null, "Canvaspeak", "hs-10011"),
  row(12, "Skyler", "Dunn", "skyler.dunn@relaymark.co", "+14155550112", "Relaymark", "hs-10012"),
  row(13, "Blake", "Singh", "blake.singh@threadline.us", "+14155550113", "Threadline", "hs-10013"),
  row(14, "Cameron", "Lee", "cameron.lee@habitatlabs.io", "+14155550114", "Habitat Labs", "hs-10014"),
  row(15, "Avery", "Hughes", "avery.hughes@kindredgrowth.com", null, "Kindred Growth", "hs-10015"),
  row(16, "Parker", "Kim", "parker.kim@loftspark.agency", "+14155550116", "Loftspark", "hs-10016"),
  row(17, "Rowan", "Scott", "rowan.scott@signalvine.co", "+14155550117", "Signalvine", "hs-10017"),
  row(18, "Emerson", "Gray", "emerson.gray@northcove.io", "+14155550118", "Northcove", "hs-10018"),
  row(19, "Finley", "Reed", "finley.reed@brightarc.com", null, "Brightarc", "hs-10019"),
  row(20, "Hayden", "Cole", "hayden.cole@trailheadmedia.com", "+14155550120", "Trailhead Media", "hs-10020"),
  row(21, "Logan", "Price", "logan.price@wavefront.agency", "+14155550121", "Wavefront", "hs-10021"),
  row(22, "Sage", "Turner", "sage.turner@compasslane.co", "+14155550122", "Compasslane", "hs-10022"),
  row(23, "River", "Hayes", "river.hayes@loftandladder.io", null, "Loft & Ladder", "hs-10023"),
  row(24, "Phoenix", "Bell", "phoenix.bell@northstarops.com", "+14155550124", "Northstar Ops", "hs-10024"),
  row(25, "Eden", "Ward", "eden.ward@kindframe.agency", "+14155550125", "Kindframe", "hs-10025"),
  row(26, "Marlowe", "Fox", "marlowe.fox@signalpath.co", "+14155550126", "Signalpath", "hs-10026"),
  row(27, "Indigo", "Stone", "indigo.stone@brightwell.io", null, "Brightwell", "hs-10027"),
  row(28, "Harper", "Vega", "harper.vega@trailmix.agency", "+14155550128", "Trailmix", "hs-10028"),
];

export function getPreviewLeadsPage(page: number, pageSize: number): {
  rows: PreviewCRMLeadRow[];
  total: number;
  totalPages: number;
} {
  const total = PREVIEW_CRM_LEADS.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const rows = PREVIEW_CRM_LEADS.slice(start, start + pageSize);
  return { rows, total, totalPages };
}

export function previewLeadById(id: string): PreviewCRMLeadRow | undefined {
  return PREVIEW_CRM_LEADS.find((l) => l.id === id);
}
