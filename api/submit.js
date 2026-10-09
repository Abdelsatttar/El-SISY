const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwg6ad-R5W3eqY0fi4nLHlDSlD_5gQNjwVE_cCuGyAywIN5x42rpHqkbiK9p_GeUni7/exec";

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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
  for (let attempt = 1; attempt <= 3; attempt++) {
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
    }

    if (attempt < 3) await wait(350 * attempt);
  }

  console.error("Apps Script response failed after retries. " + lastDiagnostic);
  return res.status(502).json({
    ok: false,
    retryable: true,
    requestId: String(data.requestId),
    messageAr: "تعذر الحصول على تأكيد صالح من Google بعد محاولات قصيرة. لم أستطع تأكيد الحفظ. راجع الشيت قبل إرسال طلب جديد.",
    messageEn: "Google did not return a valid confirmation after short retries. Saving could not be confirmed; check the spreadsheet before sending a new request."
  });
};
