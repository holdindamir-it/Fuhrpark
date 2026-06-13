export interface VehicleDocument {
  date: string;
  fileUrl: string | null;
  // Флаги для облачной функции Twilio, чтобы СМС не дублировались каждый день
  smsSent6Months?: boolean; // Отправлено ли уведомление за 6 месяцев
  smsSent1Month?: boolean;  // Отправлено ли уведомление за 1 месяц
  smsSentExpired?: boolean; // Отправлено ли уведомление о полной просрочке
}

export interface HistoryEntry {
  id?: string;          // Уникальный ID записи для новой системы архивации
  timestamp: string;    // Время совершения действия
  user?: string;        // Имя пользователя (для совместимости со старыми записями)
  driverName?: string;  // Имя водителя (из новой системы авторизации Firebase)
  action: string;       // Описание действия (например, "TÜV aktualisiert")
  oldDocUrl?: string;   // Ссылка на старый документ для хранения истории "на шаг назад"
}

// 1. Тип для независимого Тягача (LKW)
export interface LkwUnit {
  id?: string;
  lkwPlate: string;
  lkwTuev: VehicleDocument;
  lkwSp: VehicleDocument;
  fahrzeugscheinUrl: string | null;
  currentTrailerId: string | null; // ID прицепа, который сейчас зацеплен (или null, если свободен)
  history: HistoryEntry[];
}

// 2. Тип для независимого Прицепа (Trailer)
export interface TrailerUnit {
  id?: string;
  trailerPlate: string;
  trailerTuev: VehicleDocument;
  currentLkwId: string | null; // ID тягача, к которому он сейчас прицеплен (или null, если стоит в гараже)
  history: HistoryEntry[];
}

// 3. Вспомогательный тип для Главного экрана (Активные сцепки)
export interface ActiveCoupling {
  id: string; // Будет равен ID тягача
  lkw: LkwUnit;
  trailer: TrailerUnit;
}