// ユーザー登録画面。全項目必須、email/パスワードの形式・一致をクライアントでも検証。
import { authApi, type RegisterInput } from "../api/auth.ts";
import { session } from "../store/session.ts";
import { navigate } from "../router.ts";
import { Button } from "../components/Button.tsx";
import { ApiError } from "../api/client.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

type Field = {
  wrapper: Node;
  input: HTMLInputElement;
  error: HTMLElement;
};

function field(id: string, label: string, type: string, autocomplete?: string): Field {
  const input = (
    <input
      id={id}
      type={type}
      autocomplete={autocomplete ?? "off"}
      class="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
    />
  ) as HTMLInputElement;
  const error = <p class="mt-1 text-xs text-rose-700"></p> as HTMLElement;
  const wrapper = (
    <div>
      <label htmlFor={id} class="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      {input}
      {error}
    </div>
  );
  return { wrapper, input, error };
}

export function RegisterPage(): Node {
  const email = field("reg-email", "メールアドレス", "email", "email");
  const password = field("reg-password", "パスワード", "password", "new-password");
  const passwordConfirm = field("reg-password-confirm", "パスワード（確認）", "password", "new-password");
  const fullName = field("reg-full-name", "氏名", "text", "name");
  const address = field("reg-address", "住所", "text", "street-address");
  const fields = { email, password, passwordConfirm, fullName, address };

  const formError = <p class="text-sm text-rose-700"></p> as HTMLElement;
  const submitBtn = Button({ type: "submit", children: "登録する" }) as HTMLButtonElement;

  function clearErrors(): void {
    formError.textContent = "";
    for (const f of Object.values(fields)) f.error.textContent = "";
  }

  function validate(): RegisterInput | null {
    clearErrors();
    let ok = true;
    const values: RegisterInput = {
      email: email.input.value.trim(),
      password: password.input.value,
      passwordConfirm: passwordConfirm.input.value,
      fullName: fullName.input.value.trim(),
      address: address.input.value.trim(),
    };

    if (values.email === "") (email.error.textContent = "メールアドレスは必須です"), (ok = false);
    else if (!EMAIL_RE.test(values.email))
      (email.error.textContent = "メールアドレスの形式が正しくありません"), (ok = false);

    if (values.password === "") (password.error.textContent = "パスワードは必須です"), (ok = false);
    else if (values.password.length < PASSWORD_MIN)
      (password.error.textContent = `パスワードは${PASSWORD_MIN}文字以上で入力してください`), (ok = false);

    if (values.passwordConfirm === "")
      (passwordConfirm.error.textContent = "パスワード確認は必須です"), (ok = false);
    else if (values.password !== values.passwordConfirm)
      (passwordConfirm.error.textContent = "パスワードが一致しません"), (ok = false);

    if (values.fullName === "") (fullName.error.textContent = "氏名は必須です"), (ok = false);
    if (values.address === "") (address.error.textContent = "住所は必須です"), (ok = false);

    return ok ? values : null;
  }

  async function onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const values = validate();
    if (!values) return;

    submitBtn.disabled = true;
    try {
      const { user } = await authApi.register(values);
      session.setUser(user);
      await session.refreshCart();
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [key, msg] of Object.entries(err.fields)) {
          const f = (fields as Record<string, Field>)[key];
          if (f) f.error.textContent = msg;
          else formError.textContent = msg;
        }
      } else {
        formError.textContent = err instanceof ApiError ? err.message : "登録に失敗しました";
      }
      submitBtn.disabled = false;
    }
  }

  return (
    <section class="mx-auto max-w-sm px-4 py-12">
      <h1 class="mb-6 text-2xl font-semibold text-stone-800">新規登録</h1>
      <form class="space-y-4" onSubmit={(e: Event) => void onSubmit(e)}>
        {email.wrapper}
        {password.wrapper}
        {passwordConfirm.wrapper}
        {fullName.wrapper}
        {address.wrapper}
        {formError}
        <div class="pt-2">{submitBtn}</div>
      </form>
      <p class="mt-6 text-sm text-stone-500">
        すでにアカウントをお持ちの方は
        <a href="/login" class="mx-1 font-medium text-rose-800 hover:underline">ログイン</a>
      </p>
    </section>
  );
}
