const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwg6ad-R5W3eqY0fi4nLHlDSlD_5gQNjwVE_cCuGyAywIN5x42rpHqkbiK9p_GeUni7/exec";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Google Apps Script may save a request and then return an HTML error from its
  // redirected ContentService URL. Retry with the SAME requestId: the Apps Script
  // handler deduplicates IDs, so this won't append another row or send another email.
  let lastError = "";
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
      let result = null;
      try { result = JSON.parse(responseText); } catch {}

      if (upstream.ok && result && typeof result.ok === "boolean") {
        return res.status(result.ok ? 200 : 400).json(result);
      }

      lastError = "Apps Script attempt " + attempt + " returned HTTP " + upstream.status +
        " with non-JSON content: " + responseText.slice(0, 180).replace(/\s+/g, " ");
      console.error(lastError);
    } catch (error) {
      lastError = "Apps Script attempt " + attempt + " failed: " + String(error);
      console.error(lastError);
    }

    if (attempt < 3) await wait(350 * attempt);
  }

  console.error("Apps Script response failed after retries. " + lastError);
  return res.status(502).json({
    ok: false,
    retryable: true,
    requestId: String(data.requestId),
    messageAr: "Google لم يرجع تأكيدًا صالحًا بعد محاولات قصيرة. قد يكون الطلب اتسجل بالفعل؛ راجع الشيت قبل استخدام بيانات مختلفة. إعادة المحاولة بنفس البيانات تستخدم نفس رقم الطلب لتجنب التكرار.",
    messageEn: "Google did not return a valid confirmation after short retries. The request may already be recorded; retry the same details to reuse the request ID and avoid duplicates."
  });
};
