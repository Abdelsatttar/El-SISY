const SCRIPT_URL = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzHf3RjCg5y8AF-pSdik75brlQoIVLSA0QKAj6WjEI9PDdNEhQFKM-weMHOGQyggd9w/exec";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseAppsScriptResult_(text) {
  try {
    const direct = JSON.parse(text);
    if (direct && typeof direct.ok === "boolean") return direct;
  } catch {}

  // Backward compatibility for an old deployed HtmlService response.
  const assignment = /\bvar\s+result\s*=\s*/.exec(text);
  if (!assignment) return null;

  let start = assignment.index + assignment[0].length;
  while (/\s/.test(text[start] || "")) start++;
  if (text[start] !== "{") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const result = JSON.parse(text.slice(start, i + 1));
          if (result && typeof result.ok === "boolean") return result;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    // Health check only: this never submits a message.
    try {
      const upstream = await fetch(SCRIPT_URL, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });
      const body = await upstream.text();
      const reachable = upstream.ok && /El Sisy email service|El Sisy request service/i.test(body);
      let upstreamHost = "unknown";
      try { upstreamHost = new URL(upstream.url).hostname; } catch {}

      return res.status(reachable ? 200 : 502).json({
        ok: reachable,
        api: "online",
        emailService: reachable ? "reachable" : "not-confirmed",
        upstreamStatus: upstream.status,
        upstreamHost,
        messageEn: reachable
          ? "The website API and email service are reachable. No email was sent by this health check."
          : "The API is online, but the email service did not return its health message. Check the Apps Script deployment."
      });
    } catch (error) {
      console.error("Email service health check failed:", String(error));
      return res.status(502).json({
        ok: false,
        api: "online",
        emailService: "unreachable",
        messageEn: "The API is online but could not reach the email service."
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      ok: false,
      messageAr: "الطريقة غير مسموحة.",
      messageEn: "Method not allowed."
    });
  }

  let data;
  try {
    data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({
      ok: false,
      messageAr: "بيانات الطلب غير صحيحة.",
      messageEn: "Invalid request data."
    });
  }

  const required = ["requestId", "name", "phone", "email", "address", "service", "projectDetails"];
  for (const key of required) {
    if (!String(data[key] || "").trim()) {
      return res.status(400).json({
        ok: false,
        requestId: String(data.requestId || ""),
        messageAr: "أكمل كل البيانات المطلوبة قبل الإرسال.",
        messageEn: "Please complete all required fields before sending."
      });
    }
  }

  const email = String(data.email).trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      ok: false,
      requestId: String(data.requestId),
      messageAr: "البريد الإلكتروني غير صحيح.",
      messageEn: "The email address is invalid."
    });
  }

  if (String(data.projectDetails).length > 5000) {
    return res.status(400).json({
      ok: false,
      requestId: String(data.requestId),
      messageAr: "تفاصيل المشروع أطول من الحد المسموح. اختصرها وحاول مرة أخرى.",
      messageEn: "Project details exceed the allowed length. Please shorten them and try again."
    });
  }

  const params = new URLSearchParams({
    requestId: String(data.requestId).slice(0, 100),
    name: String(data.name).slice(0, 120),
    phone: String(data.phone).slice(0, 50),
    email,
    address: String(data.address).slice(0, 300),
    service: String(data.service).slice(0, 180),
    projectDetails: String(data.projectDetails).slice(0, 5000),
    language: data.language === "en" ? "en" : "ar",
    website: String(data.website || "").slice(0, 200)
  });

  // The Apps Script uses a temporary cache to avoid sending the same request ID twice.
  let lastDiagnostic = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    let attemptFinalUrl = "unknown";
    try {
      const upstream = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: params.toString(),
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(12000)
      });

      const responseText = await upstream.text();
      try {
        const finalUrl = new URL(upstream.url);
        attemptFinalUrl = finalUrl.hostname + finalUrl.pathname;
      } catch {}

      const result = parseAppsScriptResult_(responseText);

      if (upstream.ok && result && result.ok === true && result.emailSent === true) {
        return res.status(200).json({
          ok: true,
          emailSent: true,
          requestId: String(result.requestId || data.requestId),
          messageAr: result.messageAr || "تم إرسال طلبك إلى بريد الشركة بنجاح.",
          messageEn: result.messageEn || "Your request was emailed to the company successfully."
        });
      }

      if (upstream.ok && result && result.ok === false) {
        return res.status(502).json({
          ok: false,
          emailSent: false,
          requestId: String(result.requestId || data.requestId),
          messageAr: result.messageAr || "تعذر إرسال البريد الإلكتروني. حاول مرة أخرى.",
          messageEn: result.messageEn || "The email could not be sent. Please try again."
        });
      }

      lastDiagnostic =
        "Apps Script attempt " + attempt +
        ": HTTP " + upstream.status +
        ", content-type " + (upstream.headers.get("content-type") || "unknown") +
        ", final URL " + attemptFinalUrl +
        ", response payload " + (result ? "present but unsuccessful" : "not recognized");
      console.error(lastDiagnostic);
    } catch (error) {
      lastDiagnostic = "Apps Script attempt " + attempt + " failed at " + attemptFinalUrl + ": " + String(error);
      console.error(lastDiagnostic);
      if (/accounts\.google\.com/i.test(attemptFinalUrl)) break;
    }

    if (attempt < 2) await wait(250 * attempt);
  }

  console.error("Email service response failed after retries. " + lastDiagnostic);
  const signInRedirect = /accounts\.google\.com/i.test(lastDiagnostic);
  return res.status(502).json({
    ok: false,
    emailSent: false,
    retryable: true,
    requestId: String(data.requestId),
    messageAr: signInRedirect
      ? "خدمة البريد تحوّلك إلى صفحة تسجيل دخول Google. راجع إعداد نشر Apps Script."
      : "لم نتمكن من تأكيد إرسال طلبك إلى البريد الإلكتروني. حاول بعد قليل أو تواصل معنا مباشرة.",
    messageEn: signInRedirect
      ? "The email service redirected to Google sign-in. Check the Apps Script web app deployment settings."
      : "We could not confirm that your request was emailed. Please try again shortly or contact us directly."
  });
};
