import { Injectable, signal } from '@angular/core';
import { en } from './i18n/en';
import { ru } from './i18n/ru';
import { uk } from './i18n/uk';

export type AppLanguage = 'en' | 'ru' | 'uk';

export type TranslationValue = string | ((params?: Record<string, string | number>) => string);

type TranslationDictionary = Record<AppLanguage, Record<string, TranslationValue>>;

const LANGUAGE_STORAGE_KEY = 'devmap-language';

const translations: TranslationDictionary = { en, ru, uk };

function normalizeLanguage(language: string | null | undefined): AppLanguage {
  if (!language) return 'en';
  const normalized = language.toLowerCase();
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('uk') || normalized.startsWith('ua')) return 'uk';
  return 'en';
}

@Injectable({
  providedIn: 'root',
})
export class I18nService {
  readonly availableLanguages: AppLanguage[] = ['en', 'ru', 'uk'];
  readonly language = signal<AppLanguage>(this.getInitialLanguage());

  currentLanguage(): AppLanguage {
    return this.language();
  }

  setLanguage(language: AppLanguage) {
    this.language.set(language);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const language = this.language();
    const value = translations[language][key] ?? translations.en[key] ?? key;
    if (typeof value === 'function') {
      return value(params);
    }
    return value;
  }

  private getInitialLanguage(): AppLanguage {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      return normalizeLanguage(stored);
    }

    const browserLanguage = navigator.languages?.[0] ?? navigator.language;
    return normalizeLanguage(browserLanguage);
  }
}
