export const APP_NAME = 'Digital Gram Panchayat';
export const APP_SHORT_NAME = 'DGP';

export const API_VERSION = 'v1';

export const SUPPORTED_LANGUAGES = ['en', 'mr'];
export const DEFAULT_LANGUAGE = 'mr';

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const COMPLAINT_CATEGORIES = ['Road', 'WaterSupply', 'Sanitation', 'Electricity', 'Other'];

export const COMPLAINT_STATUSES = ['Pending', 'InProgress', 'Resolved'];

export const COMPLAINT_PRIORITIES = ['Low', 'Medium', 'High'];

export const NOTICE_CATEGORIES = [
  'General',
  'WaterSupply',
  'Electricity',
  'Health',
  'Event',
  'Emergency',
  'Tax',
  'Other',
];

export const BROADCAST_CHANNELS = ['sms', 'voice'];

// SMS body cap for broadcast summaries (blueprint 5.3).
export const SMS_SUMMARY_MAX_LENGTH = 160;

export const ATTACHMENT_TYPES = ['pdf', 'image'];

export const SCHEME_CATEGORIES = [
  'Agriculture',
  'Health',
  'Education',
  'Housing',
  'Employment',
  'Women',
  'SeniorCitizen',
  'Financial',
  'Other',
];

// Village event categories — single source for the model enum + both portals.
export const EVENT_CATEGORIES = [
  'RepublicDay',
  'IndependenceDay',
  'GramSabha',
  'TreePlantation',
  'HealthCamp',
  'BloodDonation',
  'Sports',
  'FarmerWorkshop',
  'SelfHelpGroup',
  'GovernmentProgram',
  'Festival',
  'SchoolEvent',
  'RoadInauguration',
  'VillageDevelopment',
  'Other',
];

// Gram Panchayat directory members — single source for the model enum + both portals.
export const MEMBER_STATUSES = ['Active', 'Retired', 'Temporary'];

// Category groups, in display priority: office bearers first, then ward, committee, others.
export const MEMBER_CATEGORIES = ['OfficeBearer', 'WardMember', 'Committee', 'Other'];

export const TAX_TYPES = ['Property', 'Water'];

export const PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid'];

export const PAYMENT_STATUS_COLOR_MAP = {
  Unpaid: 'red',
  Partial: 'orange',
  Paid: 'green',
};

/**
 * Certificate types a citizen can apply for today. Drives the application form, create-time
 * validation and the type labels.
 */
export const CERT_TYPES = ['Marriage', 'Birth', 'Death', 'SevenTwelve', 'Other'];

/**
 * Types withdrawn from new applications but still held in the database.
 *
 * Residence certificates were issued before Marriage replaced them. Those records must keep
 * opening, printing and appearing in officer filters, so the type stays valid everywhere a
 * stored record is read — it is only absent from the list a citizen can choose from. Dropping
 * it from the model enum instead would make every historical application unsaveable.
 */
export const CERT_TYPES_LEGACY = ['Residence'];

/** Every type that may appear on a stored record: use this for schemas, filters and labels. */
export const CERT_TYPES_ALL = [...CERT_TYPES, ...CERT_TYPES_LEGACY];

/**
 * Village services that publish a recurring schedule.
 *
 * Two today. The list is here rather than inline in the model so the officer form, the citizen
 * screen and the API validator all offer exactly the same set.
 */
/**
 * The village's six wards.
 *
 * One list, read by the registration form, the user schema, every officer filter and the
 * timetable. Ward is an administrative boundary the Panchayat already works in, so it is a
 * fixed enum rather than free text — a typo in a ward name silently removes a citizen from
 * the filter their officer uses to find them.
 */
export const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6'];

/**
 * A timetable slot that applies to the whole village rather than one ward.
 *
 * Kept out of WARDS deliberately: it is a valid value for a schedule but never a valid value
 * for a citizen, and folding it into one list would let somebody register as "All Wards".
 */
export const WARD_ALL = 'All Wards';

/** Every ward a timetable entry may carry. */
export const TIMETABLE_WARDS = [WARD_ALL, ...WARDS];

/**
 * The officer filter value for records whose citizen never had a ward recorded — the accounts
 * and rows that predate the ward field. It is a filter token, never a stored value: nothing is
 * backfilled, so "not set" means exactly that.
 */
export const WARD_UNSET = 'unset';

export const TIMETABLE_SERVICES = ['Ghantagadi', 'WaterSupply'];

/**
 * Days a slot can fall on. 'Daily' is a real answer, not a convenience: many village water
 * supplies run every day, and spelling that as seven identical rows would make the schedule
 * harder to read and harder to keep correct.
 */
export const TIMETABLE_DAYS = [
  'Daily',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** 24-hour wall clock, "HH:mm". Anchored, so "9:00" and "25:00" are both rejected. */
export const TIME_HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAKHALA_STATUSES = ['Submitted', 'UnderReview', 'Approved', 'Rejected'];

export const DAKHALA_STATUS_COLOR_MAP = {
  Submitted: 'orange',
  UnderReview: 'orange',
  Approved: 'blue',
  Rejected: 'red',
};

// Dynamic per-type application fields. Backend validates required keys against these;
// the citizen form renders inputs from the same map (single source).
export const CERT_TYPE_FIELDS = {
  Marriage: [
    { key: 'groomName', label: "Groom's full name", type: 'text', required: true },
    { key: 'brideName', label: "Bride's full name", type: 'text', required: true },
    { key: 'marriageDate', label: 'Date of marriage', type: 'date', required: true },
    { key: 'marriagePlace', label: 'Place of marriage', type: 'text', required: true },
    { key: 'mobile', label: 'Mobile number', type: 'text', required: true },
    { key: 'address', label: 'Address', type: 'textarea', required: true },
  ],
  // Kept so a historical Residence application still renders its own fields on the detail
  // screen. It is not offered for new applications — see CERT_TYPES_LEGACY.
  Residence: [
    { key: 'fullName', label: 'Full name', type: 'text', required: true },
    { key: 'mobile', label: 'Mobile number', type: 'text', required: true },
    { key: 'address', label: 'Address', type: 'textarea', required: true },
  ],
  Birth: [
    { key: 'childName', label: 'Child name', type: 'text', required: true },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
    { key: 'placeOfBirth', label: 'Place of birth', type: 'text', required: true },
    { key: 'fatherName', label: "Father's name", type: 'text', required: true },
    { key: 'motherName', label: "Mother's name", type: 'text', required: true },
  ],
  Death: [
    { key: 'deceasedName', label: 'Name of deceased', type: 'text', required: true },
    { key: 'dateOfDeath', label: 'Date of death', type: 'date', required: true },
    { key: 'placeOfDeath', label: 'Place of death', type: 'text', required: true },
    { key: 'relationToApplicant', label: 'Relation with applicant', type: 'text', required: true },
  ],
  SevenTwelve: [
    { key: 'surveyNumber', label: 'Survey number', type: 'text', required: true },
    { key: 'gatNumber', label: 'Gat number', type: 'text', required: true },
    { key: 'village', label: 'Village', type: 'text', required: true },
    { key: 'taluka', label: 'Taluka', type: 'text', required: true },
    { key: 'district', label: 'District', type: 'text', required: true },
  ],
  Other: [
    { key: 'certificateTitle', label: 'Certificate title', type: 'text', required: true },
    { key: 'purpose', label: 'Purpose', type: 'text', required: true },
    { key: 'description', label: 'Description', type: 'textarea', required: true },
  ],
};

/** Every document kind a citizen can attach. Used for the per-file `docType` selector. */
export const CERT_DOC_TYPES = [
  'Aadhaar',
  'PAN',
  'VoterId',
  'Passport',
  'DrivingLicence',
  'RationCard',
  'ElectricityBill',
  'WaterBill',
  'PropertyTaxReceipt',
  'SelfDeclaration',
  'HospitalBirthReport',
  'DoctorMedicalCertificate',
  'DoctorDeathCertificate',
  'AadhaarOfRelative',
  'Existing712',
  'Existing8A',
  'PropertyRecord',
  'MarriageInvitation',
  'MarriagePhotograph',
  'WitnessIdentity',
  'Supporting',
];

/**
 * Required document groups per certificate type. Each group needs at least one uploaded file
 * whose `docType` is in `anyOf`. Backend enforces this and the citizen form renders one
 * uploader per group from the same map (single source of truth).
 */
export const CERT_DOC_REQUIREMENTS = {
  Marriage: [
    {
      key: 'coupleIdentity',
      required: true,
      anyOf: ['Aadhaar', 'PAN', 'VoterId', 'Passport', 'DrivingLicence'],
    },
    {
      key: 'marriageProof',
      required: true,
      anyOf: ['MarriageInvitation', 'MarriagePhotograph'],
    },
    { key: 'witnessIdentity', required: false, anyOf: ['WitnessIdentity', 'Aadhaar'] },
    { key: 'selfDeclaration', required: true, anyOf: ['SelfDeclaration'] },
  ],
  // Retained for historical records only. See CERT_TYPES_LEGACY.
  Residence: [
    {
      key: 'identity',
      required: true,
      anyOf: ['Aadhaar', 'PAN', 'VoterId', 'Passport', 'DrivingLicence'],
    },
    {
      key: 'address',
      required: true,
      anyOf: ['RationCard', 'ElectricityBill', 'WaterBill', 'PropertyTaxReceipt'],
    },
    { key: 'selfDeclaration', required: true, anyOf: ['SelfDeclaration'] },
  ],
  Birth: [
    {
      key: 'birthProof',
      required: true,
      anyOf: ['HospitalBirthReport', 'DoctorMedicalCertificate'],
    },
    { key: 'parentIdentity', required: true, anyOf: ['Aadhaar', 'PAN', 'VoterId'] },
    {
      key: 'parentAddress',
      required: true,
      anyOf: ['Aadhaar', 'RationCard', 'ElectricityBill', 'WaterBill'],
    },
  ],
  Death: [
    { key: 'deathProof', required: true, anyOf: ['DoctorDeathCertificate'] },
    { key: 'deceasedIdentity', required: true, anyOf: ['Aadhaar', 'PAN', 'VoterId'] },
    {
      key: 'addressProof',
      required: true,
      anyOf: ['Aadhaar', 'RationCard', 'ElectricityBill', 'WaterBill'],
    },
    { key: 'applicantIdentity', required: true, anyOf: ['AadhaarOfRelative'] },
  ],
  SevenTwelve: [
    { key: 'identity', required: true, anyOf: ['Aadhaar', 'PAN', 'VoterId', 'Passport'] },
    { key: 'landProof', required: true, anyOf: ['Existing712', 'Existing8A', 'PropertyRecord'] },
  ],
  Other: [{ key: 'supporting', required: true, anyOf: ['Supporting'] }],
};

export const MAX_CERT_DOCUMENTS = 5;

/**
 * Chart palette for the officer dashboard (recharts).
 *
 * Recharts wants literal colours, not CSS variables, so this is the one place the design
 * tokens are repeated as hex. Keep it in step with the semantic colours in the apps'
 * `styles/index.css`: primary, warning, danger, info, then two neutral extensions for
 * series beyond the semantic four.
 */
export const CHART_COLORS = [
  '#1E3A8A', // primary royal blue
  '#0F766E', // teal
  '#D97706', // amber
  '#2563EB', // info blue
  '#334155', // slate
  '#64748B', // muted
];

// ---- Notifications ----
export const NOTIFICATION_CHANNELS = ['inApp', 'sms', 'voice', 'email'];
export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'];
export const NOTIFICATION_STATUSES = ['queued', 'sent', 'delivered', 'failed'];
export const NOTIFICATION_MODULES = [
  'auth',
  'complaint',
  'notice',
  'scheme',
  'tax',
  'certificate',
  'system',
];
export const NOTIFICATION_MAX_RETRIES = 3;
export const NOTIFICATION_TYPE_COLOR_MAP = {
  info: 'blue',
  success: 'green',
  warning: 'orange',
  error: 'red',
};

export const STATUS_COLOR_MAP = {
  Pending: 'orange',
  Submitted: 'orange',
  InProgress: 'orange',
  UnderReview: 'orange',
  Resolved: 'green',
  Approved: 'blue',
  Rejected: 'red',
};

// ---- PWA / Offline (M10) ----
// Cache bucket names (Workbox runtime caching + app shell). Kept here so the SW config
// and any in-app cache inspection reference the exact same strings.
export const PWA_CACHE_NAMES = {
  appShell: 'dgp-app-shell',
  static: 'dgp-static-assets',
  images: 'dgp-images',
  api: 'dgp-api',
};

// Background-sync tag registered on the service worker for queued complaint submissions.
export const SYNC_TAG_COMPLAINTS = 'dgp-sync-complaints';

// IndexedDB database used by the citizen PWA to queue offline complaint submissions.
export const OFFLINE_DB = {
  name: 'dgp-offline',
  version: 1,
  stores: {
    // Queue of complaint submissions made while offline. Each record carries its own
    // Idempotency-Key so a replay on reconnect can never create a duplicate.
    complaintQueue: 'complaint-queue',
  },
};

// API path prefixes and their runtime caching strategy — read offline where the blueprint
// requires (Notices/Schemes/Tax/Profile via NetworkFirst; static via StaleWhileRevalidate).
export const API_CACHE_ROUTES = {
  networkFirst: ['/api/v1/notices', '/api/v1/schemes', '/api/v1/tax', '/api/v1/auth/me'],
};

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, per SRS 4.2.1
export const MAX_COMPLAINT_PHOTOS = 3;

// ---- Auth ----
// Role values match the Role enum (citizen | officer). The admin portal authenticates
// officers; "admin" in route paths is cosmetic, the token role claim is 'officer'.
export const ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
};

export const TOKEN_STORAGE_KEY = 'dgp_token';
export const USER_STORAGE_KEY = 'dgp_user';
export const ADMIN_TOKEN_STORAGE_KEY = 'dgp_admin_token';
export const ADMIN_USER_STORAGE_KEY = 'dgp_admin_user';

// Field rules — single source shared by frontend RHF validation + backend express-validator.
export const VALIDATION = {
  MOBILE_REGEX: /^[6-9]\d{9}$/,
  MOBILE_MESSAGE: 'Enter a valid 10-digit Indian mobile number',
  PASSWORD_MIN_LENGTH: 8,
  FULLNAME_MIN_LENGTH: 2,
  FULLNAME_MAX_LENGTH: 100,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

/* ------------------------------------------------------------------------------------------
 * Smart governance modules (Phase 4). Each enum is the single source for the Mongoose enum
 * and both portals' filters, exactly as the older modules do it.
 * ---------------------------------------------------------------------------------------- */

/** Gram Sabha and other statutory meetings. */
export const MEETING_TYPES = [
  'GramSabha',
  'SpecialGramSabha',
  'MonthlyMeeting',
  'StandingCommittee',
  'WardMeeting',
  'Other',
];

/** Derived from the clock, never stored — see meeting.service.js. */
export const MEETING_STATUSES = ['Upcoming', 'Live', 'Completed'];

/** Village development works. */
export const PROJECT_CATEGORIES = [
  'Road',
  'WaterSupply',
  'Sanitation',
  'Electricity',
  'Education',
  'Health',
  'Building',
  'Irrigation',
  'Other',
];

export const PROJECT_STATUSES = ['Planned', 'InProgress', 'Completed', 'OnHold'];

export const FUNDING_SOURCES = [
  'FinanceCommission',
  'MGNREGA',
  'StateScheme',
  'CentralScheme',
  'OwnFunds',
  'Other',
];

/** The services a citizen can rate. */
export const FEEDBACK_CATEGORIES = [
  'ComplaintResolution',
  'CertificateProcess',
  'TaxServices',
  'Cleanliness',
  'WaterSupply',
  'Roads',
  'StreetLights',
  'Education',
  'Health',
];

export const FEEDBACK_RATING_MIN = 1;
export const FEEDBACK_RATING_MAX = 5;

/** Documents the Gram Panchayat publishes for download. */
export const DOWNLOAD_CATEGORIES = [
  'Form',
  'Circular',
  'Map',
  'AnnualReport',
  'Budget',
  'DevelopmentReport',
  'Other',
];
