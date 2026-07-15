// 入力バリデーションの共通ユーティリティ。
import { HttpError } from "./http.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

/** unknown を安全に Record として扱う。 */
export function asRecord(body: unknown): Record<string, unknown> {
  return body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

/** 文字列として取り出す（非文字列は空文字）。 */
export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** 整数として取り出す。整数でなければ null。 */
export function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return Number.parseInt(v.trim(), 10);
  return null;
}

export function isEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

/** フィールド単位のエラーを集約し、まとめて 400 で throw する。 */
export class FieldErrors {
  #fields: Record<string, string> = {};

  add(field: string, message: string): this {
    if (!(field in this.#fields)) this.#fields[field] = message;
    return this;
  }

  get hasErrors(): boolean {
    return Object.keys(this.#fields).length > 0;
  }

  throwIfAny(): void {
    if (this.hasErrors) {
      throw new HttpError(400, "VALIDATION_ERROR", "入力内容を確認してください", this.#fields);
    }
  }
}
