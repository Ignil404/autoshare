import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Lang = "ru" | "en";

const translations: Record<Lang, Record<string, string>> = {
  ru: {
    "nav.home": "Главная",
    "nav.cars": "Машины",
    "nav.zones": "Зоны",
    "nav.bookings": "Брони",
    "nav.rentals": "Аренды",
    "nav.profile": "Профиль",
    "nav.logout": "Выйти",
    "dashboard.welcome": "Добро пожаловать в AutoShare!",
    "dashboard.balance": "Баланс",
    "dashboard.topup": "Пополнить",
    "dashboard.active_bookings": "Активные брони",
    "dashboard.active_rentals": "Аренды в пути",
    "dashboard.spent": "Потрачено",
    "cars.title": "Свободные автомобили",
    "cars.search": "Поиск по марке, модели, номеру…",
    "cars.all": "Все классы",
    "cars.book": "Забронировать",
    "cars.details": "Подробнее",
    "bookings.title": "Мои бронирования",
    "bookings.start": "Начать аренду",
    "bookings.cancel": "Отменить",
    "rentals.title": "Мои аренды",
    "rentals.pause": "Пауза",
    "rentals.resume": "Продолжить",
    "rentals.complete": "Завершить",
    "profile.title": "Мой профиль",
    "profile.change_password": "Изменить пароль",
    "profile.payment_history": "История платежей",
    "profile.security": "Безопасность",
    "common.loading": "Загрузка…",
    "common.error": "Что-то пошло не так",
    "common.save": "Сохранить",
    "common.cancel": "Отмена",
    "common.confirm": "Подтвердить",
  },
  en: {
    "nav.home": "Home",
    "nav.cars": "Cars",
    "nav.zones": "Zones",
    "nav.bookings": "Bookings",
    "nav.rentals": "Rentals",
    "nav.profile": "Profile",
    "nav.logout": "Logout",
    "dashboard.welcome": "Welcome to AutoShare!",
    "dashboard.balance": "Balance",
    "dashboard.topup": "Top up",
    "dashboard.active_bookings": "Active bookings",
    "dashboard.active_rentals": "Active rentals",
    "dashboard.spent": "Total spent",
    "cars.title": "Available cars",
    "cars.search": "Search by brand, model, plate…",
    "cars.all": "All classes",
    "cars.book": "Book",
    "cars.details": "Details",
    "bookings.title": "My bookings",
    "bookings.start": "Start rental",
    "bookings.cancel": "Cancel",
    "rentals.title": "My rentals",
    "rentals.pause": "Pause",
    "rentals.resume": "Resume",
    "rentals.complete": "Complete",
    "profile.title": "My profile",
    "profile.change_password": "Change password",
    "profile.payment_history": "Payment history",
    "profile.security": "Security",
    "common.loading": "Loading…",
    "common.error": "Something went wrong",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
  },
};

interface I18nContextType {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
}

const I18nContext = createContext<I18nContextType>({ lang: "ru", t: (k) => k, toggleLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("lang") as Lang) || "ru";
    }
    return "ru";
  });

  const t = useCallback((key: string) => translations[lang][key] ?? key, [lang]);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next = l === "ru" ? "en" : "ru";
      localStorage.setItem("lang", next);
      return next;
    });
  }, []);

  return <I18nContext.Provider value={{ lang, t, toggleLang }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
