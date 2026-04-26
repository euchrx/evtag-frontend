import { useState } from 'react';
import { ShieldCheck, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Não foi possível entrar. Verifique suas credenciais.';

      setErrorMessage(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-evtag-bg font-sans">
      <section className="hidden flex-1 bg-evtag-primary p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-evtag-primary">
              <Tag size={22} />
            </div>

            <div>
              <p className="font-display text-xl font-black">EvTag</p>
              <p className="text-xs font-medium text-white/60">
                Etiquetagem inteligente
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/75">
            Controle, validade e rastreabilidade
          </p>

          <h1 className="font-display text-5xl font-black leading-tight tracking-tight">
            Padronize sua operação com etiquetas inteligentes.
          </h1>

          <p className="mt-6 text-lg leading-8 text-white/70">
            Gere etiquetas, acompanhe validade, faça conferência por QR Code e
            mantenha o controle operacional em tempo real.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FeatureCard title="QR Code" description="Conferência rápida" />
          <FeatureCard title="Validade" description="Controle diário" />
          <FeatureCard title="Cozinha" description="Fluxo operacional" />
        </div>
      </section>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-evtag-border">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-evtag-primary text-white">
                <Tag size={22} />
              </div>

              <div>
                <p className="font-display text-xl font-black text-evtag-text">
                  EvTag
                </p>
                <p className="text-xs font-medium text-evtag-muted">
                  Etiquetagem inteligente
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-evtag-border bg-white p-8 shadow-sm">
            <div className="mb-8">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-evtag-light text-evtag-primary">
                <ShieldCheck size={28} />
              </div>

              <h1 className="font-display text-3xl font-black tracking-tight text-evtag-text">
                Entrar no EvTag
              </h1>

              <p className="mt-2 text-sm leading-6 text-evtag-muted">
                Acesse sua conta para gerenciar etiquetas, produtos e validade.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-bold text-evtag-text">
                  E-mail
                </span>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                  placeholder="seuemail@empresa.com"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-bold text-evtag-text">
                  Senha
                </span>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-evtag-border bg-evtag-bg px-4 text-sm font-medium text-evtag-text outline-none transition placeholder:text-evtag-muted/60 focus:border-evtag-primary focus:bg-white focus:ring-4 focus:ring-evtag-light"
                  placeholder="••••••••"
                  required
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-evtag-primary px-5 text-sm font-bold text-white shadow-lg shadow-purple-950/10 transition hover:bg-evtag-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="font-display text-lg font-black">{title}</p>
      <p className="mt-1 text-sm text-white/60">{description}</p>
    </div>
  );
}