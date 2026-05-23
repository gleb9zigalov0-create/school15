/**
 * ═══════════════════════════════════════════════════════════════
 *  НАСТРОЙКА ЧАТА (один раз, ~10 минут)
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. Открой https://console.firebase.google.com → «Создать проект»
 * 2. В проекте: ⚙️ → «Your apps» → иконка </> (Web) → зарегистрируй приложение
 * 3. Скопируй firebaseConfig и вставь ниже вместо заглушек
 *
 * 4. Authentication → Get started → включи:
 *    - Email/Password (вкл. «Email/Password»)
 *    - Google → Enable, укажи email поддержки проекта
 *
 * 5. Firestore Database → Create database → Start in test mode (потом правила)
 *
 * 6. Firestore → Rules — вставь:
 *
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /rooms/school15_5a/messages/{msgId} {
 *          allow read, create: if request.auth != null
 *            && request.resource.data.text is string
 *            && request.resource.data.text.size() > 0
 *            && request.resource.data.text.size() <= 2000
 *            && request.resource.data.uid == request.auth.uid;
 *          allow update, delete: if false;
 *        }
 *      }
 *    }
 *
 * 7. Authentication → Settings → Authorized domains → добавь свой домен
 *    (для теста с компа: localhost уже есть)
 *
 * 8. Google Cloud Console (если Google-вход не работает):
 *    APIs & Services → OAuth consent screen → настроить
 *    Credentials → OAuth 2.0 — Firebase обычно создаёт сам
 */
const firebaseConfig = {
    apiKey: 'AIzaSyC_3sU2TTh3K0u-SX-tPFMCSC189_4T-yw',
    authDomain: 'school15-808fa.firebaseapp.com',
    projectId: 'school15-808fa',
    storageBucket: 'school15-808fa.firebasestorage.app',
    messagingSenderId: '1009889870107',
    appId: '1:1009889870107:web:2c48004d4c3f2bf6fd93be'
};

/** ID комнаты чата 5А — менять не обязательно */
const CHAT_ROOM_ID = 'school15_5a';

function isFirebaseConfigured() {
    const k = firebaseConfig.apiKey || '';
    return k.length > 10 && !k.includes('ВСТАВЬ') && !k.includes('YOUR_');
}
