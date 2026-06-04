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

  private loadLanguage(): LanguageCode {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'te') {
      return saved;
    }
    return 'en';
  }
}
