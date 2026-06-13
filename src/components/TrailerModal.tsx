import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { TrailerUnit, HistoryEntry } from '../types';
import { auth } from '../firebase'; // Импортируем авторизацию

export type TrailerSavePayload = Partial<TrailerUnit> & {
  trailerTuevFileObj?: File | null;
};

type TrailerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TrailerSavePayload) => void;
  initialData?: TrailerUnit;
};

export default function TrailerModal({ isOpen, onClose, onSave, initialData }: TrailerModalProps) {
  const [trailerPlate, setTrailerPlate] = useState(initialData?.trailerPlate || '');
  const [trailerTuev, setTrailerTuev] = useState(initialData?.trailerTuev?.date || '');
  const [trailerTuevFile, setTrailerTuevFile] = useState<File | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTrailerTuevFile(e.target.files?.[0] ?? null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Вытаскиваем имя залогиненного пользователя
    const currentUserName = auth.currentUser?.displayName || 'User';
    const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

    // Создаем копию существующей истории прицепа
    let updatedHistory: HistoryEntry[] = initialData?.history ? [...initialData.history] : [];

    // Логика сохранения истории "на шаг назад"
    if (initialData) {
      // Проверяем, изменилась ли дата TÜV
      if (trailerTuev !== (initialData.trailerTuev?.date || '')) {
        const oldDate = initialData.trailerTuev?.date || 'keines';
        const oldUrl = initialData.trailerTuev?.fileUrl;

        updatedHistory.unshift({
          id: `trailer_tuev_hist_${Date.now()}`,
          timestamp,
          driverName: currentUserName,
          action: `Auflieger TÜV aktualisiert (Alt: ${oldDate} -> Neu: ${trailerTuev})`,
          oldDocUrl: oldUrl || undefined // Прячем ссылку на старый документ в историю
        });
      }
    } else {
      // Если это абсолютно новый прицеп
      updatedHistory.unshift({
        id: `trailer_create_${Date.now()}`,
        timestamp,
        driverName: currentUserName,
        action: 'Auflieger im System neu registriert'
      });
    }

    onSave({
      trailerPlate,
      trailerTuev: { date: trailerTuev, fileUrl: initialData?.trailerTuev?.fileUrl || null },
      currentLkwId: initialData?.currentLkwId || null,
      history: updatedHistory, // Передаем историю с автором изменения
      trailerTuevFileObj: trailerTuevFile,
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-150">
        <h2 className="text-xl font-black mb-6 text-gray-800">
          {initialData ? '🛞 Auflieger bearbeiten' : '🛞 Neuen Auflieger hinzufügen'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auflieger Kennzeichen *</label>
            <input type="text" value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold" required />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-sm text-gray-700 border-b pb-2">Auflieger TÜV</h3>
            <div className="grid grid-cols-1 gap-3">
              <input type="date" value={trailerTuev} onChange={(e) => setTrailerTuev(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white" />
              <input type="file" accept=".pdf, image/*" onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-bold text-sm transition-colors">Abbrechen</button>
            <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold text-sm shadow-sm transition-all">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}