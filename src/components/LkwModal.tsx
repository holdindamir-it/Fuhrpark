import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { LkwUnit, HistoryEntry } from '../types';
import { auth } from '../firebase'; // Импортируем модуль авторизации

export type LkwSavePayload = Partial<LkwUnit> & {
  lkwTuevFileObj?: File | null;
  lkwSpFileObj?: File | null;
  fahrzeugscheinFileObj?: File | null;
};

type LkwModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: LkwSavePayload) => void;
  initialData?: LkwUnit;
};

export default function LkwModal({ isOpen, onClose, onSave, initialData }: LkwModalProps) {
  const [lkwPlate, setLkwPlate] = useState(initialData?.lkwPlate || '');
  const [lkwTuev, setLkwTuev] = useState(initialData?.lkwTuev?.date || '');
  const [lkwSp, setLkwSp] = useState(initialData?.lkwSp?.date || '');

  const [lkwTuevFile, setLkwTuevFile] = useState<File | null>(null);
  const [lkwSpFile, setLkwSpFile] = useState<File | null>(null);
  const [fahrzeugscheinFile, setFahrzeugscheinFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (setter: (file: File | null) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.files?.[0] ?? null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Получаем имя залогиненного пользователя (или ставим User, если имя не заполнено)
    const currentUserName = auth.currentUser?.displayName || 'User';
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    
    // Создаем копию текущей истории или новый массив
    let updatedHistory: HistoryEntry[] = initialData?.history ? [...initialData.history] : [];

    // Логика сохранения истории документов "на шаг назад"
    if (initialData) {
      // 1. Проверяем изменение TÜV
      if (lkwTuev !== (initialData.lkwTuev?.date || '')) {
        const oldDate = initialData.lkwTuev?.date || 'keines';
        const oldUrl = initialData.lkwTuev?.fileUrl;
        
        updatedHistory.unshift({
          id: `tuev_hist_${Date.now()}`,
          timestamp,
          driverName: currentUserName,
          action: `TÜV aktualisiert (Alt: ${oldDate} -> Neu: ${lkwTuev})`,
          oldDocUrl: oldUrl || undefined // Сохраняем ссылку на старый файл в архив истории
        });
      }

      // 2. Проверяем изменение SP
      if (lkwSp !== (initialData.lkwSp?.date || '')) {
        const oldDate = initialData.lkwSp?.date || 'keines';
        const oldUrl = initialData.lkwSp?.fileUrl;

        updatedHistory.unshift({
          id: `sp_hist_${Date.now()}`,
          timestamp,
          driverName: currentUserName,
          action: `SP aktualisiert (Alt: ${oldDate} -> Neu: ${lkwSp})`,
          oldDocUrl: oldUrl || undefined // Сохраняем ссылку на старый файл в архив истории
        });
      }
    } else {
      // Если это создание абсолютно нового грузовика, просто делаем отметку в истории
      updatedHistory.unshift({
        id: `create_${Date.now()}`,
        timestamp,
        driverName: currentUserName,
        action: 'LKW im System neu registriert'
      });
    }

    onSave({
      lkwPlate,
      lkwTuev: { date: lkwTuev, fileUrl: initialData?.lkwTuev?.fileUrl || null },
      lkwSp: { date: lkwSp, fileUrl: initialData?.lkwSp?.fileUrl || null },
      fahrzeugscheinUrl: initialData?.fahrzeugscheinUrl || null,
      currentTrailerId: initialData?.currentTrailerId || null,
      history: updatedHistory, // Передаем обновленную историю с автором действия
      lkwTuevFileObj: lkwTuevFile,
      lkwSpFileObj: lkwSpFile,
      fahrzeugscheinFileObj: fahrzeugscheinFile,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-black mb-6 text-gray-800">
          {initialData ? '🚛 LKW bearbeiten' : '🚛 Neuen LKW hinzufügen'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">LKW Kennzeichen *</label>
            <input type="text" value={lkwPlate} onChange={(e) => setLkwPlate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold" required />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-sm text-gray-700 border-b pb-2">LKW TÜV</h3>
            <div className="grid grid-cols-1 gap-3">
              <input type="date" value={lkwTuev} onChange={(e) => setLkwTuev(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
              <input type="file" accept=".pdf, image/*" onChange={handleFileChange(setLkwTuevFile)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-sm text-gray-700 border-b pb-2">LKW SP</h3>
            <div className="grid grid-cols-1 gap-3">
              <input type="date" value={lkwSp} onChange={(e) => setLkwSp(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
              <input type="file" accept=".pdf, image/*" onChange={handleFileChange(setLkwSpFile)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <h3 className="font-bold text-sm text-gray-700">Fahrzeugschein</h3>
            <input type="file" accept=".pdf, image/*" onChange={handleFileChange(setFahrzeugscheinFile)} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm transition-colors">Abbrechen</button>
            <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-sm transition-all">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}