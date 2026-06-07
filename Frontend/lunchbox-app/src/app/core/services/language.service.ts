import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type LanguageCode = 'en' | 'hi' | 'te';

const LANGUAGE_KEY = 'delivery_app_language';

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: 'RouteX',
    aboutUsNav: 'About Us',
    contactNav: 'Contact',
    home: 'Home',
    book: 'Book',
    tracking: 'Tracking',
    admin: 'Admin',
    audit: 'Audit',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    welcomeTitle: 'Smart Delivery Platform',
    welcomeSubtitle: 'Book parcel, food, grocery, medicine and documents with secure OTP and live tracking.',
    bookDelivery: 'Book Delivery',
    trackBooking: 'Track Booking',
    adminPanel: 'Admin Panel',
    supportHint: 'Need help? Open chatbot for quick answers.',
    loggedInAs: 'Logged in as',
    footerText: 'Professional delivery app with OTP, multilingual UI and live tracking',
    chatbotTitle: 'Support Chatbot',
    chatbotPlaceholder: 'Type your question...',
    chatbotSend: 'Send',
    biometricLogin: '🔐 Login with Thumbprint',
    biometricEnroll: 'Enroll Thumbprint',
    customerRole: 'Customer - Book & Track',
    adminRole: 'Admin - Full Access',
    captainRole: 'Captain - Jobs & Deliveries',
    jobsDeliveries: 'Jobs & Deliveries',
    unauthorized: 'You do not have permission to access this page.',
    selectLanguage: 'Select Language',
    aboutTag: 'ABOUT ROUTEX',
    aboutTitle: 'About Us',
    aboutHeadline: 'One App. Every Journey',
    aboutIntro: 'RouteX is a smart city delivery platform built to make booking, pickup, and live tracking simple and reliable. We focus on fast service, secure OTP-enabled flows, and customer-first support.',
    aboutStory: 'RouteX is an all-in-one smart mobility and delivery platform that connects customers with local businesses and delivery partners for fast, reliable, and convenient services. Whether you need food delivery, grocery delivery, local courier services, school lunchbox delivery, parcel pickup and drop, or ride booking, RouteX brings everything together in a single app.',
    aboutStory2: 'Designed to support local sellers and communities, RouteX offers real-time tracking, secure payments, quick deliveries, and seamless transportation solutions. With RouteX, users can order, send, travel, and track, all from one place.',
    aboutBadge1Title: 'Mobility + Delivery',
    aboutBadge1Body: 'Ride booking and delivery in one flow.',
    aboutBadge2Title: 'Live Tracking',
    aboutBadge2Body: 'Track every order and captain in real time.',
    aboutBadge3Title: 'Local First',
    aboutBadge3Body: 'Built to support local sellers and communities.',
    aboutMissionTitle: 'Our Mission',
    aboutMissionBody: 'Deliver every order with speed, safety, and transparency across food, parcel, grocery, and more.',
    aboutOfferTitle: 'What We Offer',
    aboutOfferBody: 'Real-time tracking, multi-service booking, and dependable route management in one RouteX app.',
    aboutPromiseTitle: 'Our Promise',
    aboutPromiseBody: 'Consistent quality, secure operations, and a smooth experience for customers, captains, and admins.',
    contactTag: 'CONTACT ROUTEX',
    contactTitle: 'Contact',
    contactIntro: 'Need help with booking, tracking, or account issues? Reach out to RouteX support.',
    supportEmailLabel: 'Support Email',
    supportPhoneLabel: 'Mobile Number',
    supportHoursTitle: 'Support Hours',
    supportHoursBody: 'Monday to Sunday, 24x7 support.',
    responseTimeTitle: 'Response Time',
    responseTimeBody: 'Most requests are answered within a few hours.',
    footerTextRouteX: 'RouteX support: goat82447@gmail.com'
  },
  hi: {
    appName: 'RouteX',
    aboutUsNav: 'हमारे बारे में',
    contactNav: 'संपर्क',
    home: 'होम',
    book: 'बुकिंग',
    tracking: 'ट्रैकिंग',
    admin: 'एडमिन',
    audit: 'ऑडिट',
    login: 'लॉगिन',
    register: 'रजिस्टर',
    logout: 'लॉगआउट',
    welcomeTitle: 'स्मार्ट डिलीवरी प्लेटफॉर्म',
    welcomeSubtitle: 'OTP और लाइव ट्रैकिंग के साथ पार्सल, फूड, ग्रोसरी, दवा और डॉक्यूमेंट बुक करें।',
    bookDelivery: 'डिलीवरी बुक करें',
    trackBooking: 'बुकिंग ट्रैक करें',
    adminPanel: 'एडमिन पैनल',
    supportHint: 'मदद चाहिए? जल्दी जवाब के लिए चैटबॉट खोलें।',
    loggedInAs: 'लॉगिन यूज़र',
    footerText: 'OTP, बहुभाषी UI और लाइव ट्रैकिंग के साथ प्रोफेशनल डिलीवरी ऐप',
    chatbotTitle: 'सपोर्ट चैटबॉट',
    chatbotPlaceholder: 'अपना प्रश्न लिखें...',
    chatbotSend: 'भेजें',
    biometricLogin: '🔐 अपने अंगूठे से लॉगिन करें',
    biometricEnroll: 'अंगूठे को पंजीकृत करें',
    customerRole: 'ग्राहक - बुकिंग और ट्रैकिंग',
    adminRole: 'एडमिन - पूर्ण एक्सेस',
    captainRole: 'कप्तान - नौकरियां और डिलीवरी',
    jobsDeliveries: 'नौकरियां और डिलीवरी',
    unauthorized: 'आपको इस पृष्ठ तक पहुँचने की अनुमति नहीं है।',
    selectLanguage: 'भाषा चुनें',
    aboutTag: 'ROUTEX के बारे में',
    aboutTitle: 'हमारे बारे में',
    aboutHeadline: 'One App. Every Journey',
    aboutIntro: 'RouteX एक स्मार्ट सिटी डिलीवरी प्लेटफॉर्म है, जो बुकिंग, पिकअप और लाइव ट्रैकिंग को आसान और भरोसेमंद बनाता है। हम तेज सेवा, सुरक्षित OTP प्रवाह और ग्राहक-प्रथम सपोर्ट पर ध्यान देते हैं।',
    aboutStory: 'RouteX एक ऑल-इन-वन स्मार्ट मोबिलिटी और डिलीवरी प्लेटफॉर्म है, जो ग्राहकों, स्थानीय व्यवसायों और डिलीवरी पार्टनर्स को तेज, भरोसेमंद और आसान सेवाओं के लिए जोड़ता है। फूड डिलीवरी, ग्रोसरी डिलीवरी, लोकल कूरियर, स्कूल लंचबॉक्स डिलीवरी, पार्सल पिकअप-ड्रॉप या राइड बुकिंग, सब कुछ एक ही ऐप में मिलता है।',
    aboutStory2: 'स्थानीय विक्रेताओं और समुदायों को समर्थन देने के लिए डिज़ाइन किया गया RouteX रियल-टाइम ट्रैकिंग, सुरक्षित भुगतान, तेज डिलीवरी और सहज ट्रांसपोर्ट समाधान देता है। RouteX के साथ यूज़र एक ही जगह से ऑर्डर, भेजना, यात्रा और ट्रैक कर सकते हैं।',
    aboutBadge1Title: 'मोबिलिटी + डिलीवरी',
    aboutBadge1Body: 'राइड और डिलीवरी एक ही फ्लो में।',
    aboutBadge2Title: 'लाइव ट्रैकिंग',
    aboutBadge2Body: 'हर ऑर्डर और कप्तान को रियल टाइम में ट्रैक करें।',
    aboutBadge3Title: 'लोकल फर्स्ट',
    aboutBadge3Body: 'स्थानीय विक्रेताओं और समुदायों के लिए बनाया गया।',
    aboutMissionTitle: 'हमारा मिशन',
    aboutMissionBody: 'फूड, पार्सल, ग्रोसरी और अन्य सेवाओं में हर ऑर्डर को तेज, सुरक्षित और पारदर्शी तरीके से पहुंचाना।',
    aboutOfferTitle: 'हम क्या देते हैं',
    aboutOfferBody: 'RouteX ऐप में रियल-टाइम ट्रैकिंग, मल्टी-सर्विस बुकिंग और भरोसेमंद रूट मैनेजमेंट।',
    aboutPromiseTitle: 'हमारा वादा',
    aboutPromiseBody: 'ग्राहकों, कप्तानों और एडमिन के लिए स्थिर गुणवत्ता, सुरक्षित संचालन और आसान अनुभव।',
    contactTag: 'ROUTEX संपर्क',
    contactTitle: 'संपर्क',
    contactIntro: 'बुकिंग, ट्रैकिंग या अकाउंट से जुड़ी मदद चाहिए? RouteX सपोर्ट से संपर्क करें।',
    supportEmailLabel: 'सपोर्ट ईमेल',
    supportPhoneLabel: 'मोबाइल नंबर',
    supportHoursTitle: 'सपोर्ट समय',
    supportHoursBody: 'सोमवार से रविवार, 24x7 सपोर्ट।',
    responseTimeTitle: 'जवाब का समय',
    responseTimeBody: 'अधिकांश अनुरोधों का जवाब कुछ घंटों में दिया जाता है।',
    footerTextRouteX: 'RouteX सपोर्ट: goat82447@gmail.com'
  },
  te: {
    appName: 'RouteX',
    aboutUsNav: 'మా గురించి',
    contactNav: 'సంప్రదించండి',
    home: 'హోమ్',
    book: 'బుకింగ్',
    tracking: 'ట్రాకింగ్',
    admin: 'అడ్మిన్',
    audit: 'ఆడిట్',
    login: 'లాగిన్',
    register: 'రిజిస్టర్',
    logout: 'లాగౌట్',
    welcomeTitle: 'స్మార్ట్ డెలివరీ ప్లాట్‌ఫారం',
    welcomeSubtitle: 'OTP మరియు లైవ్ ట్రాకింగ్‌తో పార్సెల్, ఫుడ్, గ్రోసరీ, మెడిసిన్, డాక్యుమెంట్ సేవలు బుక్ చేయండి.',
    bookDelivery: 'డెలివరీ బుక్ చేయండి',
    trackBooking: 'బుకింగ్ ట్రాక్ చేయండి',
    adminPanel: 'అడ్మిన్ ప్యానెల్',
    supportHint: 'సహాయం కావాలా? త్వరిత సమాధానాల కోసం చాట్‌బాట్ తెరవండి.',
    loggedInAs: 'లాగిన్ అయిన వినియోగదారు',
    footerText: 'OTP, బహుభాషా UI మరియు లైవ్ ట్రాకింగ్‌తో ప్రొఫెషనల్ డెలివరీ యాప్',
    chatbotTitle: 'సపోర్ట్ చాట్‌బాట్',
    chatbotPlaceholder: 'మీ ప్రశ్న టైప్ చేయండి...',
    chatbotSend: 'పంపండి',
    biometricLogin: '🔐 బొటన ఆధారంగా లాగిన్ చేయండి',
    biometricEnroll: 'బొటనను నమోదు చేయండి',
    customerRole: 'కస్టమర్ - బుకింగ్ & ట్రాకింగ్',
    adminRole: 'అడ్మిన్ - పూర్తి యాక్సెస్',
    captainRole: 'కెప్టెన్ - ఉద్యోగాలు & డెలివరీలు',
    jobsDeliveries: 'ఉద్యోగాలు & డెలివరీలు',
    unauthorized: 'ఈ పేజీకి యాక్సెస్ చేయడానికి మీకు అనుమతి లేదు.',
    selectLanguage: 'భాషను ఎంచుకోండి',
    aboutTag: 'ROUTEX గురించి',
    aboutTitle: 'మా గురించి',
    aboutHeadline: 'One App. Every Journey',
    aboutIntro: 'RouteX ఒక స్మార్ట్ సిటీ డెలివరీ ప్లాట్‌ఫారం. బుకింగ్, పికప్, లైవ్ ట్రాకింగ్‌ను సులభంగా మరియు నమ్మదగిన విధంగా అందిస్తుంది. వేగం, సురక్షిత OTP ఫ్లో, కస్టమర్ సపోర్ట్ పై మా దృష్టి ఉంటుంది.',
    aboutStory: 'RouteX ఒక ఆల్-ఇన్-వన్ స్మార్ట్ మొబిలిటీ మరియు డెలివరీ ప్లాట్‌ఫారం. ఇది కస్టమర్లు, లోకల్ వ్యాపారాలు, డెలివరీ భాగస్వాములను వేగవంతమైన, నమ్మదగిన, సులభ సేవల కోసం కలుపుతుంది. ఫుడ్ డెలివరీ, గ్రోసరీ, లోకల్ కూరియర్, స్కూల్ లంచ్‌బాక్స్ డెలివరీ, పార్సెల్ పికప్-డ్రాప్, రైడ్ బుకింగ్ అన్నీ ఒకే యాప్‌లో అందుబాటులో ఉంటాయి.',
    aboutStory2: 'లోకల్ విక్రేతలు మరియు కమ్యూనిటీలకు మద్దతుగా రూపొందించిన RouteX రియల్-టైమ్ ట్రాకింగ్, సురక్షిత చెల్లింపులు, వేగవంతమైన డెలివరీలు, సులభమైన ప్రయాణ పరిష్కారాలను అందిస్తుంది. RouteX తో యూజర్లు ఒకే చోట ఆర్డర్ చేయడం, పంపడం, ప్రయాణించడం, ట్రాక్ చేయడం చేయగలరు.',
    aboutBadge1Title: 'మొబిలిటీ + డెలివరీ',
    aboutBadge1Body: 'రైడ్ మరియు డెలివరీ ఒకే ఫ్లోలో.',
    aboutBadge2Title: 'లైవ్ ట్రాకింగ్',
    aboutBadge2Body: 'ప్రతి ఆర్డర్, కెప్టెన్‌ను రియల్ టైమ్‌లో ట్రాక్ చేయండి.',
    aboutBadge3Title: 'లోకల్ ఫస్ట్',
    aboutBadge3Body: 'లోకల్ విక్రేతలు మరియు కమ్యూనిటీల కోసం రూపొందించబడింది.',
    aboutMissionTitle: 'మా లక్ష్యం',
    aboutMissionBody: 'ఫుడ్, పార్సెల్, గ్రోసరీ మరియు మరిన్ని సేవలలో ప్రతి ఆర్డర్‌ను వేగంగా, సురక్షితంగా, పారదర్శకంగా చేరవేయడం.',
    aboutOfferTitle: 'మేము అందించేది',
    aboutOfferBody: 'ఒకే RouteX యాప్‌లో రియల్-టైమ్ ట్రాకింగ్, మల్టీ-సర్వీస్ బుకింగ్, నమ్మదగిన రూట్ మేనేజ్మెంట్.',
    aboutPromiseTitle: 'మా హామీ',
    aboutPromiseBody: 'కస్టమర్లు, కెప్టెన్లు, అడ్మిన్‌లకు స్థిరమైన నాణ్యత, సురక్షిత ఆపరేషన్స్, స్మూత్ అనుభవం.',
    contactTag: 'ROUTEX సంప్రదింపు',
    contactTitle: 'సంప్రదించండి',
    contactIntro: 'బుకింగ్, ట్రాకింగ్ లేదా ఖాతా సమస్యల కోసం RouteX సపోర్ట్‌ను సంప్రదించండి.',
    supportEmailLabel: 'సపోర్ట్ ఈమెయిల్',
    supportPhoneLabel: 'మొబైల్ నంబర్',
    supportHoursTitle: 'సపోర్ట్ సమయం',
    supportHoursBody: 'సోమవారం నుంచి ఆదివారం వరకు, 24x7 సపోర్ట్.',
    responseTimeTitle: 'ప్రత్యుత్తర సమయం',
    responseTimeBody: 'చాలా అభ్యర్థనలకు కొన్ని గంటల్లో స్పందిస్తాం.',
    footerTextRouteX: 'RouteX సపోర్ట్: goat82447@gmail.com'
  }
};

const dynamicPhraseTranslations: Record<Exclude<LanguageCode, 'en'>, Record<string, string>> = {
  hi: {
    'captain acceptance pending': 'कप्तान स्वीकृति लंबित',
    'is waiting for captain approval': 'कप्तान की स्वीकृति का इंतजार है',
    'you also have': 'आपके पास और',
    'more pending request(s).': 'अतिरिक्त लंबित अनुरोध हैं।',
    'requested at': 'अनुरोध समय',
    'open pending ride': 'लंबित राइड खोलें'
  },
  te: {
    'captain acceptance pending': 'కెప్టెన్ ఆమోదం పెండింగ్‌లో ఉంది',
    'is waiting for captain approval': 'కెప్టెన్ ఆమోదం కోసం వేచి ఉంది',
    'you also have': 'మీకు ఇంకా',
    'more pending request(s).': 'పెండింగ్ అభ్యర్థనలు ఉన్నాయి.',
    'requested at': 'అభ్యర్థించిన సమయం',
    'open pending ride': 'పెండింగ్ రైడ్ తెరవండి'
  }
};

const dynamicTokenTranslations: Record<Exclude<LanguageCode, 'en'>, Record<string, string>> = {
  hi: {
    ride: 'राइड',
    captain: 'कप्तान',
    acceptance: 'स्वीकृति',
    pending: 'लंबित',
    waiting: 'इंतजार',
    approval: 'अनुमोदन',
    requested: 'अनुरोधित',
    open: 'खोलें',
    created: 'बनाया गया',
    assigned: 'असाइन किया गया',
    pickup: 'पिकअप',
    in: 'में',
    progress: 'प्रगति',
    transit: 'यात्रा',
    arriving: 'पहुंच रहा है',
    delivered: 'डिलीवर किया गया',
    completed: 'पूर्ण',
    cancelled: 'रद्द',
    status: 'स्थिति',
    available: 'उपलब्ध',
    unavailable: 'अनुपलब्ध',
    live: 'लाइव',
    down: 'डाउन',
    checking: 'जांच जारी'
  },
  te: {
    ride: 'రైడ్',
    captain: 'కెప్టెన్',
    acceptance: 'ఆమోదం',
    pending: 'పెండింగ్',
    waiting: 'వేచి',
    approval: 'ఆమోదం',
    requested: 'అభ్యర్థించబడింది',
    open: 'తెరవండి',
    created: 'సృష్టించబడింది',
    assigned: 'కేటాయించబడింది',
    pickup: 'పికప్',
    in: 'లో',
    progress: 'ప్రగతి',
    transit: 'ప్రయాణం',
    arriving: 'చేరుతోంది',
    delivered: 'డెలివర్ చేయబడింది',
    completed: 'పూర్తయింది',
    cancelled: 'రద్దు చేయబడింది',
    status: 'స్థితి',
    available: 'అందుబాటులో',
    unavailable: 'అందుబాటులో లేదు',
    live: 'ప్రత్యక్ష',
    down: 'డౌన్',
    checking: 'తనిఖీ చేస్తోంది'
  }
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly languageSubject = new BehaviorSubject<LanguageCode>(this.loadLanguage());
  readonly language$: Observable<LanguageCode> = this.languageSubject.asObservable();

  setLanguage(language: LanguageCode): void {
    localStorage.setItem(LANGUAGE_KEY, language);
    this.languageSubject.next(language);
  }

  getCurrentLanguage(): LanguageCode {
    return this.languageSubject.value;
  }

  t(key: string): string {
    const current = this.languageSubject.value;
    return translations[current][key] || translations.en[key] || key;
  }

  translateDynamic(value: string): string {
    const current = this.languageSubject.value;
    const raw = (value || '').trim();
    if (!raw) {
      return raw;
    }

    const byKey = this.getTranslationForKey(current, raw) || this.getTranslationForKey('en', raw);
    if (byKey) {
      return byKey;
    }

    const normalizedKey = this.normalizeToKey(raw);
    const byNormalizedKey = this.getTranslationForKey(current, normalizedKey) || this.getTranslationForKey('en', normalizedKey);
    if (byNormalizedKey) {
      return byNormalizedKey;
    }

    const humanized = this.humanize(raw);
    if (current === 'en') {
      return humanized;
    }

    const phraseMap = dynamicPhraseTranslations[current];
    const normalizedPhrase = this.normalizeToPhrase(raw);
    const normalizedHumanized = this.normalizeToPhrase(humanized);
    if (phraseMap[normalizedPhrase]) {
      return phraseMap[normalizedPhrase];
    }
    if (phraseMap[normalizedHumanized]) {
      return phraseMap[normalizedHumanized];
    }

    const translated = this.translateByTokens(humanized, current);
    return translated;
  }

  td(value: string): string {
    return this.translateDynamic(value);
  }

  private getTranslationForKey(language: LanguageCode, key: string): string | undefined {
    return translations[language][key];
  }

  private normalizeToKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeToPhrase(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private humanize(value: string): string {
    const normalized = value
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

    return normalized
      .split(' ')
      .map((part) => {
        if (!part) {
          return part;
        }
        if (part.toUpperCase() === part && part.length <= 4) {
          return part;
        }
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join(' ');
  }

  private translateByTokens(value: string, language: Exclude<LanguageCode, 'en'>): string {
    const tokenMap = dynamicTokenTranslations[language];
    let changed = false;

    const output = value
      .split(' ')
      .map((part) => {
        const match = part.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/);
        if (!match) {
          return part;
        }

        const prefix = match[1] || '';
        const token = match[2] || '';
        const suffix = match[3] || '';
        const translated = tokenMap[token.toLowerCase()];
        if (!translated) {
          return part;
        }

        changed = true;
        return `${prefix}${translated}${suffix}`;
      })
      .join(' ');

    return changed ? output : value;
  }

  private loadLanguage(): LanguageCode {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'te') {
      return saved;
    }
    return 'en';
  }
}
