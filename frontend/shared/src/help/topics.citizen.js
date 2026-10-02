/**
 * Citizen help topics. Authored content — see ./schema.js for the model and the reasoning
 * behind keeping this hand-written rather than generated.
 *
 * Marathi is written for a rural reader: short sentences, everyday vocabulary, and the same
 * words the interface itself uses (so "दाखला" for certificate, not a literal translation).
 */

/** @type {import('./schema.js').HelpTopic[]} */
export const CITIZEN_TOPICS = [
  // ---------------------------------------------------------------- Getting started
  {
    id: 'getting-started',
    category: 'gettingStarted',
    audience: 'citizen',
    title: { en: 'What you can do on this portal', mr: 'या पोर्टलवर तुम्ही काय करू शकता' },
    summary: {
      en: 'An overview of every service the Gram Panchayat offers online.',
      mr: 'ग्रामपंचायत ऑनलाइन देत असलेल्या सर्व सेवांची माहिती.',
    },
    minutes: 3,
    steps: [
      {
        text: {
          en: 'File a complaint about roads, water, sanitation or electricity — with a photo and your location.',
          mr: 'रस्ता, पाणी, स्वच्छता किंवा वीज याबद्दल तक्रार नोंदवा — फोटो आणि ठिकाणासह.',
        },
      },
      {
        text: {
          en: 'Apply for certificates (dakhala) such as Marriage, Birth and Death, and download them once approved.',
          mr: 'रहिवासी, जन्म, मृत्यू असे दाखले मागवा आणि मंजूर झाल्यावर डाउनलोड करा.',
        },
      },
      {
        text: {
          en: 'Check your property and water tax dues, and see the original bill uploaded by the office.',
          mr: 'तुमचा घरपट्टी व पाणीपट्टी कर पहा आणि कार्यालयाने अपलोड केलेले मूळ बिल पहा.',
        },
      },
      {
        text: {
          en: 'Read notices and government schemes, see upcoming village events, and find officials in the directory.',
          mr: 'सूचना व शासकीय योजना वाचा, आगामी गावातील कार्यक्रम पहा आणि निर्देशिकेत पदाधिकारी शोधा.',
        },
      },
    ],
    notes: [
      {
        en: 'You can read notices, schemes, events and the directory without an account. Complaints, certificates and tax need you to log in.',
        mr: 'खाते नसतानाही सूचना, योजना, कार्यक्रम व निर्देशिका पाहता येते. तक्रार, दाखले व कर यासाठी लॉगिन आवश्यक आहे.',
      },
    ],
    related: ['register', 'login', 'file-complaint', 'apply-marriage'],
    route: '/',
    keywords: {
      en: ['start', 'begin', 'overview', 'services', 'what is this'],
      mr: ['सुरुवात', 'सेवा', 'माहिती'],
    },
  },
  {
    id: 'install-app',
    category: 'gettingStarted',
    audience: 'citizen',
    title: { en: 'Install the portal on your phone', mr: 'पोर्टल तुमच्या मोबाइलवर इन्स्टॉल करा' },
    summary: {
      en: 'Add the portal to your home screen so it opens like an app and works offline.',
      mr: 'पोर्टल होम स्क्रीनवर जोडा — ते अ‍ॅपसारखे उघडेल आणि इंटरनेटशिवायही चालेल.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Open the portal in Chrome on your phone.',
          mr: 'तुमच्या मोबाइलमध्ये Chrome मध्ये पोर्टल उघडा.',
        },
      },
      {
        text: {
          en: 'Tap the browser menu (three dots) and choose "Add to Home screen" / "Install app".',
          mr: 'ब्राउझर मेनू (तीन ठिपके) उघडा आणि "Add to Home screen" / "Install app" निवडा.',
        },
      },
      {
        text: {
          en: 'The portal icon now appears with your other apps.',
          mr: 'आता पोर्टलचे चिन्ह तुमच्या इतर अ‍ॅप्ससोबत दिसेल.',
        },
      },
    ],
    notes: [
      {
        en: 'Once installed you can read notices, schemes and tax offline. A complaint filed without network is saved and sent automatically when you are back online.',
        mr: 'इन्स्टॉल केल्यावर सूचना, योजना व कर इंटरनेटशिवाय वाचता येतात. नेटवर्क नसताना नोंदवलेली तक्रार जतन होते आणि इंटरनेट आल्यावर आपोआप पाठवली जाते.',
      },
    ],
    related: ['getting-started', 'file-complaint'],
    keywords: {
      en: ['install', 'app', 'home screen', 'offline', 'pwa'],
      mr: ['इन्स्टॉल', 'अ‍ॅप', 'ऑफलाइन'],
    },
  },

  // ---------------------------------------------------------------- Registration / login
  {
    id: 'register',
    category: 'registration',
    audience: 'citizen',
    title: { en: 'Create your account', mr: 'तुमचे खाते तयार करा' },
    summary: {
      en: 'Register with your mobile number to use complaints, certificates and tax.',
      mr: 'तक्रारी, दाखले व कर वापरण्यासाठी मोबाइल क्रमांकाने नोंदणी करा.',
    },
    minutes: 3,
    requirements: [
      { en: 'A 10-digit Indian mobile number', mr: '१० अंकी भारतीय मोबाइल क्रमांक' },
      { en: 'Your full name, village and address', mr: 'तुमचे पूर्ण नाव, गाव व पत्ता' },
    ],
    steps: [
      {
        text: {
          en: 'Open the portal and tap "Enter portal", then "Register".',
          mr: 'पोर्टल उघडा, "पोर्टलमध्ये प्रवेश करा" व नंतर "नोंदणी करा" दाबा.',
        },
      },
      {
        text: {
          en: 'Enter your full name exactly as it appears on your documents.',
          mr: 'तुमच्या कागदपत्रांवर आहे तसेच पूर्ण नाव टाका.',
        },
      },
      {
        text: {
          en: 'Enter your 10-digit mobile number. This becomes your login id.',
          mr: 'तुमचा १० अंकी मोबाइल क्रमांक टाका. हाच तुमचा लॉगिन आयडी होईल.',
        },
      },
      {
        text: {
          en: 'Choose a password of at least 8 characters.',
          mr: 'किमान ८ अक्षरांचा पासवर्ड निवडा.',
        },
        note: {
          en: 'Use something you will remember but others cannot guess.',
          mr: 'लक्षात राहील पण इतरांना ओळखता येणार नाही असा पासवर्ड ठेवा.',
        },
      },
      {
        text: {
          en: 'Fill in your village and address, then tap Register.',
          mr: 'गाव व पत्ता भरा आणि "नोंदणी करा" दाबा.',
        },
      },
    ],
    mistakes: [
      {
        en: 'Using a landline or a number shorter than 10 digits — only Indian mobile numbers starting 6–9 are accepted.',
        mr: 'लँडलाइन किंवा १० पेक्षा कमी अंकी क्रमांक वापरणे — फक्त ६ ते ९ ने सुरू होणारे भारतीय मोबाइल क्रमांक चालतात.',
      },
      {
        en: 'Registering twice with the same mobile number — one number can have only one account.',
        mr: 'एकाच मोबाइल क्रमांकाने दोनदा नोंदणी करणे — एका क्रमांकावर एकच खाते असते.',
      },
    ],
    faqs: [
      {
        q: { en: 'Do I need an email address?', mr: 'ईमेल आवश्यक आहे का?' },
        a: {
          en: 'No. Citizens register with a mobile number only.',
          mr: 'नाही. नागरिक फक्त मोबाइल क्रमांकाने नोंदणी करतात.',
        },
      },
      {
        q: {
          en: 'Can my whole family use one account?',
          mr: 'संपूर्ण कुटुंब एकच खाते वापरू शकते का?',
        },
        a: {
          en: 'Each adult should register separately, because certificates and tax records are linked to the person who applies.',
          mr: 'प्रत्येक प्रौढ व्यक्तीने स्वतंत्र नोंदणी करावी, कारण दाखले व कर नोंदी अर्ज करणाऱ्या व्यक्तीशी जोडलेल्या असतात.',
        },
      },
    ],
    related: ['login', 'forgot-password', 'profile'],
    route: '/register',
    screenshots: ['Registration form'],
    keywords: {
      en: ['register', 'signup', 'create account', 'new user', 'join'],
      mr: ['नोंदणी', 'खाते', 'नवीन'],
    },
  },
  {
    id: 'login',
    category: 'login',
    audience: 'citizen',
    title: { en: 'Log in to your account', mr: 'तुमच्या खात्यात लॉगिन करा' },
    summary: {
      en: 'Sign in with your mobile number and password.',
      mr: 'मोबाइल क्रमांक व पासवर्डने लॉगिन करा.',
    },
    minutes: 1,
    steps: [
      {
        text: {
          en: 'Tap "Enter portal" on the home page.',
          mr: 'मुख्यपृष्ठावर "पोर्टलमध्ये प्रवेश करा" दाबा.',
        },
      },
      {
        text: {
          en: 'Make sure the "Villager" tab is selected, not "Officer".',
          mr: '"ग्रामस्थ" हा पर्याय निवडलेला आहे याची खात्री करा, "अधिकारी" नाही.',
        },
      },
      {
        text: {
          en: 'Enter your mobile number and password, then tap Log in.',
          mr: 'मोबाइल क्रमांक व पासवर्ड टाका आणि "लॉगिन करा" दाबा.',
        },
      },
    ],
    mistakes: [
      {
        en: 'Trying to log in on the Officer tab with a citizen account — the portal will refuse it. Officer accounts are only for Gram Panchayat staff.',
        mr: 'नागरिक खात्याने "अधिकारी" पर्यायातून लॉगिन करणे — पोर्टल ते नाकारेल. अधिकारी खाती फक्त ग्रामपंचायत कर्मचाऱ्यांसाठी आहेत.',
      },
    ],
    faqs: [
      {
        q: {
          en: 'It says "Too many attempts". What now?',
          mr: '"खूप वेळा प्रयत्न" असा संदेश येतो. आता काय?',
        },
        a: {
          en: 'For your safety the portal pauses login after several wrong passwords. Wait a few minutes and try again.',
          mr: 'सुरक्षिततेसाठी अनेक चुकीच्या पासवर्डनंतर पोर्टल लॉगिन थांबवते. काही मिनिटे थांबा आणि पुन्हा प्रयत्न करा.',
        },
      },
    ],
    related: ['register', 'forgot-password'],
    route: '/login',
    keywords: { en: ['login', 'sign in', 'password', 'enter'], mr: ['लॉगिन', 'प्रवेश', 'पासवर्ड'] },
  },
  {
    id: 'forgot-password',
    category: 'login',
    audience: 'citizen',
    title: { en: 'If you forget your password', mr: 'पासवर्ड विसरल्यास' },
    summary: {
      en: 'What to do when you cannot log in.',
      mr: 'लॉगिन होत नसेल तर काय करावे.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Check that you are typing the correct 10-digit mobile number.',
          mr: 'तुम्ही योग्य १० अंकी मोबाइल क्रमांक टाकत आहात का ते तपासा.',
        },
      },
      {
        text: {
          en: 'Tap "Forgot password?" on the login screen and follow the instructions.',
          mr: 'लॉगिन पानावर "पासवर्ड विसरलात?" दाबा आणि सूचनांचे पालन करा.',
        },
      },
      {
        text: {
          en: 'If you still cannot log in, visit the Gram Panchayat office with your ID proof.',
          mr: 'तरीही लॉगिन होत नसेल, तर ओळखपत्रासह ग्रामपंचायत कार्यालयात जा.',
        },
      },
    ],
    related: ['login', 'contact-office'],
    keywords: {
      en: ['forgot', 'reset', 'password', 'locked out'],
      mr: ['विसरलो', 'पासवर्ड', 'रीसेट'],
    },
  },

  // ---------------------------------------------------------------- Language / theme
  {
    id: 'change-language',
    category: 'language',
    audience: 'both',
    title: { en: 'Change the language', mr: 'भाषा बदला' },
    summary: {
      en: 'Switch the whole portal between English and Marathi.',
      mr: 'संपूर्ण पोर्टल इंग्रजी व मराठी दरम्यान बदला.',
    },
    minutes: 1,
    steps: [
      {
        text: {
          en: 'On the public home page, use the language button in the top bar.',
          mr: 'सार्वजनिक मुख्यपृष्ठावर वरच्या पट्टीतील भाषा बटण वापरा.',
        },
      },
      {
        text: {
          en: 'After logging in, use the language button in the header, or open Settings.',
          mr: 'लॉगिननंतर हेडरमधील भाषा बटण वापरा किंवा सेटिंग्ज उघडा.',
        },
      },
      {
        text: {
          en: 'Your choice is remembered on this device.',
          mr: 'तुमची निवड या उपकरणावर लक्षात ठेवली जाते.',
        },
      },
    ],
    related: ['settings-overview'],
    route: '/settings',
    keywords: {
      en: ['language', 'marathi', 'english', 'translate'],
      mr: ['भाषा', 'मराठी', 'इंग्रजी'],
    },
  },

  // ---------------------------------------------------------------- Complaints
  {
    id: 'file-complaint',
    category: 'complaints',
    audience: 'citizen',
    title: { en: 'File a complaint', mr: 'तक्रार नोंदवा' },
    summary: {
      en: 'Report a problem with roads, water, sanitation or electricity.',
      mr: 'रस्ता, पाणी, स्वच्छता किंवा वीज याबाबतची समस्या कळवा.',
    },
    minutes: 5,
    requirements: [
      { en: 'You must be logged in', mr: 'तुम्ही लॉगिन केलेले असावे' },
      {
        en: 'A photo of the problem helps the officer act faster (optional)',
        mr: 'समस्येचा फोटो असल्यास अधिकारी लवकर कार्यवाही करू शकतात (ऐच्छिक)',
      },
    ],
    steps: [
      {
        text: {
          en: 'Open Complaints from the bottom menu and tap "New complaint".',
          mr: 'खालच्या मेनूतून "तक्रारी" उघडा आणि "नवीन तक्रार" दाबा.',
        },
      },
      {
        text: {
          en: 'Choose the category that fits best — Road, Water supply, Sanitation, Electricity or Other.',
          mr: 'योग्य प्रकार निवडा — रस्ता, पाणीपुरवठा, स्वच्छता, वीज किंवा इतर.',
        },
      },
      {
        text: {
          en: 'Write a short title and then describe the problem clearly.',
          mr: 'छोटे शीर्षक लिहा आणि नंतर समस्या स्पष्टपणे लिहा.',
        },
        note: {
          en: 'Mention the landmark or ward so the officer can find the spot.',
          mr: 'अधिकाऱ्यांना जागा सापडावी म्हणून खूण किंवा प्रभाग नमूद करा.',
        },
      },
      {
        text: {
          en: 'Add up to three photos, and add your location if you are standing at the spot.',
          mr: 'जास्तीत जास्त तीन फोटो जोडा आणि तुम्ही त्या ठिकाणी असाल तर स्थान जोडा.',
        },
      },
      {
        text: {
          en: 'Tap Submit. You will get a complaint number to track it.',
          mr: '"सबमिट" दाबा. मागोवा घेण्यासाठी तुम्हाला तक्रार क्रमांक मिळेल.',
        },
      },
    ],
    notes: [
      {
        en: 'No network? Submit anyway — the complaint is saved on your phone and sent automatically when you are back online. It will not be sent twice.',
        mr: 'नेटवर्क नाही? तरीही सबमिट करा — तक्रार तुमच्या मोबाइलमध्ये जतन होते आणि इंटरनेट आल्यावर आपोआप पाठवली जाते. ती दोनदा पाठवली जाणार नाही.',
      },
    ],
    mistakes: [
      {
        en: 'Writing only "water problem" — the officer cannot locate it. Add the place and what exactly is wrong.',
        mr: 'फक्त "पाण्याची अडचण" लिहिणे — अधिकाऱ्यांना जागा कळत नाही. ठिकाण व नेमकी अडचण लिहा.',
      },
      {
        en: 'Filing the same complaint many times instead of tracking the existing one.',
        mr: 'आधीच्या तक्रारीचा मागोवा घेण्याऐवजी तीच तक्रार पुन्हा पुन्हा नोंदवणे.',
      },
    ],
    faqs: [
      {
        q: { en: 'How long does it take?', mr: 'किती वेळ लागतो?' },
        a: {
          en: 'The office reviews complaints and updates the status. You can see every change on the complaint timeline.',
          mr: 'कार्यालय तक्रारींचा आढावा घेते व स्थिती अद्ययावत करते. प्रत्येक बदल तक्रारीच्या कालरेखेवर दिसतो.',
        },
      },
      {
        q: { en: 'Can I see other people’s complaints?', mr: 'इतरांच्या तक्रारी दिसतात का?' },
        a: {
          en: 'No. You only see your own complaints.',
          mr: 'नाही. तुम्हाला फक्त तुमच्याच तक्रारी दिसतात.',
        },
      },
    ],
    related: ['track-complaint', 'getting-started'],
    route: '/complaints/new',
    screenshots: ['New complaint form', 'Photo upload'],
    keywords: {
      en: [
        'complaint',
        'grievance',
        'report',
        'problem',
        'road',
        'water',
        'garbage',
        'street light',
      ],
      mr: ['तक्रार', 'समस्या', 'रस्ता', 'पाणी', 'कचरा'],
    },
  },
  {
    id: 'track-complaint',
    category: 'complaints',
    audience: 'citizen',
    title: { en: 'Track your complaint', mr: 'तक्रारीचा मागोवा घ्या' },
    summary: {
      en: 'See what the office has done about your complaint.',
      mr: 'तुमच्या तक्रारीवर कार्यालयाने काय केले ते पहा.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Open Complaints from the bottom menu.',
          mr: 'खालच्या मेनूतून "तक्रारी" उघडा.',
        },
      },
      { text: { en: 'Tap the complaint you want to check.', mr: 'तपासायची तक्रार दाबा.' } },
      {
        text: {
          en: 'The timeline shows each status change and any remark from the officer.',
          mr: 'कालरेखेवर प्रत्येक स्थिती बदल व अधिकाऱ्याचा शेरा दिसतो.',
        },
      },
    ],
    notes: [
      {
        en: 'Statuses mean: Pending (received), In progress (work started), Resolved (completed with a remark).',
        mr: 'स्थितीचा अर्थ: प्रलंबित (मिळाली), प्रगतीपथावर (काम सुरू), निकाली (शेऱ्यासह पूर्ण).',
      },
    ],
    related: ['file-complaint', 'notifications'],
    route: '/complaints',
    keywords: { en: ['track', 'status', 'complaint progress'], mr: ['मागोवा', 'स्थिती'] },
  },

  // ---------------------------------------------------------------- Certificates
  {
    id: 'certificates-overview',
    category: 'certificates',
    audience: 'citizen',
    title: { en: 'How certificates (dakhala) work', mr: 'दाखले कसे मिळतात' },
    summary: {
      en: 'The journey from application to a downloadable, verifiable certificate.',
      mr: 'अर्जापासून डाउनलोड करता येणाऱ्या व पडताळणी होणाऱ्या दाखल्यापर्यंतचा प्रवास.',
    },
    minutes: 4,
    steps: [
      {
        text: {
          en: 'You apply online and upload the required documents.',
          mr: 'तुम्ही ऑनलाइन अर्ज करता व आवश्यक कागदपत्रे अपलोड करता.',
        },
      },
      {
        text: {
          en: 'The office reviews your application ("Under review").',
          mr: 'कार्यालय तुमच्या अर्जाची तपासणी करते ("तपासणीत").',
        },
      },
      {
        text: {
          en: 'On approval the portal generates an official PDF with a certificate number and a QR code.',
          mr: 'मंजुरीनंतर पोर्टल दाखला क्रमांक व QR कोड असलेली अधिकृत PDF तयार करते.',
        },
      },
      {
        text: {
          en: 'You download it from the application page. Anyone can verify it with the QR code.',
          mr: 'अर्जाच्या पानावरून तुम्ही ती डाउनलोड करता. QR कोडने कोणीही तिची पडताळणी करू शकते.',
        },
      },
    ],
    notes: [
      {
        en: 'If the office rejects an application, the reason is shown on the application page. Fix it and apply again.',
        mr: 'अर्ज नाकारला गेल्यास कारण अर्जाच्या पानावर दिसते. दुरुस्ती करून पुन्हा अर्ज करा.',
      },
    ],
    related: [
      'apply-marriage',
      'apply-birth',
      'apply-death',
      'apply-other',
      'download-certificate',
      'verify-certificate',
    ],
    route: '/dakhala',
    keywords: {
      en: ['certificate', 'dakhala', 'document', 'apply'],
      mr: ['दाखला', 'प्रमाणपत्र', 'अर्ज'],
    },
  },
  {
    id: 'apply-marriage',
    category: 'certificates',
    audience: 'citizen',
    title: { en: 'Apply for a Marriage certificate', mr: 'विवाह दाखल्यासाठी अर्ज करा' },
    summary: {
      en: 'Record of a marriage held in this village.',
      mr: 'या गावात झालेल्या विवाहाची नोंद.',
    },
    minutes: 10,
    requirements: [
      {
        en: 'Identity proof of the bride and groom — Aadhaar, PAN, Voter ID, Passport or Driving Licence',
        mr: 'वधू व वराचा ओळखपुरावा — आधार, पॅन, मतदार ओळखपत्र, पासपोर्ट किंवा वाहन परवाना',
      },
      {
        en: 'Proof of marriage — the invitation card or a photograph of the ceremony',
        mr: 'विवाहाचा पुरावा — विवाह पत्रिका किंवा समारंभाचा फोटो',
      },
      { en: 'A self-declaration', mr: 'स्वयंघोषणापत्र' },
      {
        en: 'Witness identity proof, if you have it (optional)',
        mr: 'साक्षीदाराचा ओळखपुरावा, असल्यास (ऐच्छिक)',
      },
    ],
    steps: [
      {
        text: { en: 'Open Certificates and tap "Apply".', mr: '"दाखले" उघडा आणि "अर्ज करा" दाबा.' },
      },
      { text: { en: 'Choose "Marriage".', mr: '"विवाह" निवडा.' } },
      {
        text: {
          en: "Fill in the groom's and bride's names, the date and place of the marriage, your mobile number and address.",
          mr: 'वर व वधूची नावे, विवाहाची तारीख व ठिकाण, मोबाइल क्रमांक व पत्ता भरा.',
        },
      },
      {
        text: {
          en: 'Upload one document for each required group and pick the correct document type for each file.',
          mr: 'प्रत्येक आवश्यक गटासाठी एक कागदपत्र अपलोड करा आणि प्रत्येक फाइलसाठी योग्य प्रकार निवडा.',
        },
      },
      {
        text: {
          en: 'Submit. You will get an application number.',
          mr: 'सबमिट करा. तुम्हाला अर्ज क्रमांक मिळेल.',
        },
      },
    ],
    mistakes: [
      {
        en: 'Uploading a blurred photo of a document — the office cannot read it and will reject the application.',
        mr: 'अस्पष्ट फोटो अपलोड करणे — कार्यालयाला वाचता येत नाही व अर्ज नाकारला जातो.',
      },
      {
        en: 'Choosing the wrong document type, for example marking a ration card as identity proof.',
        mr: 'चुकीचा कागदपत्र प्रकार निवडणे, उदा. शिधापत्रिकेला ओळखपत्र म्हणून खूण करणे.',
      },
    ],
    faqs: [
      {
        q: { en: 'What file types can I upload?', mr: 'कोणत्या प्रकारच्या फाइल अपलोड करता येतात?' },
        a: {
          en: 'Clear photos (JPG, PNG, WEBP) or PDF files, up to 5 MB each, maximum 5 files.',
          mr: 'स्पष्ट फोटो (JPG, PNG, WEBP) किंवा PDF, प्रत्येकी ५ MB पर्यंत, जास्तीत जास्त ५ फाइल.',
        },
      },
    ],
    related: ['certificates-overview', 'download-certificate', 'apply-birth'],
    route: '/dakhala/new',
    screenshots: ['Certificate type selection', 'Document upload'],
    keywords: {
      en: ['residence', 'domicile', 'address proof', 'living certificate'],
      mr: ['रहिवासी', 'निवास', 'पत्ता'],
    },
  },
  {
    id: 'apply-birth',
    category: 'certificates',
    audience: 'citizen',
    title: { en: 'Apply for a Birth certificate', mr: 'जन्म दाखल्यासाठी अर्ज करा' },
    summary: { en: 'Register and obtain a birth certificate.', mr: 'जन्म नोंद करून दाखला मिळवा.' },
    minutes: 10,
    requirements: [
      {
        en: 'Birth proof — hospital birth report or a doctor’s medical certificate',
        mr: 'जन्माचा पुरावा — रुग्णालयाचा जन्म अहवाल किंवा डॉक्टरांचे वैद्यकीय प्रमाणपत्र',
      },
      {
        en: 'Parent identity — Aadhaar, PAN or Voter ID',
        mr: 'पालकांचे ओळखपत्र — आधार, पॅन किंवा मतदार ओळखपत्र',
      },
      { en: 'Parent address proof', mr: 'पालकांच्या पत्त्याचा पुरावा' },
    ],
    steps: [
      {
        text: {
          en: 'Open Certificates and tap "Apply", then choose "Birth".',
          mr: '"दाखले" उघडा, "अर्ज करा" दाबा आणि "जन्म" निवडा.',
        },
      },
      {
        text: {
          en: 'Enter the child’s name, date of birth and place of birth.',
          mr: 'बाळाचे नाव, जन्म दिनांक व जन्म ठिकाण टाका.',
        },
      },
      {
        text: {
          en: 'Enter the father’s and mother’s full names.',
          mr: 'वडिलांचे व आईचे पूर्ण नाव टाका.',
        },
      },
      {
        text: {
          en: 'Upload the birth proof, parent identity and parent address documents.',
          mr: 'जन्माचा पुरावा, पालकांचे ओळखपत्र व पत्त्याचा पुरावा अपलोड करा.',
        },
      },
      {
        text: {
          en: 'Submit and note your application number.',
          mr: 'सबमिट करा आणि अर्ज क्रमांक लक्षात ठेवा.',
        },
      },
    ],
    mistakes: [
      {
        en: 'Spelling the child’s name differently from the hospital record — always match the document.',
        mr: 'रुग्णालयाच्या नोंदीपेक्षा वेगळे स्पेलिंग लिहिणे — नेहमी कागदपत्राप्रमाणेच लिहा.',
      },
    ],
    related: ['certificates-overview', 'apply-death', 'download-certificate'],
    route: '/dakhala/new',
    keywords: { en: ['birth', 'child', 'newborn', 'janma'], mr: ['जन्म', 'बाळ', 'नवजात'] },
  },
  {
    id: 'apply-death',
    category: 'certificates',
    audience: 'citizen',
    title: { en: 'Apply for a Death certificate', mr: 'मृत्यू दाखल्यासाठी अर्ज करा' },
    summary: {
      en: 'Register a death and obtain the certificate.',
      mr: 'मृत्यूची नोंद करून दाखला मिळवा.',
    },
    minutes: 10,
    requirements: [
      { en: 'Doctor’s death certificate', mr: 'डॉक्टरांचे मृत्यू प्रमाणपत्र' },
      {
        en: 'Identity of the deceased — Aadhaar, PAN or Voter ID',
        mr: 'मृत व्यक्तीचे ओळखपत्र — आधार, पॅन किंवा मतदार ओळखपत्र',
      },
      { en: 'Address proof', mr: 'पत्त्याचा पुरावा' },
      { en: 'Aadhaar of the applicant (relative)', mr: 'अर्जदाराचे (नातेवाईकाचे) आधार' },
    ],
    steps: [
      {
        text: {
          en: 'Open Certificates, tap "Apply" and choose "Death".',
          mr: '"दाखले" उघडा, "अर्ज करा" दाबा आणि "मृत्यू" निवडा.',
        },
      },
      {
        text: {
          en: 'Enter the name of the deceased, the date and place of death.',
          mr: 'मृत व्यक्तीचे नाव, मृत्यू दिनांक व ठिकाण टाका.',
        },
      },
      {
        text: {
          en: 'State your relation to the deceased.',
          mr: 'मृत व्यक्तीशी तुमचे नाते नमूद करा.',
        },
      },
      {
        text: {
          en: 'Upload all four required documents and submit.',
          mr: 'चारही आवश्यक कागदपत्रे अपलोड करा आणि सबमिट करा.',
        },
      },
    ],
    notes: [
      {
        en: 'If you need help with this application, the Gram Panchayat office will assist you in person.',
        mr: 'या अर्जासाठी मदत हवी असल्यास ग्रामपंचायत कार्यालय प्रत्यक्ष मदत करेल.',
      },
    ],
    related: ['certificates-overview', 'contact-office'],
    route: '/dakhala/new',
    keywords: { en: ['death', 'deceased', 'mrityu'], mr: ['मृत्यू', 'निधन'] },
  },
  {
    id: 'apply-other',
    category: 'certificates',
    audience: 'citizen',
    title: {
      en: 'Apply for a 7/12 extract or another certificate',
      mr: '७/१२ उतारा किंवा इतर दाखल्यासाठी अर्ज करा',
    },
    summary: {
      en: 'Land records (7/12) and any other certificate the office issues.',
      mr: 'जमीन नोंदी (७/१२) व कार्यालय देत असलेले इतर दाखले.',
    },
    minutes: 8,
    requirements: [
      {
        en: 'For 7/12: identity proof and an existing land record (7/12, 8A or property record)',
        mr: '७/१२ साठी: ओळखपत्र व सध्याची जमीन नोंद (७/१२, ८अ किंवा मालमत्ता नोंद)',
      },
      {
        en: 'For other certificates: a supporting document',
        mr: 'इतर दाखल्यांसाठी: आधारभूत कागदपत्र',
      },
    ],
    steps: [
      {
        text: { en: 'Open Certificates and tap "Apply".', mr: '"दाखले" उघडा आणि "अर्ज करा" दाबा.' },
      },
      {
        text: {
          en: 'For land records choose "7/12" and enter the survey number, gat number, village, taluka and district.',
          mr: 'जमीन नोंदीसाठी "७/१२" निवडा आणि सर्व्हे क्रमांक, गट क्रमांक, गाव, तालुका व जिल्हा टाका.',
        },
      },
      {
        text: {
          en: 'For anything else choose "Other" and write the certificate title, purpose and details.',
          mr: 'इतर कशासाठी "इतर" निवडा आणि दाखल्याचे नाव, कारण व तपशील लिहा.',
        },
      },
      {
        text: {
          en: 'Upload the supporting documents and submit.',
          mr: 'आधारभूत कागदपत्रे अपलोड करा आणि सबमिट करा.',
        },
      },
    ],
    related: ['certificates-overview', 'download-certificate'],
    route: '/dakhala/new',
    keywords: {
      en: ['7/12', 'satbara', 'land', 'extract', 'other certificate'],
      mr: ['७/१२', 'सातबारा', 'जमीन', 'उतारा'],
    },
  },
  {
    id: 'download-certificate',
    category: 'certificates',
    audience: 'citizen',
    title: { en: 'View and download your certificate', mr: 'दाखला पहा व डाउनलोड करा' },
    summary: {
      en: 'Open the approved certificate inside the portal, print it or save it.',
      mr: 'मंजूर दाखला पोर्टलमध्येच उघडा, छापा किंवा जतन करा.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Open Certificates and tap the approved application.',
          mr: '"दाखले" उघडा आणि मंजूर अर्ज दाबा.',
        },
      },
      {
        text: {
          en: 'Tap "View certificate" — it opens inside the portal, no other app needed.',
          mr: '"दाखला पहा" दाबा — तो पोर्टलमध्येच उघडतो, दुसऱ्या अ‍ॅपची गरज नाही.',
        },
      },
      {
        text: {
          en: 'Use the download button to save it, or print it from there.',
          mr: 'जतन करण्यासाठी डाउनलोड बटण वापरा किंवा तेथूनच छापा.',
        },
      },
    ],
    notes: [
      {
        en: 'The certificate carries a certificate number, a QR code and a verification id. It is valid without a handwritten signature.',
        mr: 'दाखल्यावर दाखला क्रमांक, QR कोड व पडताळणी क्रमांक असतो. हाताने सही नसतानाही तो वैध आहे.',
      },
    ],
    related: ['verify-certificate', 'certificates-overview'],
    route: '/dakhala',
    keywords: {
      en: ['download', 'print', 'save', 'pdf', 'certificate copy'],
      mr: ['डाउनलोड', 'छापा', 'जतन'],
    },
  },
  {
    id: 'verify-certificate',
    category: 'certificates',
    audience: 'both',
    title: { en: 'Verify a certificate with the QR code', mr: 'QR कोडने दाखल्याची पडताळणी करा' },
    summary: {
      en: 'Anyone — a bank, a school, an office — can confirm a certificate is genuine.',
      mr: 'बँक, शाळा किंवा कार्यालय — कोणीही दाखला खरा असल्याची खात्री करू शकते.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Scan the QR code printed on the certificate with any phone camera.',
          mr: 'दाखल्यावर छापलेला QR कोड कोणत्याही मोबाइल कॅमेऱ्याने स्कॅन करा.',
        },
      },
      {
        text: {
          en: 'The verification page opens and shows whether the certificate is genuine.',
          mr: 'पडताळणी पान उघडते व दाखला खरा आहे का ते दाखवते.',
        },
      },
      {
        text: {
          en: 'No QR? Open the Verify page and type the certificate number instead.',
          mr: 'QR नाही? पडताळणी पान उघडा आणि दाखला क्रमांक टाका.',
        },
      },
    ],
    notes: [
      {
        en: 'Verification needs no login. It shows only the certificate type, applicant name, number and issue date.',
        mr: 'पडताळणीसाठी लॉगिन लागत नाही. त्यात फक्त दाखला प्रकार, अर्जदाराचे नाव, क्रमांक व दिनांक दिसतो.',
      },
    ],
    related: ['download-certificate'],
    route: '/verify',
    keywords: {
      en: ['verify', 'qr', 'genuine', 'check certificate', 'authentic'],
      mr: ['पडताळणी', 'खरा', 'तपासा'],
    },
  },

  // ---------------------------------------------------------------- Tax
  {
    id: 'view-tax',
    category: 'tax',
    audience: 'citizen',
    title: { en: 'Check your tax dues', mr: 'तुमचा थकित कर पहा' },
    summary: {
      en: 'See property and water tax, payments made, and the original bill.',
      mr: 'घरपट्टी व पाणीपट्टी, भरलेली रक्कम आणि मूळ बिल पहा.',
    },
    minutes: 3,
    steps: [
      { text: { en: 'Open Tax from the menu.', mr: 'मेनूतून "कर" उघडा.' } },
      {
        text: {
          en: 'The top box shows your total outstanding amount.',
          mr: 'वरच्या चौकटीत तुमची एकूण थकित रक्कम दिसते.',
        },
      },
      {
        text: {
          en: 'Each bill shows the assessed amount, what you have paid and the balance.',
          mr: 'प्रत्येक बिलात आकारलेली रक्कम, भरलेली रक्कम व शिल्लक दिसते.',
        },
      },
      {
        text: {
          en: 'Tap a bill document to open the original scanned bill inside the portal.',
          mr: 'मूळ स्कॅन केलेले बिल पोर्टलमध्ये उघडण्यासाठी बिल कागदपत्र दाबा.',
        },
      },
    ],
    notes: [
      {
        en: 'Payments are recorded by the Gram Panchayat office. Pay at the office and the portal will show the updated balance.',
        mr: 'पेमेंटची नोंद ग्रामपंचायत कार्यालय करते. कार्यालयात भरा, पोर्टलवर सुधारित शिल्लक दिसेल.',
      },
    ],
    faqs: [
      {
        q: { en: 'Can I pay online?', mr: 'ऑनलाइन भरता येईल का?' },
        a: {
          en: 'Not yet. The portal shows your dues and payment history; payment is made at the office.',
          mr: 'सध्या नाही. पोर्टलवर थकबाकी व भरणा इतिहास दिसतो; भरणा कार्यालयात करावा लागतो.',
        },
      },
      {
        q: { en: 'My payment is not showing.', mr: 'माझा भरणा दिसत नाही.' },
        a: {
          en: 'The office records it after receiving payment. If it is still missing after a day, contact the office with your receipt.',
          mr: 'भरणा मिळाल्यावर कार्यालय नोंद करते. एक दिवसानंतरही दिसत नसेल तर पावतीसह कार्यालयाशी संपर्क साधा.',
        },
      },
    ],
    related: ['contact-office', 'notifications'],
    route: '/tax',
    keywords: {
      en: ['tax', 'property tax', 'water tax', 'dues', 'bill', 'payment'],
      mr: ['कर', 'घरपट्टी', 'पाणीपट्टी', 'थकबाकी', 'बिल'],
    },
  },

  // ---------------------------------------------------------------- Schemes / notices / events
  {
    id: 'view-schemes',
    category: 'schemes',
    audience: 'citizen',
    title: { en: 'Find government schemes', mr: 'शासकीय योजना शोधा' },
    summary: {
      en: 'Browse welfare schemes and check whether you are eligible.',
      mr: 'कल्याणकारी योजना पहा आणि तुम्ही पात्र आहात का ते तपासा.',
    },
    minutes: 3,
    steps: [
      { text: { en: 'Open Schemes from the menu.', mr: 'मेनूतून "योजना" उघडा.' } },
      {
        text: {
          en: 'Use the search box or the category filter (agriculture, health, education, housing and more).',
          mr: 'शोध चौकट किंवा प्रकार गाळणी वापरा (शेती, आरोग्य, शिक्षण, घरकुल व इतर).',
        },
      },
      {
        text: {
          en: 'Open a scheme to read the benefits, who can apply and the documents needed.',
          mr: 'लाभ, कोण अर्ज करू शकते व आवश्यक कागदपत्रे वाचण्यासाठी योजना उघडा.',
        },
      },
    ],
    related: ['view-notices', 'contact-office'],
    route: '/schemes',
    keywords: {
      en: ['scheme', 'yojana', 'subsidy', 'benefit', 'welfare'],
      mr: ['योजना', 'अनुदान', 'लाभ'],
    },
  },
  {
    id: 'view-notices',
    category: 'notices',
    audience: 'citizen',
    title: { en: 'Read Gram Panchayat notices', mr: 'ग्रामपंचायत सूचना वाचा' },
    summary: {
      en: 'Official announcements — water supply, meetings, health camps and more.',
      mr: 'अधिकृत सूचना — पाणीपुरवठा, सभा, आरोग्य शिबिरे व इतर.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Open Notices from the menu, or see the latest ones on the home page.',
          mr: 'मेनूतून "सूचना" उघडा किंवा मुख्यपृष्ठावर नवीनतम पहा.',
        },
      },
      {
        text: {
          en: 'Search by words or filter by category.',
          mr: 'शब्दांनी शोधा किंवा प्रकारानुसार गाळा.',
        },
      },
      {
        text: {
          en: 'Open a notice to read it fully and to open any attachment.',
          mr: 'संपूर्ण वाचण्यासाठी व जोडपत्र उघडण्यासाठी सूचना उघडा.',
        },
      },
    ],
    related: ['view-schemes', 'view-events', 'notifications'],
    route: '/notices',
    keywords: {
      en: ['notice', 'announcement', 'circular', 'suchana'],
      mr: ['सूचना', 'जाहीर', 'परिपत्रक'],
    },
  },
  {
    id: 'view-events',
    category: 'events',
    audience: 'citizen',
    title: { en: 'See upcoming village events', mr: 'आगामी गावातील कार्यक्रम पहा' },
    summary: {
      en: 'Gram Sabha meetings, health camps, festivals and more.',
      mr: 'ग्रामसभा, आरोग्य शिबिरे, सण व इतर कार्यक्रम.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Upcoming events appear at the top of your dashboard after you log in.',
          mr: 'लॉगिननंतर आगामी कार्यक्रम तुमच्या डॅशबोर्डच्या वरच्या भागात दिसतात.',
        },
      },
      {
        text: {
          en: 'They also appear on the public home page, so anyone can see them.',
          mr: 'ते सार्वजनिक मुख्यपृष्ठावरही दिसतात, त्यामुळे कोणीही पाहू शकते.',
        },
      },
      {
        text: {
          en: 'Each event shows the date, venue and a countdown.',
          mr: 'प्रत्येक कार्यक्रमात दिनांक, ठिकाण व उरलेले दिवस दिसतात.',
        },
      },
    ],
    related: ['view-notices', 'member-contacts'],
    route: '/',
    keywords: {
      en: ['event', 'gram sabha', 'meeting', 'camp', 'festival'],
      mr: ['कार्यक्रम', 'ग्रामसभा', 'सभा', 'शिबिर'],
    },
  },

  // ---------------------------------------------------------------- Directory / emergency
  {
    id: 'member-contacts',
    category: 'directory',
    audience: 'citizen',
    title: {
      en: 'Phone a Gram Panchayat member',
      mr: 'ग्रामपंचायत सदस्याला फोन करा',
    },
    summary: {
      en: 'Names and mobile numbers of the members, on the home page — no login needed.',
      mr: 'सदस्यांची नावे व मोबाइल क्रमांक मुख्य पानावर — लॉगिन न करता.',
    },
    minutes: 1,
    steps: [
      {
        text: {
          en: 'Open the village home page. You do not have to log in.',
          mr: 'गावाचे मुख्य पान उघडा. लॉगिन करण्याची गरज नाही.',
        },
      },
      {
        text: {
          en: 'Scroll to "Gram Panchayat Members".',
          mr: '"ग्रामपंचायत सदस्य" पर्यंत खाली जा.',
        },
      },
      {
        text: {
          en: 'The mobile number is shown on each card. Tap "Call" to dial it.',
          mr: 'प्रत्येक कार्डावर मोबाइल क्रमांक दिसतो. कॉल करण्यासाठी "कॉल" दाबा.',
        },
      },
    ],
    notes: [
      {
        en: 'Only the numbers the Gram Panchayat has published are shown. A member with no published number has no Call button.',
        mr: 'ग्रामपंचायतीने प्रसिद्ध केलेले क्रमांकच दाखवले जातात. क्रमांक नसलेल्या सदस्याचे "कॉल" बटण दिसत नाही.',
      },
    ],
    related: ['contact-office'],
    route: '/welcome',
    keywords: {
      en: ['member', 'members', 'sarpanch', 'official', 'phone', 'mobile', 'call', 'contact'],
      mr: ['सदस्य', 'सरपंच', 'पदाधिकारी', 'फोन', 'मोबाइल', 'संपर्क'],
    },
  },
  {
    id: 'contact-office',
    category: 'directory',
    audience: 'citizen',
    title: { en: 'Contact the Gram Panchayat office', mr: 'ग्रामपंचायत कार्यालयाशी संपर्क साधा' },
    summary: {
      en: 'Office address, timings, phone and email.',
      mr: 'कार्यालयाचा पत्ता, वेळ, दूरध्वनी व ईमेल.',
    },
    minutes: 1,
    steps: [
      {
        text: {
          en: 'Open the Directory and look at the "Gram Panchayat office" card.',
          mr: '"निर्देशिका" उघडा आणि "ग्रामपंचायत कार्यालय" चौकट पहा.',
        },
      },
      {
        text: {
          en: 'The office address and timings are also in the footer of the public home page.',
          mr: 'कार्यालयाचा पत्ता व वेळ सार्वजनिक मुख्यपृष्ठाच्या तळातही आहे.',
        },
      },
    ],
    related: ['member-contacts'],
    route: '/directory',
    keywords: {
      en: ['office', 'address', 'timing', 'phone', 'visit'],
      mr: ['कार्यालय', 'पत्ता', 'वेळ', 'दूरध्वनी'],
    },
  },

  {
    id: 'select-ward',
    category: 'registration',
    audience: 'citizen',
    title: { en: 'Choosing your ward', mr: 'तुमचा प्रभाग निवडणे' },
    summary: {
      en: 'Your ward decides which collection and water timings you are shown.',
      mr: 'तुमचा प्रभाग ठरवतो की तुम्हाला कोणते कचरा व पाणी वेळापत्रक दिसेल.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'On the registration form, open the "Ward" list.',
          mr: 'नोंदणी अर्जावर "प्रभाग" यादी उघडा.',
        },
      },
      {
        text: {
          en: 'Choose the ward you live in, from Ward 1 to Ward 6.',
          mr: 'तुम्ही राहता तो प्रभाग निवडा — प्रभाग १ ते प्रभाग ६.',
        },
      },
      {
        text: {
          en: 'You cannot register without choosing a ward.',
          mr: 'प्रभाग निवडल्याशिवाय नोंदणी पूर्ण होत नाही.',
        },
      },
    ],
    notes: [
      {
        en: 'If you are not sure which ward you are in, ask at the Gram Panchayat office. An officer can correct your ward later.',
        mr: 'तुमचा प्रभाग माहीत नसल्यास ग्रामपंचायत कार्यालयात विचारा. अधिकारी नंतर तो बदलू शकतात.',
      },
      {
        en: 'Accounts created before wards were introduced have no ward. An officer can add it at the office.',
        mr: 'प्रभाग सुरू होण्यापूर्वी तयार झालेल्या खात्यांना प्रभाग नसतो. अधिकारी तो कार्यालयात जोडू शकतात.',
      },
    ],
    related: ['register', 'timetable-ward'],
    route: '/register',
    keywords: {
      en: ['ward', 'ward 1', 'ward 2', 'ward 3', 'ward 4', 'ward 5', 'ward 6', 'register'],
      mr: ['प्रभाग', 'वॉर्ड', 'नोंदणी'],
    },
  },

  {
    id: 'timetable',
    category: 'notices',
    audience: 'citizen',
    title: { en: 'Ghantagadi and water supply timings', mr: 'घंटागाडी व पाणीपुरवठा वेळा' },
    summary: {
      en: 'When the waste collection vehicle comes and when the water runs.',
      mr: 'कचरा गाडी कधी येते आणि पाणी कधी येते.',
    },
    minutes: 1,
    steps: [
      {
        text: {
          en: 'Open the home page and scroll to "Timetable".',
          mr: 'मुख्य पान उघडा आणि "वेळापत्रक" पर्यंत खाली जा.',
        },
      },
      {
        text: {
          en: 'Ghantagadi and Water supply are shown side by side, each with its day and time.',
          mr: 'घंटागाडी व पाणीपुरवठा शेजारी दाखवले जातात, प्रत्येकाचा दिवस व वेळ.',
        },
      },
    ],
    notes: [
      {
        en: 'If the Gram Panchayat has not published a schedule yet, the card says so. No timings are guessed.',
        mr: 'ग्रामपंचायतीने वेळापत्रक अद्याप प्रसिद्ध केले नसेल तर कार्डावर तसे लिहिलेले असते. वेळा अंदाजाने दाखवल्या जात नाहीत.',
      },
    ],
    related: ['timetable-ward', 'view-notices'],
    route: '/',
    keywords: {
      en: ['timetable', 'ghantagadi', 'water', 'supply', 'collection', 'garbage', 'schedule'],
      mr: ['वेळापत्रक', 'घंटागाडी', 'पाणी', 'पाणीपुरवठा', 'कचरा'],
    },
  },

  {
    id: 'timetable-ward',
    category: 'notices',
    audience: 'citizen',
    title: {
      en: 'Why you see only your ward timings',
      mr: 'फक्त तुमच्याच प्रभागाच्या वेळा का दिसतात',
    },
    summary: {
      en: 'The timetable shows your ward and any village-wide schedule, nothing else.',
      mr: 'वेळापत्रकात तुमचा प्रभाग व संपूर्ण गावासाठीचे वेळापत्रक दिसते, इतर काही नाही.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Log in. The timetable then uses the ward on your account.',
          mr: 'लॉगिन करा. त्यानंतर वेळापत्रक तुमच्या खात्यावरील प्रभाग वापरते.',
        },
      },
      {
        text: {
          en: 'Each row shows which ward it applies to, or "All / general" for the whole village.',
          mr: 'प्रत्येक ओळीवर तो कोणत्या प्रभागासाठी आहे ते दिसते, किंवा संपूर्ण गावासाठी "सर्व / सर्वसाधारण".',
        },
      },
    ],
    notes: [
      {
        en: 'Other wards\u2019 timings are not shown, so you never act on a time meant for a different street.',
        mr: 'इतर प्रभागांच्या वेळा दाखवल्या जात नाहीत, त्यामुळे दुसऱ्या भागाची वेळ चुकून वापरली जात नाही.',
      },
      {
        en: 'Without logging in, or if your account has no ward yet, only the village-wide schedule is shown.',
        mr: 'लॉगिन न करता, किंवा खात्याला प्रभाग नसल्यास, फक्त संपूर्ण गावाचे वेळापत्रक दिसते.',
      },
    ],
    related: ['timetable', 'select-ward'],
    route: '/',
    keywords: {
      en: ['ward', 'timetable', 'my ward', 'ghantagadi', 'water'],
      mr: ['प्रभाग', 'वेळापत्रक', 'घंटागाडी', 'पाणी'],
    },
  },

  // ---------------------------------------------------------------- Notifications / profile / settings
  {
    id: 'notifications',
    category: 'notifications',
    audience: 'citizen',
    title: { en: 'Notifications and alerts', mr: 'सूचना व इशारे' },
    summary: {
      en: 'Know when your complaint or application status changes.',
      mr: 'तुमच्या तक्रारीची किंवा अर्जाची स्थिती बदलल्यावर कळेल.',
    },
    minutes: 2,
    steps: [
      {
        text: {
          en: 'Tap the bell icon in the header. A red badge shows unread alerts.',
          mr: 'हेडरमधील घंटा चिन्ह दाबा. लाल खूण न वाचलेले इशारे दाखवते.',
        },
      },
      {
        text: {
          en: 'Tap a notification to read it in full.',
          mr: 'संपूर्ण वाचण्यासाठी सूचना दाबा.',
        },
      },
      {
        text: {
          en: 'Use "Mark all as read" to clear the badge.',
          mr: 'खूण हटवण्यासाठी "सर्व वाचले म्हणून चिन्हांकित" वापरा.',
        },
      },
      {
        text: {
          en: 'Open notification settings to choose which alerts you want.',
          mr: 'कोणते इशारे हवेत ते निवडण्यासाठी सूचना सेटिंग्ज उघडा.',
        },
      },
    ],
    related: ['track-complaint', 'settings-overview'],
    route: '/notifications',
    keywords: {
      en: ['notification', 'alert', 'bell', 'sms', 'unread'],
      mr: ['सूचना', 'इशारा', 'घंटा'],
    },
  },
  {
    id: 'profile',
    category: 'profile',
    audience: 'citizen',
    title: { en: 'Update your profile', mr: 'तुमची माहिती अद्ययावत करा' },
    summary: {
      en: 'Keep your name, village and address correct.',
      mr: 'तुमचे नाव, गाव व पत्ता बरोबर ठेवा.',
    },
    minutes: 2,
    steps: [
      {
        text: { en: 'Open Profile from the bottom menu.', mr: 'खालच्या मेनूतून "प्रोफाईल" उघडा.' },
      },
      { text: { en: 'Edit your details and save.', mr: 'तुमची माहिती बदला आणि जतन करा.' } },
    ],
    notes: [
      {
        en: 'Your address here is used on certificate applications, so keep it accurate.',
        mr: 'येथील पत्ता दाखल्याच्या अर्जांसाठी वापरला जातो, त्यामुळे तो अचूक ठेवा.',
      },
    ],
    related: ['settings-overview', 'register'],
    route: '/profile',
    keywords: {
      en: ['profile', 'my details', 'edit name', 'address'],
      mr: ['प्रोफाईल', 'माहिती', 'पत्ता'],
    },
  },
  {
    id: 'settings-overview',
    category: 'settings',
    audience: 'citizen',
    title: { en: 'Settings', mr: 'सेटिंग्ज' },
    summary: {
      en: 'Language, theme, notifications and help — all in one place.',
      mr: 'भाषा, रंगसंगती, सूचना व मदत — सर्व एकाच ठिकाणी.',
    },
    minutes: 2,
    steps: [
      { text: { en: 'Open Settings from the header.', mr: 'हेडरमधून "सेटिंग्ज" उघडा.' } },
      {
        text: {
          en: 'Change the language, switch the theme, or set your notification preferences.',
          mr: 'भाषा बदला, रंगसंगती बदला किंवा सूचना पसंती ठरवा.',
        },
      },
      {
        text: {
          en: 'You can also replay the introduction tour from here.',
          mr: 'येथून तुम्ही ओळख फेरफटका पुन्हा पाहू शकता.',
        },
      },
    ],
    related: ['change-language', 'notifications'],
    route: '/settings',
    keywords: { en: ['settings', 'preferences', 'options'], mr: ['सेटिंग्ज', 'पसंती'] },
  },
];
