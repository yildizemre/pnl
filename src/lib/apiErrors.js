/** Panel kullanıcılarına teknik HTTP kodları yerine anlaşılır mesajlar. */
export function humanizeApiError(status, detail) {
  const raw =
    typeof detail === "string"
      ? detail.trim()
      : Array.isArray(detail)
        ? detail.map((d) => d.msg || d.message || "").filter(Boolean).join(", ")
        : "";

  if (status === 401) {
    return raw.includes("API") || raw.includes("anahtar")
      ? "Bağlantı anahtarı geçersiz. Yöneticinizden yeni API anahtarı isteyin."
      : "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.";
  }
  if (status === 403) return "Bu işlem için yetkiniz bulunmuyor.";
  if (status === 404) return "İstenen bilgi bulunamadı. Lütfen daha sonra tekrar deneyin.";
  if (status === 422) return "Gönderilen bilgiler eksik veya hatalı. Lütfen kontrol edin.";
  if (status === 429) return "Çok fazla istek gönderildi. Lütfen kısa bir süre bekleyin.";
  if (status >= 500) return "Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";

  if (raw && !/^(not found|api hatası|internal server error)$/i.test(raw)) {
    return raw;
  }
  return "Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.";
}

export function humanizeNetworkError(err) {
  if (err?.name === "AbortError") {
    return "Sunucu yanıt vermiyor. Lütfen birkaç dakika sonra tekrar deneyin.";
  }
  return "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.";
}
