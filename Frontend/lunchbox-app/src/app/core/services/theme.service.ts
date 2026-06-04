import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeCode = 'light' | 'dark' | 'ocean';

const THEME_KEY = 'delivery_app_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSubject = new BehaviorSubject<ThemeCode>(this.loadTheme());
  readonly theme$: Observable<ThemeCode> = this.themeSubject.asObservable();

  constructor() {
    this.applyTheme(this.themeSubject.value);
  }

  setTheme(theme: ThemeCode): void {
    localStorage.setItem(THEME_KEY, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  getCurrentTheme(): ThemeCode {
    return this.themeSubject.value;
  }

  private applyTheme(theme: ThemeCode): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  private loadTheme(): ThemeCode {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'ocean') {
      return saved;
    }
    return 'light';
  }
}
