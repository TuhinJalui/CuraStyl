/**
 * Client-side Translation Utility
 * Uses browser's native capabilities - NO API KEYS NEEDED
 */

export type SupportedLanguage = 
  | 'en' // English
  | 'hi' // Hindi
  | 'mr' // Marathi
  | 'gu' // Gujarati
  | 'ta' // Tamil
  | 'te' // Telugu
  | 'bn' // Bengali
  | 'kn' // Kannada;

export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  mr: { name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
};

// Beauty-specific vocabulary for better context
const BEAUTY_VOCABULARY: Record<string, Record<SupportedLanguage, string>> = {
  'haircut': {
    en: 'haircut',
    hi: 'बाल कटवाना',
    mr: 'केस कापणे',
    gu: 'વાળ કપાવવા',
    ta: 'முடி வெட்டுதல்',
    te: 'కేశ కత్తిరింపు',
    bn: 'চুল কাটা',
    kn: 'ಕೂದಲು ಕತ್ತರಿಸುವುದು',
  },
  'facial': {
    en: 'facial',
    hi: 'फेशियल',
    mr: 'फेशियल',
    gu: 'ફેશિયલ',
    ta: 'முக சிகிச்சை',
    te: 'ముఖ చికిత్స',
    bn: 'ফেসিয়াল',
    kn: 'ಮುಖ ಚಿಕಿತ್ಸೆ',
  },
  'salon': {
    en: 'salon',
    hi: 'सैलून',
    mr: 'सलून',
    gu: 'સલૂન',
    ta: 'அழகு நிலையம்',
    te: 'సెలూన్',
    bn: 'স্যালন',
    kn: 'ಸಲೂನ್',
  },
  'makeup': {
    en: 'makeup',
    hi: 'मेकअप',
    mr: 'मेकअप',
    gu: 'મેકઅપ',
    ta: 'ஒப்பனை',
    te: 'మేకప్',
    bn: 'মেকআপ',
    kn: 'ಮೇಕಪ್',
  },
  'bridal': {
    en: 'bridal',
    hi: 'दुल्हन',
    mr: 'वधू',
    gu: 'વધૂ',
    ta: 'மணப்பெண்',
    te: 'పెళ్లి కూతురు',
    bn: 'নববধূ',
    kn: 'ವಧು',
  },
};

/**
 * Translate text using MyMemory Translation API (Free, no key required)
 */
export async function translateText(
  text: string,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage = 'en'
): Promise<string> {
  if (sourceLang === targetLang || !text.trim()) {
    return text;
  }

  try {
    // Use MyMemory API (free, no key required)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${sourceLang}|${targetLang}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    // Fallback: return original text if translation fails
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Translate with beauty vocabulary awareness
 */
export async function translateBeautyText(
  text: string,
  targetLang: SupportedLanguage,
  sourceLang: SupportedLanguage = 'en'
): Promise<string> {
  if (sourceLang === targetLang) return text;

  let translatedText = text;

  // First, replace beauty-specific terms with their translations
  for (const [key, translations] of Object.entries(BEAUTY_VOCABULARY)) {
    const sourceWord = translations[sourceLang];
    const targetWord = translations[targetLang];
    
    if (sourceWord && targetWord) {
      const regex = new RegExp(`\\b${sourceWord}\\b`, 'gi');
      translatedText = translatedText.replace(regex, targetWord);
    }
  }

  // Then translate the rest using API
  try {
    translatedText = await translateText(translatedText, targetLang, sourceLang);
  } catch {
    // If API fails, at least vocabulary is translated
  }

  return translatedText;
}

/**
 * Speech-to-Text using browser's Web Speech API
 */
export function startSpeechRecognition(
  language: SupportedLanguage,
  onResult: (text: string) => void,
  onError?: (error: string) => void
): SpeechRecognition | null {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError?.('Speech recognition not supported in this browser');
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  // Language codes for speech recognition
  const speechLangCodes: Record<SupportedLanguage, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    kn: 'kn-IN',
  };

  recognition.lang = speechLangCodes[language];
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: { error: string }) => {
    onError?.(event.error);
  };

  recognition.start();
  return recognition;
}

/**
 * Text-to-Speech using browser's Web Speech API
 */
export function speakText(
  text: string,
  language: SupportedLanguage,
  onEnd?: () => void
): void {
  if (!('speechSynthesis' in window)) {
    console.error('Text-to-speech not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Language codes for TTS
  const ttsLangCodes: Record<SupportedLanguage, string> = {
    en: 'en-US',
    hi: 'hi-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    bn: 'bn-IN',
    kn: 'kn-IN',
  };

  utterance.lang = ttsLangCodes[language];
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;

  utterance.onend = () => {
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Get available voices for TTS
 */
export function getAvailableVoices(language?: SupportedLanguage): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) {
    return [];
  }

  const voices = window.speechSynthesis.getVoices();
  
  if (language) {
    const ttsLangCodes: Record<SupportedLanguage, string> = {
      en: 'en',
      hi: 'hi',
      mr: 'mr',
      gu: 'gu',
      ta: 'ta',
      te: 'te',
      bn: 'bn',
      kn: 'kn',
    };
    
    const langCode = ttsLangCodes[language];
    return voices.filter(voice => voice.lang.startsWith(langCode));
  }

  return voices;
}

// Declare Web Speech API types for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}
