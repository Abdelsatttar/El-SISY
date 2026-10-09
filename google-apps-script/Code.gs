/**
 * El Sisy — email-only project enquiry endpoint.
 * No Google Sheets or database is used by this script.
 *
 * Deploy as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * Run authorizeEmailService() once in the Apps Script editor and approve
 * permissions. It sends one clearly-labelled test email to the company inbox.
 */

const CONFIG = {
  recipientEmail: "elsisycontracting@gmail.com"
};

function authorizeEmailService() {
  MailApp.sendEmail({
    to: CONFIG.recipientEmail,
    subject: "El Sisy website — email setup test",
    body: "This is a setup test confirming that the El Sisy website email service can send messages.",
    name: "El Sisy Website"
  });
  Logger.log("A test email was sent to " + CONFIG.recipientEmail);
}

function doGet() {
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>El Sisy email service</title></head>' +
    '<body style="font:16px Arial,sans-serif;padding:30px;color:#082743">' +
    '<h2>El Sisy email service is online</h2>' +
    '<p>This endpoint sends project enquiries to the company email. It does not use Google Sheets.</p>' +
    '</body></html>'
  ).setTitle("El Sisy email service");
}

function doPost(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const requestId = cleanSingleLine_(params.requestId, 100);
  const language = params.language === "en" ? "en" : "ar";
  const name = cleanSingleLine_(params.name, 120);
  const phone = cleanSingleLine_(params.phone, 50);
  const email = cleanSingleLine_(params.email, 254).toLowerCase();
  const address = cleanSingleLine_(params.address, 300);
  const service = cleanSingleLine_(params.service, 180);
  const projectDetails = cleanMultiLine_(params.projectDetails, 5000);
  const honeypot = cleanSingleLine_(params.website, 200);

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
    return jsonResponse_({
      ok: false,
      emailSent: false,
      requestId: requestId,
      messageAr: "تعذر التحقق من الطلب. حدّث الصفحة وحاول مرة أخرى.",
      messageEn: "We could not validate the request. Refresh the page and try again."
    });
  }

  if (honeypot) {
    return jsonResponse_({
      ok: false,
      emailSent: false,
      requestId: requestId,
      messageAr: "تعذر إرسال الطلب. حاول مرة أخرى.",
      messageEn: "The request could not be sent. Please try again."
    });
  }

  if (!name || !phone || !email || !address || !service || !projectDetails) {
    return jsonResponse_({
      ok: false,
      emailSent: false,
      requestId: requestId,
      messageAr: "من فضلك أكمل كل البيانات المطلوبة.",
      messageEn: "Please complete all required fields."
    });
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse_({
      ok: false,
      emailSent: false,
      requestId: requestId,
      messageAr: "البريد الإلكتروني غير صحيح.",
      messageEn: "The email address is invalid."
    });
  }

  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    // Avoid sending the same request twice when the API retries after a timeout.
    lock.waitLock(12000);
    lockAcquired = true;

    const cacheKey = "elsisy_mail_" + requestId;
    if (cache.get(cacheKey) === "SENT") {
      return jsonResponse_({
        ok: true,
        emailSent: true,
        alreadySent: true,
        requestId: requestId,
        messageAr: "تم إرسال طلبك بالفعل إلى بريد الشركة.",
        messageEn: "Your request has already been emailed to the company."
      });
    }

    const subject = "طلب مشروع جديد من موقع El Sisy - " + service;
    const receivedAt = new Date().toLocaleString();
    const body = [
      "طلب مشروع جديد من موقع El Sisy",
      "",
      "اسم العميل: " + name,
      "بريد العميل: " + email,
      "رقم الهاتف: " + phone,
      "العنوان: " + address,
      "الخدمة المطلوبة: " + service,
      "",
      "تفاصيل المشروع:",
      projectDetails,
      "",
      "لغة النموذج: " + (language === "ar" ? "العربية" : "English"),
      "وقت الاستلام: " + receivedAt,
      "رقم الطلب: " + requestId
    ].join("\n");

    const htmlBody =
      '<div style="font-family:Arial,sans-serif;color:#10253a;line-height:1.85;max-width:700px;margin:auto">' +
      '<div style="padding:20px 24px;background:#082743;color:#fff;border-radius:14px 14px 0 0">' +
      '<div style="font-size:12px;letter-spacing:2px;opacity:.8">EL SISY</div>' +
      '<h2 style="margin:8px 0 0;font-size:22px">طلب مشروع جديد</h2></div>' +
      '<div style="padding:22px 24px;border:1px solid #dfe8ee;border-top:0;border-radius:0 0 14px 14px">' +
      '<p style="color:#5e7383;margin-top:0">وصلك استفسار جديد من نموذج الموقع.</p>' +
      '<table style="border-collapse:collapse;width:100%">' +
      emailRow_("اسم العميل", name) +
      emailRow_("بريد العميل", '<a href="mailto:' + escapeHtml_(email) + '">' + escapeHtml_(email) + '</a>', true) +
      emailRow_("رقم الهاتف", escapeHtml_(phone)) +
      emailRow_("العنوان", address) +
      emailRow_("الخدمة المطلوبة", service) +
      emailRow_("تفاصيل المشروع", projectDetails, true) +
      emailRow_("لغة النموذج", language === "ar" ? "العربية" : "English") +
      emailRow_("وقت الاستلام", receivedAt) +
      emailRow_("رقم الطلب", requestId) +
      '</table><p style="font-size:12px;color:#748593;margin-bottom:0">يمكنك الرد مباشرة على هذه الرسالة للتواصل مع العميل.</p></div></div>';

    MailApp.sendEmail({
      to: CONFIG.recipientEmail,
      subject: subject,
      body: body,
      htmlBody: htmlBody,
      replyTo: email,
      name: "El Sisy Website"
    });

    // Cache is temporary anti-duplicate protection, not a project-request database.
    try {
      cache.put(cacheKey, "SENT", 21600);
    } catch (cacheError) {
      console.warn("The email was sent but the temporary deduplication cache failed.");
    }

    return jsonResponse_({
      ok: true,
      emailSent: true,
      requestId: requestId,
      messageAr: "تم إرسال طلبك إلى بريد الشركة بنجاح. هنتواصل معاك قريبًا.",
      messageEn: "Your request has been emailed to the company successfully. We will contact you soon."
    });
  } catch (error) {
    console.error("El Sisy email delivery failed: " + String(error));
    return jsonResponse_({
      ok: false,
      emailSent: false,
      requestId: requestId,
      messageAr: "تعذر إرسال الطلب إلى البريد الإلكتروني حاليًا. حاول مرة أخرى أو تواصل معنا مباشرة.",
      messageEn: "The email could not be sent right now. Please try again or contact us directly."
    });
  } finally {
    if (lockAcquired) {
      try { lock.releaseLock(); } catch (ignored) {}
    }
  }
}

function cleanSingleLine_(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanMultiLine_(value, maxLength) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function emailRow_(label, value, isHtml) {
  const displayValue = isHtml ? String(value) : escapeHtml_(String(value || "")).replace(/\n/g, "<br>");
  return '<tr><th style="text-align:left;vertical-align:top;padding:10px;border:1px solid #dfe8ee;background:#f3f7fa;width:165px">' +
    escapeHtml_(label) + '</th><td style="padding:10px;border:1px solid #dfe8ee;overflow-wrap:anywhere">' +
    displayValue + '</td></tr>';
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
