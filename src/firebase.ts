import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // <-- Подключаем модуль авторизации
import { createClient } from '@supabase/supabase-js';

// 1. Настройка Firebase (для базы данных и авторизации)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // <-- Экспортируем auth для управления пользователями

// 2. Настройка Supabase (для хранения фотографий и PDF)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Функция загрузки документов в хранилище Supabase Storage
 */
export async function uploadVehicleDocument(
  file: File,
  lkwPlate: string,
  docType: string
): Promise<string> {
  const timestamp = Date.now();
  
  // Очищаем номер машины от пробелов и спецсимволов для безопасного имени папки
  const cleanPlate = lkwPlate.replace(/[^a-zA-Z0-9]/g, '_');
  
  // Формируем путь: папка_номера/тип_документа_время_имя_файла
  const filePath = `${cleanPlate}/${docType}_${timestamp}_${file.name}`;

  // Загружаем файл в бакет 'documents'
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Ошибка при загрузке файла в Supabase:', error);
    throw new Error('Datei konnte nicht hochgeladen werden.');
  }

  // Безопасно используем переменную data, чтобы не ругался TypeScript lint
  if (data) {
    console.log(`[Supabase] Успешно загружено: ${data.path}`);
  }

  // Получаем прямую публичную ссылку на загруженный файл
  const { data: publicUrlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}