// 表示用フォーマットのユーティリティ。

export function formatPrice(price: number, currency = "JPY"): string {
  if (currency === "JPY") {
    return `¥${price.toLocaleString("ja-JP")}`;
  }
  return `${price.toLocaleString()} ${currency}`;
}
