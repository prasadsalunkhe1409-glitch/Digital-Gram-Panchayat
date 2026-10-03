/**
 * Officer help topics — the administrative side of the portal. Same content model as the
 * citizen topics; these are shown in the officer portal's Help Center.
 */

/** @type {import('./schema.js').HelpTopic[]} */
export const OFFICER_TOPICS = [
  {
    id: 'officer-login',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Log in as an officer', mr: 'अधिकारी म्हणून लॉगिन करा' },
    summary: {
      en: 'Officer accounts are created by the administrator, never self-registered.',
      mr: 'अधिकारी खाती प्रशासक तयार करतात, स्वतः नोंदणी करता येत नाही.',
    },
    minutes: 1,
    requirements: [{ en: 'Your official email and password', mr: 'तुमचा अधिकृत ईमेल व पासवर्ड' }],
    steps: [
      {
        text: {
          en: 'Open the officer portal and select the "Officer" tab.',
          mr: 'अधिकारी पोर्टल उघडा आणि "अधिकारी" पर्याय निवडा.',
        },
      },
      {
        text: {
          en: 'Enter your official email address and password.',
          mr: 'तुमचा अधिकृत ईमेल व पासवर्ड टाका.',
        },
      },
    ],
    notes: [
      {
        en: 'Officer sessions expire sooner than citizen sessions (8 hours) for security. Log in again when prompted.',
        mr: 'सुरक्षिततेसाठी अधिकारी सत्र नागरिकांपेक्षा लवकर (८ तास) संपते. विचारल्यास पुन्हा लॉगिन करा.',
      },
    ],
    related: ['officer-complaints', 'officer-certificates'],
    keywords: { en: ['officer login', 'admin login', 'staff'], mr: ['अधिकारी लॉगिन', 'प्रशासक'] },
  },
  {
    id: 'officer-complaints',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Review and resolve complaints', mr: 'तक्रारींचा आढावा घ्या व निकाली काढा' },
    summary: {
      en: 'Move a complaint from Pending to In progress to Resolved.',
      mr: 'तक्रार प्रलंबित पासून प्रगतीपथावर आणि नंतर निकाली करा.',
    },
    minutes: 5,
    steps: [
      {
        text: {
          en: 'Open Complaints and use the status and category filters to find the ones needing action.',
          mr: '"तक्रारी" उघडा आणि कार्यवाही हवी असलेल्या शोधण्यासाठी स्थिती व प्रकार गाळण्या वापरा.',
        },
      },
      {
        text: {
          en: 'Open a complaint to read the description and view the citizen’s photos.',
          mr: 'वर्णन वाचण्यासाठी व नागरिकाचे फोटो पाहण्यासाठी तक्रार उघडा.',
        },
      },
      {
        text: {
          en: 'Set the status to "In progress" when work begins, adding a short remark.',
          mr: 'काम सुरू झाल्यावर स्थिती "प्रगतीपथावर" करा आणि छोटा शेरा लिहा.',
        },
      },
      {
        text: {
          en: 'When the work is done set the status to "Resolved" — a remark is required here.',
          mr: 'काम पूर्ण झाल्यावर स्थिती "निकाली" करा — येथे शेरा आवश्यक आहे.',
        },
        note: {
          en: 'The remark is shown to the citizen, so write what was actually done.',
          mr: 'शेरा नागरिकाला दिसतो, त्यामुळे प्रत्यक्ष काय केले ते लिहा.',
        },
      },
    ],
    notes: [
      {
        en: 'Every status change is recorded in the audit log with your name and the time.',
        mr: 'प्रत्येक स्थिती बदल तुमच्या नावासह व वेळेसह लेखापरीक्षण नोंदीत नोंदवला जातो.',
      },
      {
        en: 'The citizen is notified automatically — you do not need to inform them separately.',
        mr: 'नागरिकाला आपोआप सूचना जाते — वेगळे कळवण्याची गरज नाही.',
      },
    ],
    mistakes: [
      {
        en: 'Resolving without a remark — the portal will not allow it, and the citizen would have no explanation.',
        mr: 'शेऱ्याशिवाय निकाली काढणे — पोर्टल ते होऊ देत नाही, आणि नागरिकाला कारण कळणार नाही.',
      },
    ],
    related: ['officer-audit', 'officer-broadcast'],
    route: '/complaints',
    keywords: {
      en: ['complaint', 'resolve', 'status', 'grievance', 'review'],
      mr: ['तक्रार', 'निकाली', 'स्थिती'],
    },
  },
  {
    id: 'officer-certificates',
    category: 'officerGuides',
    audience: 'officer',
    title: {
      en: 'Review, approve and issue a certificate',
      mr: 'दाखल्याची तपासणी, मंजुरी व वितरण',
    },
    summary: {
      en: 'Check the documents, correct the details if needed, then generate the official certificate.',
      mr: 'कागदपत्रे तपासा, गरज असल्यास तपशील दुरुस्त करा आणि अधिकृत दाखला तयार करा.',
    },
    minutes: 8,
    steps: [
      {
        text: {
          en: 'Open Certificates and pick an application with status Submitted or Under review.',
          mr: '"दाखले" उघडा आणि "सादर" किंवा "तपासणीत" स्थिती असलेला अर्ज निवडा.',
        },
      },
      {
        text: {
          en: 'Open each uploaded document — they open inside the portal — and confirm they are readable and correct.',
          mr: 'प्रत्येक अपलोड कागदपत्र उघडा — ते पोर्टलमध्येच उघडते — आणि ते वाचनीय व योग्य असल्याची खात्री करा.',
        },
      },
      {
        text: {
          en: 'Tap Approve. Before issuing, review the applicant’s details and correct any spelling if needed.',
          mr: '"मंजूर करा" दाबा. देण्यापूर्वी अर्जदाराचे तपशील तपासा व आवश्यक असल्यास स्पेलिंग दुरुस्त करा.',
        },
      },
      {
        text: {
          en: 'Add remarks if required, attach the prepared certificate PDF, then tap "Issue certificate".',
          mr: 'आवश्यक असल्यास शेरा लिहा, तयार केलेल्या दाखल्याची PDF जोडा आणि "दाखला जारी करा" दाबा.',
        },
      },
      {
        text: {
          en: 'The portal records your PDF against a unique certificate number for verification; the citizen can download it immediately. The portal does not create the certificate for you.',
          mr: 'पोर्टल तुमची PDF पडताळणीसाठी अद्वितीय दाखला क्रमांकासह नोंदवते; नागरिक ती लगेच डाउनलोड करू शकतो. पोर्टल तुमच्यासाठी दाखला तयार करत नाही.',
        },
      },
    ],
    notes: [
      {
        en: 'Corrections you make here appear on the printed certificate — check them carefully before generating.',
        mr: 'येथे केलेल्या दुरुस्त्या छापलेल्या दाखल्यावर येतात — तयार करण्यापूर्वी काळजीपूर्वक तपासा.',
      },
      {
        en: 'To reject, use Reject and give a clear reason — the citizen sees it and can re-apply.',
        mr: 'नाकारण्यासाठी "नाकारा" वापरा व स्पष्ट कारण द्या — नागरिकाला ते दिसते व तो पुन्हा अर्ज करू शकतो.',
      },
    ],
    mistakes: [
      {
        en: 'Approving without opening the documents — an unreadable or wrong document then becomes an issued certificate.',
        mr: 'कागदपत्रे न उघडता मंजुरी देणे — अस्पष्ट किंवा चुकीच्या कागदपत्रावर दाखला जारी होतो.',
      },
    ],
    faqs: [
      {
        q: { en: 'Can a certificate be issued twice?', mr: 'दाखला दोनदा जारी करता येतो का?' },
        a: {
          en: 'Approving an already-approved application does not create a second certificate — the original number stays valid.',
          mr: 'आधीच मंजूर अर्ज पुन्हा मंजूर केल्याने दुसरा दाखला तयार होत नाही — मूळ क्रमांकच वैध राहतो.',
        },
      },
    ],
    related: ['officer-audit', 'officer-login'],
    route: '/dakhala',
    screenshots: ['Certificate review screen', 'Approve dialog'],
    keywords: {
      en: ['certificate', 'approve', 'issue', 'generate', 'dakhala', 'reject'],
      mr: ['दाखला', 'मंजूर', 'जारी', 'नाकारा'],
    },
  },
  {
    id: 'officer-tax',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Create a tax record and record payments', mr: 'कर नोंद तयार करा व भरणा नोंदवा' },
    summary: {
      en: 'Raise a demand, attach the original bill, and record payments as they come in.',
      mr: 'मागणी नोंदवा, मूळ बिल जोडा आणि येणारे भरणे नोंदवा.',
    },
    minutes: 6,
    requirements: [
      {
        en: 'The citizen must already have an account (look them up by mobile number)',
        mr: 'नागरिकाचे खाते आधीच असावे (मोबाइल क्रमांकाने शोधा)',
      },
      {
        en: 'A scan or photo of the original tax bill (optional but recommended)',
        mr: 'मूळ कर बिलाचा स्कॅन किंवा फोटो (ऐच्छिक पण शिफारसीय)',
      },
    ],
    steps: [
      { text: { en: 'Open Tax and tap "New record".', mr: '"कर" उघडा आणि "नवीन नोंद" दाबा.' } },
      {
        text: { en: 'Look up the citizen by mobile number.', mr: 'मोबाइल क्रमांकाने नागरिक शोधा.' },
      },
      {
        text: {
          en: 'Enter the property number, tax type (property or water), financial year, amount and due date.',
          mr: 'मालमत्ता क्रमांक, कर प्रकार (घरपट्टी किंवा पाणीपट्टी), आर्थिक वर्ष, रक्कम व अंतिम दिनांक टाका.',
        },
      },
      {
        text: {
          en: 'Attach the scanned bill so the citizen can see the original document.',
          mr: 'नागरिकाला मूळ कागदपत्र दिसावे म्हणून स्कॅन केलेले बिल जोडा.',
        },
      },
      {
        text: {
          en: 'When a citizen pays, open the record and use "Record payment" with the amount and receipt number.',
          mr: 'नागरिकाने भरणा केल्यावर नोंद उघडा आणि रक्कम व पावती क्रमांकासह "भरणा नोंदवा" वापरा.',
        },
      },
    ],
    notes: [
      {
        en: 'The balance and payment status are calculated automatically — you never edit them by hand.',
        mr: 'शिल्लक व भरणा स्थिती आपोआप मोजली जाते — ती हाताने बदलू नका.',
      },
    ],
    related: ['officer-audit'],
    route: '/tax',
    keywords: {
      en: ['tax', 'demand', 'payment', 'receipt', 'bill', 'property'],
      mr: ['कर', 'भरणा', 'पावती', 'बिल'],
    },
  },
  {
    id: 'officer-notices-schemes',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Publish notices and schemes', mr: 'सूचना व योजना प्रसिद्ध करा' },
    summary: {
      en: 'Announce information to the whole village, in both languages.',
      mr: 'संपूर्ण गावाला दोन्ही भाषांत माहिती कळवा.',
    },
    minutes: 6,
    steps: [
      {
        text: {
          en: 'Open Notices (or Schemes) and tap "New".',
          mr: '"सूचना" (किंवा "योजना") उघडा आणि "नवीन" दाबा.',
        },
      },
      {
        text: {
          en: 'Write the title and the full content, and pick the right category.',
          mr: 'शीर्षक व संपूर्ण मजकूर लिहा आणि योग्य प्रकार निवडा.',
        },
      },
      {
        text: {
          en: 'Attach a PDF or image if there is an official document.',
          mr: 'अधिकृत कागदपत्र असल्यास PDF किंवा प्रतिमा जोडा.',
        },
      },
      {
        text: {
          en: 'Set the publish date, and an expiry date if the notice is only valid for a period.',
          mr: 'प्रसिद्धी दिनांक ठरवा, आणि सूचना ठराविक काळापुरती असल्यास समाप्ती दिनांक द्या.',
        },
      },
      {
        text: {
          en: 'Mark it Published — only published items are visible to citizens.',
          mr: '"प्रसिद्ध" म्हणून खूण करा — फक्त प्रसिद्ध बाबीच नागरिकांना दिसतात.',
        },
      },
    ],
    notes: [
      {
        en: 'If you write in only one language, the portal fills the other automatically. Read it before publishing.',
        mr: 'तुम्ही एकाच भाषेत लिहिल्यास पोर्टल दुसरी भाषा आपोआप भरते. प्रसिद्ध करण्यापूर्वी ती वाचा.',
      },
    ],
    related: ['officer-broadcast', 'officer-events'],
    route: '/notices',
    keywords: {
      en: ['notice', 'scheme', 'publish', 'announce'],
      mr: ['सूचना', 'योजना', 'प्रसिद्ध'],
    },
  },
  {
    id: 'officer-events',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Create a village event', mr: 'गावातील कार्यक्रम तयार करा' },
    summary: {
      en: 'Gram Sabha meetings, camps and festivals shown to every citizen.',
      mr: 'प्रत्येक नागरिकाला दिसणाऱ्या ग्रामसभा, शिबिरे व सण.',
    },
    minutes: 4,
    steps: [
      {
        text: {
          en: 'Open Events and tap "Add event".',
          mr: '"कार्यक्रम" उघडा आणि "कार्यक्रम जोडा" दाबा.',
        },
      },
      {
        text: {
          en: 'Enter the title, start date, category, venue and organiser.',
          mr: 'शीर्षक, प्रारंभ दिनांक, प्रकार, ठिकाण व आयोजक टाका.',
        },
      },
      {
        text: {
          en: 'Add a banner image if you have one, then save.',
          mr: 'असल्यास बॅनर प्रतिमा जोडा आणि जतन करा.',
        },
      },
    ],
    notes: [
      {
        en: 'Upcoming events appear at the top of every citizen dashboard and on the public home page.',
        mr: 'आगामी कार्यक्रम प्रत्येक नागरिकाच्या डॅशबोर्डच्या वर व सार्वजनिक मुख्यपृष्ठावर दिसतात.',
      },
    ],
    related: ['officer-notices-schemes', 'officer-village-profile'],
    route: '/events',
    keywords: {
      en: ['event', 'gram sabha', 'camp', 'meeting'],
      mr: ['कार्यक्रम', 'ग्रामसभा', 'शिबिर'],
    },
  },
  {
    id: 'officer-village-profile',
    category: 'officerGuides',
    audience: 'officer',
    title: {
      en: 'Edit the Village Profile and directory',
      mr: 'गाव माहिती व निर्देशिका संपादित करा',
    },
    summary: {
      en: 'Everything the public home page and directory show comes from here.',
      mr: 'सार्वजनिक मुख्यपृष्ठ व निर्देशिकेत दिसणारे सर्व येथूनच येते.',
    },
    minutes: 8,
    steps: [
      {
        text: {
          en: 'Open Village Profile from the sidebar.',
          mr: 'बाजूच्या मेनूतून "गाव माहिती" उघडा.',
        },
      },
      {
        text: {
          en: 'Edit the village identity, statistics, leadership, emergency contacts and social links.',
          mr: 'गावाची ओळख, आकडेवारी, पदाधिकारी, आपत्कालीन संपर्क व सामाजिक दुवे संपादित करा.',
        },
      },
      {
        text: {
          en: 'Under "Directory members", add each official with name, designation, ward, phone, email, office hours and tenure.',
          mr: '"निर्देशिका सदस्य" मध्ये प्रत्येक पदाधिकाऱ्याचे नाव, पद, प्रभाग, दूरध्वनी, ईमेल, कार्यालय वेळ व कार्यकाळ भरा.',
        },
      },
      {
        text: {
          en: 'Save — changes appear on the public site immediately.',
          mr: 'जतन करा — बदल सार्वजनिक संकेतस्थळावर लगेच दिसतात.',
        },
      },
    ],
    notes: [
      {
        en: 'Editing one section never erases another; you can update just the part you need.',
        mr: 'एक विभाग संपादित केल्याने दुसरा पुसला जात नाही; फक्त हवा तोच भाग बदलता येतो.',
      },
      {
        en: 'Do not publish personal mobile numbers without the official’s consent.',
        mr: 'संबंधित पदाधिकाऱ्याच्या संमतीशिवाय खासगी मोबाइल क्रमांक प्रसिद्ध करू नका.',
      },
    ],
    related: ['officer-events', 'officer-audit'],
    route: '/village',
    keywords: {
      en: ['village profile', 'directory', 'members', 'sarpanch', 'statistics'],
      mr: ['गाव माहिती', 'निर्देशिका', 'सदस्य', 'आकडेवारी'],
    },
  },
  {
    id: 'officer-broadcast',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Broadcast a notification', mr: 'सूचना प्रसारित करा' },
    summary: {
      en: 'Send an alert to many citizens at once.',
      mr: 'एकाच वेळी अनेक नागरिकांना इशारा पाठवा.',
    },
    minutes: 4,
    steps: [
      {
        text: {
          en: 'Open Notifications and choose "Broadcast".',
          mr: '"सूचना" उघडा आणि "प्रसारण" निवडा.',
        },
      },
      {
        text: {
          en: 'Write a short, clear title and message.',
          mr: 'छोटे, स्पष्ट शीर्षक व संदेश लिहा.',
        },
      },
      { text: { en: 'Choose the channels and send.', mr: 'माध्यमे निवडा आणि पाठवा.' } },
      {
        text: {
          en: 'The delivery summary shows how many were delivered or failed.',
          mr: 'वितरण सारांशात किती पोहोचले व किती अयशस्वी ते दिसते.',
        },
      },
    ],
    notes: [
      {
        en: 'Use broadcasts sparingly — for water cuts, Gram Sabha dates and emergencies.',
        mr: 'प्रसारण मोजकेच वापरा — पाणी कपात, ग्रामसभा दिनांक व आपत्कालीन प्रसंगांसाठी.',
      },
    ],
    related: ['officer-notices-schemes'],
    route: '/notifications',
    keywords: {
      en: ['broadcast', 'notify', 'sms', 'alert all'],
      mr: ['प्रसारण', 'इशारा', 'सर्वांना'],
    },
  },
  {
    id: 'officer-audit',
    category: 'officerGuides',
    audience: 'officer',
    title: { en: 'Dashboard, reports and the audit log', mr: 'डॅशबोर्ड, अहवाल व लेखापरीक्षण नोंद' },
    summary: {
      en: 'See village-wide numbers and who changed what.',
      mr: 'गावपातळीवरील आकडे व कोणी काय बदलले ते पहा.',
    },
    minutes: 4,
    steps: [
      {
        text: {
          en: 'The Dashboard shows totals for complaints, certificates, tax and citizens, with charts.',
          mr: 'डॅशबोर्डवर तक्रारी, दाखले, कर व नागरिकांची एकूण संख्या आलेखांसह दिसते.',
        },
      },
      {
        text: {
          en: 'Open Reports to review the same data in more detail and export it.',
          mr: 'तीच माहिती अधिक तपशिलात पाहण्यासाठी व निर्यात करण्यासाठी "अहवाल" उघडा.',
        },
      },
      {
        text: {
          en: 'Open the Audit log to see every action, who performed it and when.',
          mr: 'प्रत्येक कृती, ती कोणी व केव्हा केली हे पाहण्यासाठी "लेखापरीक्षण नोंद" उघडा.',
        },
      },
    ],
    notes: [
      {
        en: 'The audit log is append-only — entries cannot be edited or deleted, by design.',
        mr: 'लेखापरीक्षण नोंद फक्त जोडली जाते — नोंदी संपादित किंवा हटवता येत नाहीत, हे मुद्दाम असे आहे.',
      },
    ],
    related: ['officer-complaints', 'officer-certificates'],
    route: '/audit',
    keywords: {
      en: ['dashboard', 'report', 'audit', 'log', 'statistics', 'export'],
      mr: ['डॅशबोर्ड', 'अहवाल', 'लेखापरीक्षण', 'नोंद'],
    },
  },
];
