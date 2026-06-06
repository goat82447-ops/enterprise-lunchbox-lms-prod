import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type LanguageCode = 'en' | 'hi' | 'te';

const LANGUAGE_KEY = 'delivery_app_language';

const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: 'Delivery Platform',
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
    selectLanguage: 'Select Language'
  },
  hi: {
    appName: 'डिलीवरी प्लेटफॉर्म',
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
    selectLanguage: 'भाषा चुनें'
  },
  te: {
    appName: 'డెలివరీ ప్లాట్‌ఫారం',
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
    selectLanguage: 'భాషను ఎంచుకోండి'
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
