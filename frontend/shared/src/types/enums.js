/** Foundation vocabulary shared by backend + both frontends. Runtime value objects only. */

export const Role = {
  Citizen: 'citizen',
  Officer: 'officer',
};

export const Language = {
  English: 'en',
  Marathi: 'mr',
};

export const UserStatus = {
  Active: 'active',
  Inactive: 'inactive',
};

export const ComplaintCategory = {
  Road: 'Road',
  WaterSupply: 'WaterSupply',
  Sanitation: 'Sanitation',
  Electricity: 'Electricity',
  Other: 'Other',
};

export const ComplaintStatus = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Resolved: 'Resolved',
};

export const ComplaintPriority = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

export const NoticeChannel = {
  Sms: 'sms',
  Voice: 'voice',
};

export const NoticeCategory = {
  General: 'General',
  WaterSupply: 'WaterSupply',
  Electricity: 'Electricity',
  Health: 'Health',
  Event: 'Event',
  Emergency: 'Emergency',
  Tax: 'Tax',
  Other: 'Other',
};

export const AttachmentType = {
  Pdf: 'pdf',
  Image: 'image',
};

export const SchemeCategory = {
  Agriculture: 'Agriculture',
  Health: 'Health',
  Education: 'Education',
  Housing: 'Housing',
  Employment: 'Employment',
  Women: 'Women',
  SeniorCitizen: 'SeniorCitizen',
  Financial: 'Financial',
  Other: 'Other',
};

export const NotificationStatus = {
  Queued: 'queued',
  Sent: 'sent',
  Delivered: 'delivered',
  Failed: 'failed',
};

export const NotificationPurpose = {
  Otp: 'otp',
  Welcome: 'welcome',
  ComplaintUpdate: 'complaintUpdate',
  NoticeBroadcast: 'noticeBroadcast',
  DakhalaUpdate: 'dakhalaUpdate',
  TaxUpdate: 'taxUpdate',
  Broadcast: 'broadcast',
};

// Delivery channels. inApp is always stored (the notification centre); the rest are
// external dispatches routed through the provider abstraction.
export const NotificationChannel = {
  InApp: 'inApp',
  Sms: 'sms',
  Voice: 'voice',
  Email: 'email',
};

export const NotificationType = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
};

export const NotificationModule = {
  Auth: 'auth',
  Complaint: 'complaint',
  Notice: 'notice',
  Scheme: 'scheme',
  Tax: 'tax',
  Certificate: 'certificate',
  System: 'system',
};

// Property = Gharpatti (घरपट्टी), Water = PaniPatti (पाणीपट्टी) — Marathi labels live in i18n.
export const TaxType = {
  Property: 'Property',
  Water: 'Water',
};

export const PaymentStatus = {
  Unpaid: 'Unpaid',
  Partial: 'Partial',
  Paid: 'Paid',
};

export const CertType = {
  Marriage: 'Marriage',
  Residence: 'Residence',
  Income: 'Income',
  Birth: 'Birth',
  Death: 'Death',
  Character: 'Character',
  Other: 'Other',
};

export const DakhalaStatus = {
  Submitted: 'Submitted',
  UnderReview: 'UnderReview',
  Approved: 'Approved',
  Rejected: 'Rejected',
};
