const SCRIPT_URL = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbys1vEgsmxOqgQZ6iBzxEZYcUl0zgB9Rrg1/exec";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse a direct JSON ContentService response, or the JSON object embedded
 * in the previous HtmlService response (var result={...};). The latter keeps
 * compatibility with a deployed Apps Script version that has not been updated.
 */
function parseAppsScriptResult_(text) {
  try {
    const direct = JSON.parse(text);
    if (direct && typeof direct.ok === "boolean") return direct;
  } catch {}

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
    // Safe diagnostic endpoint: checks Google Apps Script reachability without
    // creating a request row or sending an email.
    try {
      const upstream = await fetch(SCRIPT_URL, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(10000)
      });
      const html = await upstream.text();
      const reachable = upstream.ok && /The endpoint is online|El Sisy request service/i.test(html);
      let finalHost = "unknown";
      try { finalHost = new URL(upstream.url).hostname; } catch {}

      return res.status(reachable ? 200 : 502).json({
        ok: reachable,
        api: "online",
        appsScript: reachable ? "reachable" : "not-confirmed",
        upstreamStatus: upstream.status,
        upstreamHost: finalHost,
        messageEn: reachable
          ? "Vercel API and Apps Script are reachable. This diagnostic does not submit a form."
          : "Vercel API is online, but Apps Script did not return its health message. Check the Web App deployment and access settings."
      });
    } catch (error) {
      console.error("Apps Script health check failed:", String(error));
      return res.status(502).json({
        ok: false,
        api: "online",
        appsScript: "unreachable",
        messageEn: "Vercel API is online but could not reach Apps Script."
      });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, messageAr: "الطريقة غير مسموحة.", messageEn: "Method not allowed." });
  }

  let data;
  try {
    data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, messageAr: "بيانات الطلب غير صحيحة.", messageEn: "Invalid request data." });
  }

  for (const key of ["requestId", "name", "phone", "address", "service"]) {
    if (!String(data[key] || "").trim()) {
      return res.status(400).json({ ok: false, messageAr: "أكمل البيانات المطلوبة.", messageEn: "Complete all required fields." });
    }
  }

  const params = new URLSearchParams({
    requestId: String(data.requestId),
    name: String(data.name),
    phone: String(data.phone),
    address: String(data.address),
    service: String(data.service),
    language: data.language === "en" ? "en" : "ar",
    website: ""
  });

  // Use the same request ID for every retry; Apps Script deduplicates it.
  let lastDiagnostic = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const upstream = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: params.toString(),
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(9000)
      });

      const responseText = await upstream.text();
      const result = parseAppsScriptResult_(responseText);

      if (upstream.ok && result) {
        return res.status(result.ok ? 200 : 400).json(result);
      }

      let safeFinalUrl = "unknown";
      try {
        const final = new URL(upstream.url);
        safeFinalUrl = final.hostname + final.pathname; // omit Google redirect tokens/query strings
      } catch {}

      lastDiagnostic =
        "Apps Script attempt " + attempt +
        ": HTTP " + upstream.status +
        ", content-type " + (upstream.headers.get("content-type") || "unknown") +
        ", final URL " + safeFinalUrl +
        ", embedded result marker " + (/\bvar\s+result\s*=/.test(responseText) ? "found but invalid" : "not found") +
        ", body prefix " + responseText.slice(0, 240).replace(/\s+/g, " ");
      console.error(lastDiagnostic);
    } catch (error) {
      lastDiagnostic = "Apps Script attempt " + attempt + " failed: " + String(error);
      console.error(lastDiagnostic);
      // Do not waste more time retrying a deployment that redirects to Google sign-in.
      if (/accounts\\.google\\.com/i.test(safeFinalUrl)) break;
    }

    if (attempt < 2) await wait(250 * attempt);
  }

  console.error("Apps Script response failed after retries. " + lastDiagnostic);
  const signInRedirect = /accounts\\.google\\.com/i.test(lastDiagnostic);
  return res.status(502).json({
    ok: false,
    retryable: true,
    requestId: String(data.requestId),
    messageAr: signInRedirect
      ? "رابط استقبال الطلبات يفتح صفحة تسجيل دخول Google بدل الخدمة. تأكد أن نشر Apps Script مضبوط على التنفيذ باسمك وإمكانية الوصول لأي شخص."
      : "لم نتمكن من تأكيد تسجيل الطلب مع Google. لم نظهر رسالة نجاح غير مؤكدة؛ راجع الشيت باستخدام رقم الطلب قبل إعادة الإرسال.",
    messageEn: signInRedirect
      ? "The request endpoint redirected to Google sign-in. Deploy the Apps Script web app to execute as you and allow access to anyone."
      : "We could not confirm that Google recorded the request. We will not show a false success message; check the spreadsheet using the request ID before retrying."
  });
};
