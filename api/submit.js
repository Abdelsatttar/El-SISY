const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwg6ad-R5W3eqY0fi4nLHlDSlD_5gQNjwVE_cCuGyAywIN5x42rpHqkbiK9p_GeUni7/exec";

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, messageEn: "Method not allowed." });
  }
  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    for (const key of ["requestId", "name", "phone", "address", "service"]) {
      if (!String(data[key] || "").trim()) {
        return res.status(400).json({ ok: false, messageAr: "أكمل البيانات المطلوبة.", messageEn: "Complete all required fields." });
      }
    }
    const upstream = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        requestId: String(data.requestId),
        name: String(data.name),
        phone: String(data.phone),
        address: String(data.address),
        service: String(data.service),
        language: data.language === "en" ? "en" : "ar",
        website: ""
      })
    });
    const text = await upstream.text();
    let result;
    try { result = JSON.parse(text); } catch {
      console.error("Unexpected Apps Script response:", text.slice(0, 300));
      return res.status(502).json({ ok: false, messageAr: "استجابة Google Apps Script غير صحيحة. راجع نشر السكربت.", messageEn: "Unexpected Google Apps Script response. Check its deployment." });
    }
    if (typeof result.ok !== "boolean") {
      return res.status(502).json({ ok: false, messageAr: "تعذر تأكيد تسجيل الطلب.", messageEn: "Could not verify request status." });
    }
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    console.error("Form API error:", error);
    return res.status(502).json({ ok: false, messageAr: "تعذر الاتصال بخدمة الطلبات.", messageEn: "Could not connect to the request service." });
  }
};
