export default function ConfirmeSeuEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl p-8 text-center">
        <div className="text-3xl mb-3">📬</div>
        <h1 className="font-display text-xl text-ink mb-2">Confirma seu e-mail</h1>
        <p className="text-sm text-ink-muted">
          Mandamos um link de confirmação pro seu e-mail. Clica nele pra ativar sua conta e entrar.
        </p>
      </div>
    </main>
  );
}
