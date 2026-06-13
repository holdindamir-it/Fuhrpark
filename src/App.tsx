import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { db, auth, uploadVehicleDocument } from './firebase'; // Добавили auth
import type { LkwUnit, TrailerUnit } from './types';
import { formatDateDe, getAmpelStatus, getCurrentFormattedTime } from './utils/dateUtils';
import StatusIndicator from './components/StatusIndicator';
import AlertBanner from './components/AlertBanner';

// Импортируем компоненты
import Auth from './components/Auth'; // Компонент авторизации
import LkwModal from './components/LkwModal';
import type { LkwSavePayload } from './components/LkwModal';
import TrailerModal from './components/TrailerModal';
import type { TrailerSavePayload } from './components/TrailerModal';

// ----- Локализация / Переводы -----
const translations = {
  de: {
    title: "Fuhrpark",
    userLabel: "Fahrer:",
    tabMain: "Gespanne",
    tabLkws: "LKW Pool",
    tabTrailers: "Auflieger",
    addLkwBtn: "+ LKW",
    addTrailerBtn: "+ Aufl.",
    thLkw: "LKW",
    thTrailer: "Auflieger",
    thTuev: "TÜV",
    thSp: "SP",
    thStatus: "Status",
    thHistory: "Historie",
    thActions: "Aktionen",
    coupleBtn: "🔗 Koppeln",
    uncoupleBtn: "❌ Trennen",
    editBtn: "✏️ Bearb.",
    statusFree: "🟢 Frei",
    statusCoupled: "🔴 Weg",
    emptyMain: "Keine aktiven Gespanne. Bitte LKW und Auflieger koppeln.",
    emptyLkw: "Keine LKWs im Pool.",
    emptyTrailer: "Keine Auflieger im Pool.",
    alertTitle: "Achtung: Dokumente prüfen!",
    alertDismiss: "Schließen",
    expired: "abgelaufen",
    soon: "bald fällig",
    saving: "Speichern...",
    logout: "Abmelden"
  },
  ru: {
    title: "Автопарк",
    userLabel: "Водитель:",
    tabMain: "В рейсе",
    tabLkws: "Тягачи",
    tabTrailers: "Прицепы",
    addLkwBtn: "+ Тягач",
    addTrailerBtn: "+ Прицеп",
    thLkw: "Тягач",
    thTrailer: "Прицеп",
    thTuev: "TÜV",
    thSp: "SP",
    thStatus: "Статус",
    thHistory: "История",
    thActions: "Действия",
    coupleBtn: "🔗 Сцепить",
    uncoupleBtn: "❌ Расцепить",
    editBtn: "✏️ Ред.",
    statusFree: "🟢 Свободен",
    statusCoupled: "🔴 В рейсе",
    emptyMain: "Нет активных сцепок. Соедините тягач с прицепом.",
    emptyLkw: "База тягачей пуста.",
    emptyTrailer: "База прицепов пуста.",
    alertTitle: "Внимание: проверьте документы!",
    alertDismiss: "Закрыть",
    expired: "просрочен",
    soon: "скоро истекает",
    saving: "Сохранение...",
    logout: "Выйти"
  },
  uk: {
    title: "Автопарк",
    userLabel: "Водій:",
    tabMain: "У рейсі",
    tabLkws: "Тягачі",
    tabTrailers: "Причепи",
    addLkwBtn: "+ Тягач",
    addTrailerBtn: "+ Причіп",
    thLkw: "Тягач",
    thTrailer: "Причіп",
    thTuev: "TÜV",
    thSp: "SP",
    thStatus: "Status",
    thHistory: "Історія",
    thActions: "Дії",
    coupleBtn: "🔗 Зчепити",
    uncoupleBtn: "❌ Розчепити",
    editBtn: "✏️ Ред.",
    statusFree: "🟢 Вільний",
    statusCoupled: "🔴 У рейсі",
    emptyMain: "Немає активних зчіпок. З'єднайте тягач із причепом.",
    emptyLkw: "База тягачів порожня.",
    emptyTrailer: "База причепів порожня.",
    alertTitle: "Увага: перевірте документи!",
    alertDismiss: "Закрити",
    expired: "прострочений",
    soon: "скоро закінчується",
    saving: "Збереження...",
    logout: "Вийти"
  }
};

type LangKey = 'de' | 'ru' | 'uk';
type TabKey = 'main' | 'lkws' | 'trailers';

export default function App() {
  // Состояние авторизации
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [lang, setLang] = useState<LangKey>('de');
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  
  const [lkws, setLkws] = useState<LkwUnit[]>([]);
  const [trailers, setTrailers] = useState<TrailerUnit[]>([]);
  
  const [alerts, setAlerts] = useState<string[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [isLkwModalOpen, setIsLkwModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [editingLkw, setEditingLkw] = useState<LkwUnit | null>(null);
  const [editingTrailer, setEditingTrailer] = useState<TrailerUnit | null>(null);

  const t = translations[lang];

  // Подписка на статус авторизации Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Подписка на данные БД (работает только если есть user)
  useEffect(() => {
    if (!user) return;
    const unsubLkws = onSnapshot(collection(db, 'lkws'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LkwUnit[];
      setLkws(data);
    });
    const unsubTrailers = onSnapshot(collection(db, 'trailers'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TrailerUnit[];
      setTrailers(data);
    });
    return () => { unsubLkws(); unsubTrailers(); };
  }, [user]);

  // Система алертов
  useEffect(() => {
    const newAlerts: string[] = [];
    lkws.forEach(v => {
      const tuev = getAmpelStatus(v.lkwTuev?.date);
      if (tuev === 'yellow' || tuev === 'red') newAlerts.push(`${t.thLkw} ${v.lkwPlate} - TÜV ${tuev === 'red' ? t.expired : t.soon}!`);
      const sp = getAmpelStatus(v.lkwSp?.date);
      if (sp === 'yellow' || sp === 'red') newAlerts.push(`${t.thLkw} ${v.lkwPlate} - SP ${sp === 'red' ? t.expired : t.soon}!`);
    });
    trailers.forEach(tUnit => {
      const tuev = getAmpelStatus(tUnit.trailerTuev?.date);
      if (tuev === 'yellow' || tuev === 'red') newAlerts.push(`${t.thTrailer} ${tUnit.trailerPlate} - TÜV ${tuev === 'red' ? t.expired : t.soon}!`);
    });
    setAlerts(newAlerts);
  }, [lkws, trailers, lang, t]);

  const activeCouplings = lkws
    .filter(lkw => lkw.currentTrailerId !== null)
    .map(lkw => ({ lkw, trailer: trailers.find(tr => tr.id === lkw.currentTrailerId) }))
    .filter(c => c.trailer !== undefined) as { lkw: LkwUnit, trailer: TrailerUnit }[];

  // Функция отправки SMS через Twilio
  const sendTwilioSMS = async (message: string) => {
    const sid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const token = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const from = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
    const to = import.meta.env.VITE_TWILIO_TO_NUMBER; // Твой номер из .env

    if (!sid || !token || !from || !to) return;

    try {
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', from);
      formData.append('Body', `[Fuhrpark Alert] ${message}`);

      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${sid}:${token}`)
        },
        body: formData.toString()
      });
      console.log('СМС успешно отправлено в Twilio!');
    } catch (error) {
      console.error("Ошибка при отправке СМС:", error);
    }
  };

  const handleSaveLkw = async (payload: LkwSavePayload) => {
    if (!payload.lkwPlate) return;
    setLoading(true);
    try {
      let lkwTuevUrl = payload.lkwTuev?.fileUrl || null;
      let lkwSpUrl = payload.lkwSp?.fileUrl || null;
      let fahrzeugscheinUrl = payload.fahrzeugscheinUrl || null;

      if (payload.lkwTuevFileObj) lkwTuevUrl = await uploadVehicleDocument(payload.lkwTuevFileObj, payload.lkwPlate, 'LKW_TUEV');
      if (payload.lkwSpFileObj) lkwSpUrl = await uploadVehicleDocument(payload.lkwSpFileObj, payload.lkwPlate, 'LKW_SP');
      if (payload.fahrzeugscheinFileObj) fahrzeugscheinUrl = await uploadVehicleDocument(payload.fahrzeugscheinFileObj, payload.lkwPlate, 'FAHRZEUGSCHEIN');

      const data = {
        lkwPlate: payload.lkwPlate,
        lkwTuev: { date: payload.lkwTuev?.date || '', fileUrl: lkwTuevUrl },
        lkwSp: { date: payload.lkwSp?.date || '', fileUrl: lkwSpUrl },
        fahrzeugscheinUrl,
        currentTrailerId: payload.currentTrailerId || null,
        history: payload.history || [],
      };

      if (editingLkw?.id) await updateDoc(doc(db, 'lkws', editingLkw.id), data as any);
      else await addDoc(collection(db, 'lkws'), data);

      // Проверка на критические даты для отправки СМС
      const tuevStatus = getAmpelStatus(payload.lkwTuev?.date);
      const spStatus = getAmpelStatus(payload.lkwSp?.date);
      if (tuevStatus === 'red' || spStatus === 'red') {
        sendTwilioSMS(`Kritisch! LKW ${payload.lkwPlate} hat abgelaufene Dokumente (TÜV/SP).`);
      }

    } catch (e: any) {
      console.error(e);
      alert("Ошибка сохранения тягача: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrailer = async (payload: TrailerSavePayload) => {
    if (!payload.trailerPlate) return;
    setLoading(true);
    try {
      let trailerTuevUrl = payload.trailerTuev?.fileUrl || null;
      if (payload.trailerTuevFileObj) trailerTuevUrl = await uploadVehicleDocument(payload.trailerTuevFileObj, payload.trailerPlate, 'TRAILER_TUEV');

      const data = {
        trailerPlate: payload.trailerPlate,
        trailerTuev: { date: payload.trailerTuev?.date || '', fileUrl: trailerTuevUrl },
        currentLkwId: payload.currentLkwId || null,
        history: payload.history || [],
      };

      if (editingTrailer?.id) await updateDoc(doc(db, 'trailers', editingTrailer.id), data as any);
      else await addDoc(collection(db, 'trailers'), data);

      // Проверка на критические даты для отправки СМС
      const tuevStatus = getAmpelStatus(payload.trailerTuev?.date);
      if (tuevStatus === 'red') {
        sendTwilioSMS(`Kritisch! Auflieger ${payload.trailerPlate} hat abgelaufenen TÜV.`);
      }

    } catch (e: any) {
      console.error(e);
      alert("Ошибка сохранения прицепа: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const handleUncouple = async (lkw: LkwUnit, trailer: TrailerUnit) => {
    if (!lkw.id || !trailer.id) return;
    const time = getCurrentFormattedTime();
    const currentUserName = user?.displayName || 'User'; // Берем имя из Firebase
    
    const lkwHistory = [...lkw.history, { timestamp: time, user: currentUserName, action: `Getrennt von Auflieger ${trailer.trailerPlate}` }];
    const trailerHistory = [...trailer.history, { timestamp: time, user: currentUserName, action: `Getrennt von LKW ${lkw.lkwPlate}` }];

    try {
      await updateDoc(doc(db, 'lkws', lkw.id), { currentTrailerId: null, history: lkwHistory } as any);
      await updateDoc(doc(db, 'trailers', trailer.id), { currentLkwId: null, history: trailerHistory } as any);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCouplePrompt = async (lkw: LkwUnit) => {
    if (!lkw.id) return;
    const freeTrailers = trailers.filter(tr => !tr.currentLkwId);
    if (freeTrailers.length === 0) return alert("Keine freien Auflieger verfügbar!");
    
    const trailerList = freeTrailers.map(tr => tr.trailerPlate).join(', ');
    const input = prompt(`Kennzeichen des Aufliegers eingeben:\n[ ${trailerList} ]`);
    
    const selectedTrailer = freeTrailers.find(tr => tr.trailerPlate === input);
    if (!selectedTrailer || !selectedTrailer.id) return;

    const time = getCurrentFormattedTime();
    const currentUserName = user?.displayName || 'User'; // Берем имя из Firebase

    const lkwHistory = [...lkw.history, { timestamp: time, user: currentUserName, action: `Gekoppelt mit Auflieger ${selectedTrailer.trailerPlate}` }];
    const trailerHistory = [...selectedTrailer.history, { timestamp: time, user: currentUserName, action: `Gekoppelt mit LKW ${lkw.lkwPlate}` }];

    try {
      await updateDoc(doc(db, 'lkws', lkw.id), { currentTrailerId: selectedTrailer.id, history: lkwHistory } as any);
      await updateDoc(doc(db, 'trailers', selectedTrailer.id), { currentLkwId: lkw.id, history: trailerHistory } as any);
      setActiveTab('main');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Экран загрузки проверки аутентификации
  if (authLoading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Загрузка...</div>;

  // Если не авторизован - показываем компонент логина
  if (!user) return <Auth onAuthSuccess={() => {}} />;

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-8 font-sans antialiased text-gray-800">
      
      {/* --- ШАПКА --- */}
      <header className="max-w-7xl mx-auto bg-white p-4 rounded-xl shadow-sm mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{t.title}</h1>
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as LangKey)}
            className="border border-gray-200 bg-gray-50 text-gray-700 font-bold rounded-lg px-2.5 py-1.5 text-xs cursor-pointer outline-none"
          >
            <option value="de">🇩🇪 DE</option><option value="ru">🇷🇺 RU</option><option value="uk">🇺🇦 UA</option>
          </select>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Отображаем реальное имя авторизованного пользователя */}
          <div className="flex items-center gap-2 justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.userLabel}</span>
            <span className="text-sm font-black text-gray-900 tracking-tight">{user.displayName || user.email}</span>
            <button onClick={handleLogout} className="ml-2 text-[10px] bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded font-bold uppercase hover:bg-red-100 transition-colors">
              {t.logout}
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setEditingLkw(null); setIsLkwModalOpen(true); }} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 text-xs font-black uppercase tracking-wider transition-all">{t.addLkwBtn}</button>
            <button onClick={() => { setEditingTrailer(null); setIsTrailerModalOpen(true); }} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 text-xs font-black uppercase tracking-wider transition-all">{t.addTrailerBtn}</button>
          </div>
        </div>
      </header>

      {/* --- НАВИГАЦИОННЫЕ ВКЛАДКИ --- */}
      <div className="max-w-7xl mx-auto flex bg-white p-1 rounded-xl shadow-sm mb-5 gap-1">
        <button onClick={() => setActiveTab('main')} className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-black tracking-tight transition-all duration-150 ${activeTab === 'main' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
          {t.tabMain} ({activeCouplings.length})
        </button>
        <button onClick={() => setActiveTab('lkws')} className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-black tracking-tight transition-all duration-150 ${activeTab === 'lkws' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
          {t.tabLkws} ({lkws.length})
        </button>
        <button onClick={() => setActiveTab('trailers')} className={`flex-1 text-center py-2 px-1 rounded-lg text-xs font-black tracking-tight transition-all duration-150 ${activeTab === 'trailers' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
          {t.tabTrailers} ({trailers.length})
        </button>
      </div>

      <main className="max-w-7xl mx-auto">
        {!dismissedAlerts && <AlertBanner alerts={alerts} onDismiss={() => setDismissedAlerts(true)} title={t.alertTitle} dismissTxt={t.alertDismiss} />}

        {/* Вкладка 1: В РЕЙСЕ */}
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCouplings.length === 0 ? <div className="bg-white rounded-xl p-6 text-center text-gray-400 font-medium col-span-full shadow-sm">{t.emptyMain}</div> : 
             activeCouplings.map(({lkw, trailer}) => (
              <div key={lkw.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black tracking-tight"> {lkw.lkwPlate}</h3>
                    <p className="text-blue-100 font-bold text-xs mt-0.5">🛞 {trailer.trailerPlate}</p>
                  </div>
                  <button onClick={() => handleUncouple(lkw, trailer)} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-colors">
                    {t.uncoupleBtn}
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-2 bg-gray-50/50">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.thLkw} TÜV</span><div className="flex items-center gap-2 text-sm font-bold text-gray-800"><StatusIndicator status={getAmpelStatus(lkw.lkwTuev?.date)} />{formatDateDe(lkw.lkwTuev?.date)}</div></div>
                  <div className="flex justify-between items-center py-1"><span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.thTrailer} TÜV</span><div className="flex items-center gap-2 text-sm font-bold text-gray-800"><StatusIndicator status={getAmpelStatus(trailer.trailerTuev?.date)} />{formatDateDe(trailer.trailerTuev?.date)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Вкладка 2: ТЯГАЧИ */}
        {activeTab === 'lkws' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lkws.length === 0 ? <div className="bg-white rounded-xl p-6 text-center text-gray-400 font-medium shadow-sm">{t.emptyLkw}</div> : 
             lkws.map(lkw => (
              <div key={lkw.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">🚛 {lkw.lkwPlate}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${lkw.currentTrailerId ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {lkw.currentTrailerId ? t.statusCoupled : t.statusFree}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between"><span>TÜV:</span><div className="flex items-center gap-1.5 font-bold"><StatusIndicator status={getAmpelStatus(lkw.lkwTuev?.date)} />{formatDateDe(lkw.lkwTuev?.date)} {lkw.lkwTuev?.fileUrl && <a href={lkw.lkwTuev.fileUrl} target="_blank" rel="noreferrer" className="ml-1 text-sm">📄</a>}</div></div>
                    <div className="flex items-center justify-between"><span>SP:</span><div className="flex items-center gap-1.5 font-bold"><StatusIndicator status={getAmpelStatus(lkw.lkwSp?.date)} />{formatDateDe(lkw.lkwSp?.date)} {lkw.lkwSp?.fileUrl && <a href={lkw.lkwSp.fileUrl} target="_blank" rel="noreferrer" className="ml-1 text-sm">📄</a>}</div></div>
                    {lkw.fahrzeugscheinUrl && <div className="text-right pt-1"><a href={lkw.fahrzeugscheinUrl} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded uppercase border border-blue-100">Fahrzeugschein</a></div>}
                  </div>
                  
                  <div className="mt-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t.thHistory}</span>
                    <div className="max-h-20 overflow-y-auto text-[11px] bg-gray-50/50 p-2 rounded-lg border border-gray-100 space-y-1">
                      {lkw.history.length === 0 ? <span className="text-gray-400 italic">-</span> : lkw.history.map((h, i) => (
                        <div key={i} className="border-b border-gray-100 pb-1 last:border-0">
                          <b className="text-gray-700">{h.timestamp} ({h.user || h.driverName}):</b> <span className="text-gray-500">{h.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex sm:flex-col gap-2 justify-end sm:justify-start sm:border-l sm:border-gray-100 sm:pl-3 min-w-[100px]">
                  {!lkw.currentTrailerId && (
                    <button onClick={() => handleCouplePrompt(lkw)} className="flex-1 sm:flex-initial bg-green-600 text-white hover:bg-green-700 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors shadow-sm">
                      {t.coupleBtn}
                    </button>
                  )}
                  <button onClick={() => { setEditingLkw(lkw); setIsLkwModalOpen(true); }} className="flex-1 sm:flex-initial bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors">
                    {t.editBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Вкладка 3: ПРИЦЕПЫ */}
        {activeTab === 'trailers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trailers.length === 0 ? <div className="bg-white rounded-xl p-6 text-center text-gray-400 font-medium shadow-sm">{t.emptyTrailer}</div> : 
             trailers.map(tr => (
              <div key={tr.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">🛞 {tr.trailerPlate}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${tr.currentLkwId ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {tr.currentLkwId ? t.statusCoupled : t.statusFree}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between"><span>TÜV:</span><div className="flex items-center gap-1.5 font-bold"><StatusIndicator status={getAmpelStatus(tr.trailerTuev?.date)} />{formatDateDe(tr.trailerTuev?.date)} {tr.trailerTuev?.fileUrl && <a href={tr.trailerTuev.fileUrl} target="_blank" rel="noreferrer" className="ml-1 text-sm">📄</a>}</div></div>
                  </div>

                  <div className="mt-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">{t.thHistory}</span>
                    <div className="max-h-20 overflow-y-auto text-[11px] bg-gray-50/50 p-2 rounded-lg border border-gray-100 space-y-1">
                      {tr.history.length === 0 ? <span className="text-gray-400 italic">-</span> : tr.history.map((h, i) => (
                        <div key={i} className="border-b border-gray-100 pb-1 last:border-0">
                          <b className="text-gray-700">{h.timestamp} ({h.user || h.driverName}):</b> <span className="text-gray-500">{h.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 justify-end sm:justify-start sm:border-l sm:border-gray-100 sm:pl-3 min-w-[100px]">
                  <button onClick={() => { setEditingTrailer(tr); setIsTrailerModalOpen(true); }} className="flex-1 sm:flex-initial bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors">
                    {t.editBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-xl shadow-2xl font-black text-gray-800 flex items-center gap-3 text-sm uppercase tracking-wider">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            {t.saving}
          </div>
        </div>
      )}

      <LkwModal isOpen={isLkwModalOpen} onClose={() => setIsLkwModalOpen(false)} onSave={handleSaveLkw} initialData={editingLkw || undefined} />
      <TrailerModal isOpen={isTrailerModalOpen} onClose={() => setIsTrailerModalOpen(false)} onSave={handleSaveTrailer} initialData={editingTrailer || undefined} />

    </div>
  );
}