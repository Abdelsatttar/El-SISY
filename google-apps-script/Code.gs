/**
 * El Sisy website request handler.
 *
 * Setup:
 * 1. Run setupElSisy() once from the Apps Script editor and authorize it.
 * 2. Deploy as a Web App, executing as you, accessible to Anyone.
 * 3. If this is a new Apps Script deployment, update APPS_SCRIPT_URL in app.js.
 */

const CONFIG = {
  recipientEmail: "ahmedkartamo@gmail.com",
  spreadsheetProperty: "EL_SISY_REQUESTS_SPREADSHEET_ID",
  spreadsheetId: "1m8Bl21ob2XnxknEyMcgOxkwN10kqn3Odo_2RFz2xZX8",
  sheetName: "طلبات العملاء"
};

function setupElSisy() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = CONFIG.spreadsheetId;
  properties.setProperty(CONFIG.spreadsheetProperty, spreadsheetId);
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    const firstSheet = spreadsheet.getSheets()[0];
    if (firstSheet && firstSheet.getLastRow() === 0) {
      firstSheet.setName(CONFIG.sheetName);
      sheet = firstSheet;
    } else {
      sheet = spreadsheet.insertSheet(CONFIG.sheetName);
    }
  }

  const headers = [
    "وقت الاستلام",
    "Request ID",
    "اسم العميل",
    "رقم الهاتف",
    "العنوان",
    "الخدمة المطلوبة",
    "لغة النموذج",
    "حالة إشعار البريد"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (currentHeaders.every(function (value) { return !value; })) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#082743")
    .setFontColor("#ffffff");
  sheet.autoResizeColumns(1, headers.length);
  sheet.setColumnWidth(5, 240);
  sheet.setColumnWidth(6, 240);
  sheet.setColumnWidth(8, 200);

  Logger.log("Using the configured El Sisy spreadsheet: " + spreadsheet.getUrl());
  Logger.log("Notification recipient: " + CONFIG.recipientEmail);
  return spreadsheet.getUrl();
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="font:16px Arial,sans-serif;padding:32px;color:#082743">' +
    '<h2>El Sisy request service</h2><p>The endpoint is online. Submit requests through the website form.</p></body></html>'
  );
}

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const requestId = String(params.requestId || "").trim();
  const language = params.language === "en" ? "en" : "ar";
  const name = cleanText_(params.name, 120);
  const phone = cleanText_(params.phone, 50);
  const address = cleanText_(params.address, 300);
  const service = cleanText_(params.service, 180);
  const honeypot = cleanText_(params.website, 200);

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    return renderResponse_({
      requestId: requestId,
      ok: false,
      emailSent: false,
      language: language,
      messageAr: "تعذر التحقق من الطلب. حدّث الصفحة وحاول مرة أخرى.",
      messageEn: "We could not validate the request. Refresh the page and try again."
    });
  }

  if (honeypot) {
    return renderResponse_({
      requestId: requestId,
      ok: false,
      emailSent: false,
      language: language,
      messageAr: "تعذر إرسال الطلب. حاول مرة أخرى.",
      messageEn: "The request could not be sent. Please try again."
    });
  }

  if (!name || !phone || !address || !service) {
    return renderResponse_({
      requestId: requestId,
      ok: false,
      emailSent: false,
      language: language,
      messageAr: "من فضلك أكمل البيانات المطلوبة.",
      messageEn: "Please complete all required fields."
    });
  }

  let sheet;
  let rowNumber;
  let spreadsheet;
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    spreadsheet = getRequestsSpreadsheet_();
    sheet = getRequestsSheet_(spreadsheet);

    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const ids = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
      const existingIndex = ids.indexOf(requestId);
      if (existingIndex !== -1) {
        const existingRow = existingIndex + 2;
        const previousEmailStatus = sheet.getRange(existingRow, 8).getDisplayValue();
        const previousEmailSent = previousEmailStatus === "تم إرسال الإشعار";
        return renderResponse_({
          requestId: requestId,
          ok: true,
          emailSent: previousEmailSent,
          language: language,
          messageAr: previousEmailSent
            ? "تم تسجيل هذا الطلب بالفعل وتم إرسال إشعار الشركة."
            : "تم تسجيل هذا الطلب بالفعل، لكن حالة إشعار البريد لم تؤكد الإرسال.",
          messageEn: previousEmailSent
            ? "This request has already been recorded and the company was notified."
            : "This request has already been recorded, but email notification is not confirmed."
        });
      }
    }

    sheet.appendRow([
      new Date(),
      safeSheetText_(requestId),
      safeSheetText_(name),
      safeSheetText_(phone),
      safeSheetText_(address),
      safeSheetText_(service),
      language,
      "جاري إرسال الإشعار"
    ]);
    rowNumber = sheet.getLastRow();
  } catch (error) {
    console.error("Unable to save El Sisy request: " + error);
    return renderResponse_({
      requestId: requestId,
      ok: false,
      emailSent: false,
      language: language,
      messageAr: "لم نتمكن من حفظ طلبك. حاول مرة أخرى أو تواصل معنا مباشرة.",
      messageEn: "We could not save your request. Please try again or contact us directly."
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }

  let emailSent = false;
  let emailError = "";

  try {
    const subject = "طلب جديد من موقع El Sisy: " + service;
    const body = [
      "وصل طلب جديد من موقع El Sisy.",
      "",
      "اسم العميل: " + name,
      "رقم الهاتف: " + phone,
      "العنوان: " + address,
      "الخدمة المطلوبة: " + service,
      "لغة النموذج: " + (language === "ar" ? "العربية" : "English"),
      "وقت الاستلام: " + new Date().toLocaleString(),
      "",
      "رقم الطلب: " + requestId
    ].join("\n");

    const htmlBody =
      '<div style="font-family:Arial,sans-serif;color:#10253a;line-height:1.8;max-width:640px">' +
      '<h2 style="color:#082743">طلب جديد من موقع El Sisy</h2>' +
      '<table style="border-collapse:collapse;width:100%">' +
      emailRow_("اسم العميل", name) +
      emailRow_("رقم الهاتف", phone) +
      emailRow_("العنوان", address) +
      emailRow_("الخدمة المطلوبة", service) +
      emailRow_("لغة النموذج", language === "ar" ? "العربية" : "English") +
      emailRow_("وقت الاستلام", new Date().toLocaleString()) +
      emailRow_("رقم الطلب", requestId) +
      '</table><p style="color:#6f8090">تم حفظ هذا الطلب في جدول طلبات El Sisy.</p></div>';

    MailApp.sendEmail({
      to: CONFIG.recipientEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      name: "El Sisy Website"
    });
    emailSent = true;
  } catch (error) {
    emailError = String(error);
    console.error("Request saved, but email notification failed: " + emailError);
  }

  try {
    sheet.getRange(rowNumber, 8).setValue(emailSent ? "تم إرسال الإشعار" : "تم الحفظ - فشل الإشعار");
  } catch (ignored) {}

  if (emailSent) {
    return renderResponse_({
      requestId: requestId,
      ok: true,
      emailSent: true,
      language: language,
      messageAr: "تم حفظ طلبك وإرسال إشعار للشركة. سنتواصل معك قريبًا.",
      messageEn: "Your request was saved and the company was notified. We will contact you soon."
    });
  }

  return renderResponse_({
    requestId: requestId,
    ok: true,
    emailSent: false,
    language: language,
    messageAr: "تم حفظ طلبك، لكن تعذر إرسال تنبيه البريد الإلكتروني. سنراجع الطلب.",
    messageEn: "Your request was saved, but the email notification could not be sent. The request is recorded."
  });
}

function getRequestsSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(CONFIG.spreadsheetProperty);
  if (!id) {
    throw new Error("Run setupElSisy() once before accepting requests.");
  }
  return SpreadsheetApp.openById(id);
}

function getRequestsSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    throw new Error("Requests sheet not found. Run setupElSisy() again.");
  }
  return sheet;
}

function cleanText_(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeSheetText_(value) {
  const text = String(value || "");
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function emailRow_(label, value) {
  return '<tr><th style="text-align:left;vertical-align:top;padding:9px;border:1px solid #dfe8ee;background:#f3f7fa;width:170px">' +
    escapeHtml_(label) + '</th><td style="padding:9px;border:1px solid #dfe8ee">' +
    escapeHtml_(value) + '</td></tr>';
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderResponse_(payload) {
  const serialized = JSON.stringify(payload).replace(/</g, "\\u003c");
  const fallbackMessage = payload.messageAr || payload.messageEn || "Request processed.";
  const html =
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>El Sisy request status</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:18px;color:#082743}p{line-height:1.7}</style></head>' +
    '<body><p>' + escapeHtml_(fallbackMessage) + '</p>' +
    '<script>' +
    'var result=' + serialized + ';' +
    'try{window.parent.postMessage({type:"EL_SISY_FORM_RESULT",requestId:result.requestId,ok:result.ok,emailSent:result.emailSent,messageAr:result.messageAr,messageEn:result.messageEn},"*");}catch(e){}' +
    '</script></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("El Sisy request status")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
