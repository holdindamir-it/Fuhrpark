const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require('firebase-admin');
admin.initializeApp();

// Инициализируем Twilio с твоими ключами
const twilioSid = 'AC3b3df903ee7dc3f0aac92b772a2c0bf9';
const twilioToken = '10776aa78f1f6664789b477b5b33ddb9';
const twilioClient = require('twilio')(twilioSid, twilioToken);

const FROM_NUMBER = '+18777804236';
const TO_NUMBER = '+1234567890'; // Твой личный проверенный номер телефона

// Запуск каждый день в 9:00 утра по Берлину (Новый синтаксис v2)
exports.dailyVehicleCheck = onSchedule({
  schedule: "0 9 * * *",
  timeZone: "Europe/Berlin"
}, async (event) => {
  const db = admin.firestore();
  const today = new Date();
  
  // Читаем из базы все тягачи и прицепы
  const lkwsSnapshot = await db.collection('lkws').get();
  const trailersSnapshot = await db.collection('trailers').get();

  // Вспомогательная функция для расчета разницы в месяцах
  const getMonthDiff = (dateStr) => {
    if (!dateStr) return null;
    const docDate = new Date(dateStr);
    const diffTime = docDate - today;
    return diffTime / (1000 * 60 * 60 * 24 * 30.44); // переводим миллисекунды в месяцы
  };

  // --- ПРОВЕРКА ТЯГАЧЕЙ (LKW) ---
  for (const doc of lkwsSnapshot.docs) {
    const lkw = doc.data();
    let updated = false;

    // Проверяем TÜV и SP
    const docsToCheck = [
      { type: 'TÜV', data: lkw.lkwTuev, key: 'lkwTuev' },
      { type: 'SP', data: lkw.lkwSp, key: 'lkwSp' }
    ];

    for (const docObj of docsToCheck) {
      if (!docObj.data || !docObj.data.date) continue;
      
      const monthsLeft = getMonthDiff(docObj.data.date);
      let smsText = '';

      if (monthsLeft <= 0 && !docObj.data.smsSentExpired) {
        smsText = `Тягач ${lkw.lkwPlate}: Документ ${docObj.type} ПРОСРОЧЕН! Актуальное состояние: Просрочен (Дата: ${docObj.data.date}).`;
        docObj.data.smsSentExpired = true;
        updated = true;
      } else if (monthsLeft > 0 && monthsLeft <= 1 && !docObj.data.smsSent1Month) {
        smsText = `Тягач ${lkw.lkwPlate}: Документ ${docObj.type} истекает менее чем через 1 месяц! Актуальное состояние: Скоро закончится (Дата: ${docObj.data.date}).`;
        docObj.data.smsSent1Month = true;
        updated = true;
      } else if (monthsLeft > 1 && monthsLeft <= 6 && !docObj.data.smsSent6Months) {
        smsText = `Тягач ${lkw.lkwPlate}: Документ ${docObj.type} истекает через 6 месяцев! Актуальное состояние: Внимательно (Дата: ${docObj.data.date}).`;
        docObj.data.smsSent6Months = true;
        updated = true;
      }

      if (smsText) {
        await twilioClient.messages.create({ body: `[Fuhrpark] ${smsText}`, from: FROM_NUMBER, to: TO_NUMBER });
      }
    }

    if (updated) {
      await db.collection('lkws').doc(doc.id).update({ lkwTuev: lkw.lkwTuev, lkwSp: lkw.lkwSp });
    }
  }

  // --- ПРОВЕРКА ПРИЦЕПОВ (Trailer) ---
  for (const doc of trailersSnapshot.docs) {
    const tr = doc.data();
    if (!tr.trailerTuev || !tr.trailerTuev.date) continue;

    const monthsLeft = getMonthDiff(tr.trailerTuev.date);
    let smsText = '';
    let updated = false;

    if (monthsLeft <= 0 && !tr.trailerTuev.smsSentExpired) {
      smsText = `Прицеп ${tr.trailerPlate}: Документ TÜV ПРОСРОЧЕН! Актуальное состояние: Просрочен (Дата: ${tr.trailerTuev.date}).`;
      tr.trailerTuev.smsSentExpired = true;
      updated = true;
    } else if (monthsLeft > 0 && monthsLeft <= 1 && !tr.trailerTuev.smsSent1Month) {
      smsText = `Прицеп ${tr.trailerPlate}: Документ TÜV истекает менее чем через 1 месяц! Актуальное состояние: Скоро закончится (Дата: ${tr.trailerTuev.date}).`;
      tr.trailerTuev.smsSent1Month = true;
      updated = true;
    } else if (monthsLeft > 1 && monthsLeft <= 6 && !tr.trailerTuev.smsSent6Months) {
      smsText = `Прицеп ${tr.trailerPlate}: Документ TÜV истекает через 6 месяцев! Актуальное состояние: Внимательно (Дата: ${tr.trailerTuev.date}).`;
      tr.trailerTuev.smsSent6Months = true;
      updated = true;
    }

    if (smsText) {
      await twilioClient.messages.create({ body: `[Fuhrpark] ${smsText}`, from: FROM_NUMBER, to: TO_NUMBER });
    }

    if (updated) {
      await db.collection('trailers').doc(doc.id).update({ trailerTuev: tr.trailerTuev });
    }
  }
});