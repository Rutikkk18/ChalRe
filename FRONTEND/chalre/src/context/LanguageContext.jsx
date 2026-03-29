import React, { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

const translations = {
  "English (India)": {
    // Footer Column 1
    rideAnywhere: "Ride Anywhere with ChalRe",
    popularRides: "Popular rides near you",
    trendingRides: "Trending ride destinations",

    // Footer Column 2
    sharedRoutes: "Shared Travel Routes",

    // Footer Column 3
    learnMore: "Learn More",
    aboutChalRe: "About ChalRe",
    howItWorks: "How ChalRe Works",
    helpSupport: "Help & Support",
    joinTeam: "Join Our Team",

    // Footer Bottom
    terms: "Terms & Conditions",
    copyright: "© ChalRe 2025",

    // Language button
    languageLabel: "Language",
  },

  "हिंदी (Hindi)": {
    rideAnywhere: "ChalRe के साथ कहीं भी सफर करें",
    popularRides: "आपके पास लोकप्रिय राइड्स",
    trendingRides: "ट्रेंडिंग राइड गंतव्य",

    sharedRoutes: "साझा यात्रा मार्ग",

    learnMore: "और जानें",
    aboutChalRe: "ChalRe के बारे में",
    howItWorks: "ChalRe कैसे काम करता है",
    helpSupport: "सहायता और समर्थन",
    joinTeam: "हमारी टीम में शामिल हों",

    terms: "नियम और शर्तें",
    copyright: "© ChalRe 2025",
    languageLabel: "भाषा",
  },

  "मराठी (Marathi)": {
    rideAnywhere: "ChalRe सोबत कुठेही प्रवास करा",
    popularRides: "तुमच्या जवळील लोकप्रिय राइड्स",
    trendingRides: "ट्रेंडिंग राइड गंतव्ये",

    sharedRoutes: "सामायिक प्रवास मार्ग",

    learnMore: "अधिक जाणून घ्या",
    aboutChalRe: "ChalRe बद्दल",
    howItWorks: "ChalRe कसे कार्य करते",
    helpSupport: "मदत आणि समर्थन",
    joinTeam: "आमच्या टीममध्ये सामील व्हा",

    terms: "नियम व अटी",
    copyright: "© ChalRe 2025",
    languageLabel: "भाषा",
  },

  "தமிழ் (Tamil)": {
    rideAnywhere: "ChalRe உடன் எங்கும் பயணிக்கலாம்",
    popularRides: "உங்கள் அருகில் பிரபலமான சவாரிகள்",
    trendingRides: "டிரெண்டிங் சவாரி இடங்கள்",

    sharedRoutes: "பகிரப்பட்ட பயண வழிகள்",

    learnMore: "மேலும் அறிக",
    aboutChalRe: "ChalRe பற்றி",
    howItWorks: "ChalRe எப்படி வேலை செய்கிறது",
    helpSupport: "உதவி & ஆதரவு",
    joinTeam: "எங்கள் குழுவில் சேருங்கள்",

    terms: "விதிமுறைகள் & நிபந்தனைகள்",
    copyright: "© ChalRe 2025",
    languageLabel: "மொழி",
  },

  "తెలుగు (Telugu)": {
    rideAnywhere: "ChalRe తో ఎక్కడైనా ప్రయాణించండి",
    popularRides: "మీ దగ్గర జనప్రియ రైడ్‌లు",
    trendingRides: "ట్రెండింగ్ రైడ్ గమ్యాలు",

    sharedRoutes: "భాగస్వామ్య ప్రయాణ మార్గాలు",

    learnMore: "మరింత తెలుసుకోండి",
    aboutChalRe: "ChalRe గురించి",
    howItWorks: "ChalRe ఎలా పనిచేస్తుంది",
    helpSupport: "సహాయం & మద్దతు",
    joinTeam: "మా జట్టులో చేరండి",

    terms: "నిబంధనలు & షరతులు",
    copyright: "© ChalRe 2025",
    languageLabel: "భాష",
  },

  "ಕನ್ನಡ (Kannada)": {
    rideAnywhere: "ChalRe ಜೊತೆ ಎಲ್ಲಿಯಾದರೂ ಪ್ರಯಾಣಿಸಿ",
    popularRides: "ನಿಮ್ಮ ಹತ್ತಿರ ಜನಪ್ರಿಯ ರೈಡ್‌ಗಳು",
    trendingRides: "ಟ್ರೆಂಡಿಂಗ್ ರೈಡ್ ಗಮ್ಯಸ್ಥಾನಗಳು",

    sharedRoutes: "ಹಂಚಿಕೆ ಪ್ರಯಾಣ ಮಾರ್ಗಗಳು",

    learnMore: "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",
    aboutChalRe: "ChalRe ಬಗ್ಗೆ",
    howItWorks: "ChalRe ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    helpSupport: "ಸಹಾಯ & ಬೆಂಬಲ",
    joinTeam: "ನಮ್ಮ ತಂಡವನ್ನು ಸೇರಿ",

    terms: "ನಿಯಮಗಳು & ಷರತ್ತುಗಳು",
    copyright: "© ChalRe 2025",
    languageLabel: "ಭಾಷೆ",
  },

  "বাংলা (Bengali)": {
    rideAnywhere: "ChalRe এর সাথে যেকোনো জায়গায় যান",
    popularRides: "আপনার কাছের জনপ্রিয় রাইড",
    trendingRides: "ট্রেন্ডিং রাইড গন্তব্য",

    sharedRoutes: "শেয়ার্ড ট্র্যাভেল রুট",

    learnMore: "আরও জানুন",
    aboutChalRe: "ChalRe সম্পর্কে",
    howItWorks: "ChalRe কীভাবে কাজ করে",
    helpSupport: "সাহায্য ও সহায়তা",
    joinTeam: "আমাদের দলে যোগ দিন",

    terms: "নিয়ম ও শর্তাবলী",
    copyright: "© ChalRe 2025",
    languageLabel: "ভাষা",
  },

  "ગુજરાતી (Gujarati)": {
    rideAnywhere: "ChalRe સાથે ગમે ત્યાં પ્રવાસ કરો",
    popularRides: "તમારી નજીકની લોકપ્રિય રાઇડ્સ",
    trendingRides: "ટ્રેન્ડિંગ રાઇડ ડેસ્ટિનેશન્સ",

    sharedRoutes: "શેર્ડ ટ્રાવેલ રૂટ્સ",

    learnMore: "વધુ જાણો",
    aboutChalRe: "ChalRe વિશે",
    howItWorks: "ChalRe કેવી રીતે કામ કરે છે",
    helpSupport: "મદદ અને સહાય",
    joinTeam: "અમારી ટીમમાં જોડાઓ",

    terms: "નિયમો અને શરતો",
    copyright: "© ChalRe 2025",
    languageLabel: "ભાષા",
  },
};

export const LanguageProvider = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState("English (India)");

  const t = (key) => {
    return translations[selectedLanguage]?.[key] || translations["English (India)"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};