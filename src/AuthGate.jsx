import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import authBackground from './visuals/auth-blue-automotive.png';
import authPanelBackground from './visuals/auth-blue-automotive.png';
import accessLoginReference from './visuals/access-login-reference.png';
import sensesCarLogoBlack from './assets/senses-car-logo-black.png';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://rfbwixpvevwdoiuacyha.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_QFyRrd0jXp6whJ_Z6TOxhA_JDqgOTh6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});

const getRedirectUrl = () => {
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return window.location.origin + window.location.pathname;
  }
  return undefined;
};

const friendlyAuthError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar.';
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'Este e-mail já está cadastrado. Tente entrar.';
  }
  if (message.includes('database error saving new user')) {
    return 'O cadastro encontrou um erro no perfil. Tente novamente agora.';
  }
  if (message.includes('signup is disabled') || message.includes('signups not allowed')) {
    return 'O cadastro está desativado no projeto Supabase.';
  }
  if (message.includes('email rate limit exceeded')) {
    return 'O limite de envio de e-mails foi atingido. Aguarde e tente novamente.';
  }
  if (message.includes('password should be at least')) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  }
  if (message.includes('user not found')) {
    return 'Não encontramos uma conta com este e-mail.';
  }

  return error?.message || 'Não foi possível concluir a operação. Tente novamente.';
};

function AuthMessage({ message }) {
  if (!message) return null;

  return (
    <p className={'auth-message ' + message.type}>
      {message.type === 'success' ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}
      <span>{message.text}</span>
    </p>
  );
}

function AuthScreen({ initialMode = 'login', onRecovered }) {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
  });

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setMessage(null);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setMessage(null);
    setShowPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const email = form.email.trim().toLowerCase();
      const redirectUrl = getRedirectUrl();

      if (mode === 'recovery') {
        if (form.password.length < 8) {
          throw new Error('Password should be at least 8 characters');
        }

        const { error } = await supabase.auth.updateUser({ password: form.password });
        if (error) throw error;

        setMessage({ type: 'success', text: 'Senha atualizada. Acesso liberado.' });
        if (onRecovered) onRecovered();
      } else if (mode === 'signup') {
        if (!form.fullName.trim()) {
          throw new Error('Informe seu nome para criar a conta.');
        }
        if (form.password.length < 8) {
          throw new Error('Password should be at least 8 characters');
        }

        const options = {
          data: {
            full_name: form.fullName.trim(),
            company_name: form.companyName.trim(),
          },
        };
        if (redirectUrl) options.emailRedirectTo = redirectUrl;

        const { data, error } = await supabase.auth.signUp({
          email,
          password: form.password,
          options,
        });
        if (error) throw error;

        if (data.session) {
          setMessage({ type: 'success', text: 'Conta criada. Bem-vindo à Senses Car.' });
        } else {
          setMessage({
            type: 'success',
            text: 'Conta criada. Verifique seu e-mail para confirmar o acesso.',
          });
          setMode('login');
          setShowPassword(false);
        }
      } else if (mode === 'forgot') {
        if (!email) throw new Error('Informe seu e-mail.');

        const options = redirectUrl ? { redirectTo: redirectUrl } : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, options);
        if (error) throw error;

        setMessage({
          type: 'success',
          text: 'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
        });
      } else {
        if (!email || !form.password) throw new Error('Informe e-mail e senha.');

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: form.password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setMessage({ type: 'error', text: friendlyAuthError(error) });
    } finally {
      setBusy(false);
    }
  };

  const isRecovery = mode === 'recovery';
  const isForgot = mode === 'forgot';
  const isSignup = mode === 'signup';
  const title = isRecovery
    ? 'Defina uma nova senha'
    : isForgot
      ? 'Recupere seu acesso'
      : isSignup
        ? 'Crie seu acesso'
        : 'Entre no seu espaço';
  const subtitle = isRecovery
    ? 'Escolha uma senha segura para continuar.'
    : isForgot
      ? 'Enviaremos um link seguro para o seu e-mail.'
      : isSignup
        ? 'Seu controle operacional, com a assinatura Senses Car.'
        : 'A inteligência por trás de cada experiência.';
  const submitLabel = isRecovery
    ? 'Salvar nova senha'
    : isForgot
      ? 'Enviar instruções'
      : isSignup
        ? 'Criar conta'
        : 'Acessar painel';

  // The supplied artwork is the exact first-access composition.  Keep the
  // real controls as an accessible overlay so Supabase login/recovery remains
  // unchanged while the visual treatment follows the approved reference.
  if (mode === 'login') {
    return (
      <main className="auth-reference-screen">
        <div
          className="auth-reference-screen__image"
          style={{ backgroundImage: 'url(' + accessLoginReference + ')' }}
          aria-hidden="true"
        />

        <form className="auth-reference-form" onSubmit={handleSubmit}>
          <label className="auth-reference-field">
            <span>E-mail profissional</span>
            <input
              type="email"
              className={form.email ? 'has-value' : ''}
              value={form.email}
              onChange={updateField('email')}
              placeholder="voce@empresa.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-reference-field auth-reference-field--password">
            <span>Senha</span>
            <span className="auth-reference-password">
              <input
                type={showPassword ? 'text' : 'password'}
                className={form.password ? 'has-value' : ''}
                value={form.password}
                onChange={updateField('password')}
                placeholder="Mínimo de 8 caracteres"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((value) => !value)}
              >
                <span className="visually-hidden">
                  {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                </span>
              </button>
            </span>
          </label>

          <div className="auth-reference-message" aria-live="polite">
            <AuthMessage message={message} />
          </div>

          <button
            className="auth-reference-submit"
            type="submit"
            disabled={busy}
            aria-busy={busy}
          >
            <span className="visually-hidden">{busy ? 'Aguarde...' : submitLabel}</span>
          </button>
        </form>

        <button
          className="auth-reference-forgot"
          type="button"
          onClick={() => changeMode('forgot')}
        >
          <span className="visually-hidden">Esqueci minha senha</span>
        </button>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section
        className="auth-screen-visual"
        style={{ backgroundImage: 'url(' + authBackground + ')' }}
      >
        <div className="auth-screen-visual__overlay" />
        <div className="auth-screen-visual__content">
          <span className="auth-kicker">AUTOMOTIVE · FRAGRANCE · EXPERIENCE</span>
          <h1>
            Conduza sua
            <br />
            <em>presença.</em>
          </h1>
          <p>
            Um cockpit elegante para transformar operação, relacionamento e fragrância em uma
            experiência memorável.
          </p>
          <div className="auth-visual-line">
            <span />
            <small>SENSES CAR / CONTROL ROOM</small>
          </div>
        </div>
      </section>

      <section
        className="auth-screen-panel"
        style={{ '--auth-panel-image': 'url(' + authPanelBackground + ')' }}
      >
        <div className="auth-screen-panel__status">
          <span className="auth-status-dot" />
          Ambiente protegido
        </div>

        <div className="auth-card">
          <img className="auth-card__logo" src={sensesCarLogoBlack} alt="Senses Car" />
          <div className="auth-card__heading">
            <span className="auth-card__eyebrow">CONTROLE OPERACIONAL</span>
            <h2>
              {title.split(' ').slice(0, -1).join(' ')}{' '}
              <em>{title.split(' ').slice(-1).join(' ')}</em>
            </h2>
            <p>{subtitle}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <div className="auth-form-grid">
                <label>
                  <span>Seu nome</span>
                  <input
                    value={form.fullName}
                    onChange={updateField('fullName')}
                    placeholder="Como devemos chamar você?"
                    autoComplete="name"
                    required
                  />
                </label>
                <label>
                  <span>Empresa</span>
                  <input
                    value={form.companyName}
                    onChange={updateField('companyName')}
                    placeholder="Opcional"
                    autoComplete="organization"
                  />
                </label>
              </div>
            )}

            {!isRecovery && (
              <label>
                <span>E-mail profissional</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={updateField('email')}
                  placeholder="voce@empresa.com"
                  autoComplete="email"
                  required
                />
              </label>
            )}

            {!isForgot && (
              <label>
                <span>{isRecovery ? 'Nova senha' : 'Senha'}</span>
                <span className="auth-password">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={updateField('password')}
                    placeholder="Mínimo de 8 caracteres"
                    autoComplete={isRecovery ? 'new-password' : isSignup ? 'new-password' : 'current-password'}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>
            )}

            <AuthMessage message={message} />

            <button className="auth-primary-button" type="submit" disabled={busy}>
              {busy ? 'Aguarde...' : submitLabel}
              {!busy && <ArrowRight size={17} />}
            </button>
          </form>

          {!isRecovery && !isSignup && mode === 'login' && (
            <button className="auth-link-button" type="button" onClick={() => changeMode('forgot')}>
              Esqueci minha senha
            </button>
          )}
          {isForgot && (
            <button className="auth-link-button" type="button" onClick={() => changeMode('login')}>
              Voltar para entrar
            </button>
          )}
          {isRecovery && (
            <p className="auth-security-note">
              <LockKeyhole size={15} />
              Link de recuperação validado pelo Supabase Auth.
            </p>
          )}
        </div>

        <div className="auth-screen-panel__footer">
          <span>© Senses Car</span>
          <span>Dados protegidos · Acesso seguro</span>
        </div>
      </section>
    </main>
  );
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);
  const [accessState, setAccessState] = useState({ loading: false, profile: null, unitAccess: [], error: null });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session || null);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loadAccessProfile = async (nextSession) => {
    if (!nextSession?.user?.id) {
      setAccessState({ loading: false, profile: null, unitAccess: [], error: null });
      return null;
    }

    setAccessState((current) => ({ ...current, loading: true, error: null }));
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, company_name, role, is_active, created_at, updated_at')
      .eq('id', nextSession.user.id)
      .maybeSingle();

    if (profileError) {
      setAccessState({ loading: false, profile: null, unitAccess: [], error: profileError });
      return null;
    }

    let unitAccess = [];
    if (profile?.role === 'admin' && profile?.is_active) {
      const [brandsResult, storesResult] = await Promise.all([
        supabase.from('brands').select('id, name, is_active').eq('is_active', true).order('name', { ascending: true }),
        supabase.from('stores').select('id, brand_id, name, is_active').eq('is_active', true).order('name', { ascending: true }),
      ]);
      const error = brandsResult.error || storesResult.error;
      if (error) {
        setAccessState({ loading: false, profile, unitAccess: [], error });
        return null;
      }
      const brandById = Object.fromEntries((brandsResult.data || []).map((brand) => [brand.id, brand]));
      unitAccess = (storesResult.data || [])
        .filter((store) => brandById[store.brand_id])
        .map((store) => ({
          brandId: store.brand_id,
          brandName: brandById[store.brand_id].name,
          storeId: store.id,
          storeName: store.name,
          key: `${store.brand_id}:${store.id}`,
        }));
    } else if (profile?.role === 'gerente' && profile?.is_active) {
      const { data: links, error: linksError } = await supabase
        .from('user_access')
        .select('brand_id, store_id')
        .eq('user_id', nextSession.user.id);
      if (linksError) {
        setAccessState({ loading: false, profile, unitAccess: [], error: linksError });
        return null;
      }
      const storeIds = (links || []).map((link) => link.store_id).filter(Boolean);
      const brandIds = [...new Set((links || []).map((link) => link.brand_id).filter(Boolean))];
      if (storeIds.length && brandIds.length) {
        const [brandsResult, storesResult] = await Promise.all([
          supabase.from('brands').select('id, name, is_active').in('id', brandIds).eq('is_active', true),
          supabase.from('stores').select('id, brand_id, name, is_active').in('id', storeIds).eq('is_active', true),
        ]);
        const error = brandsResult.error || storesResult.error;
        if (error) {
          setAccessState({ loading: false, profile, unitAccess: [], error });
          return null;
        }
        const brandById = Object.fromEntries((brandsResult.data || []).map((brand) => [brand.id, brand]));
        unitAccess = (storesResult.data || [])
          .filter((store) => brandById[store.brand_id])
          .map((store) => ({
            brandId: store.brand_id,
            brandName: brandById[store.brand_id].name,
            storeId: store.id,
            storeName: store.name,
            key: `${store.brand_id}:${store.id}`,
          }));
      }
    }

    setAccessState({ loading: false, profile: profile || null, unitAccess, error: null });
    return profile || null;
  };

  useEffect(() => {
    if (session === undefined) return undefined;
    if (!session) {
      setAccessState({ loading: false, profile: null, unitAccess: [], error: null });
      return undefined;
    }
    void loadAccessProfile(session);
    return undefined;
  }, [session?.user?.id]);

  if (session === undefined) {
    return (
      <div className="auth-loading">
        <span />
        Conectando ao espaço Senses Car...
      </div>
    );
  }

  if (recovery) {
    return <AuthScreen initialMode="recovery" onRecovered={() => setRecovery(false)} />;
  }

  if (!session) return <AuthScreen />;

  if (accessState.loading) {
    return (
      <div className="auth-loading">
        <span />
        Carregando seu perfil de acesso...
      </div>
    );
  }

  if (accessState.error) {
    return (
      <main className="access-pending-screen">
        <section className="access-pending-card">
          <ShieldCheck size={32} />
          <span className="auth-card__eyebrow">ACESSO SENSES CAR</span>
          <h1>Não foi possível validar seu acesso.</h1>
          <p>{friendlyAuthError(accessState.error)}</p>
          <button type="button" className="auth-primary-button access-pending-card__button" onClick={() => void loadAccessProfile(session)}>
            Tentar novamente <ArrowRight size={17} />
          </button>
          <button type="button" className="auth-link-button access-pending-card__logout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} /> Sair
          </button>
        </section>
      </main>
    );
  }

  if (!accessState.profile?.is_active || !['admin', 'gerente'].includes(accessState.profile?.role)) {
    const disabled = Boolean(accessState.profile?.role && !accessState.profile?.is_active);
    return (
      <main className="access-pending-screen">
        <section className="access-pending-card">
          <ShieldCheck size={32} />
          <span className="auth-card__eyebrow">{disabled ? 'ACESSO DESATIVADO' : 'CADASTRO EM ANÁLISE'}</span>
          <h1>{disabled ? 'Seu acesso está desativado.' : 'Aguardando aprovação.'}</h1>
          <p>
            {disabled
              ? 'Um administrador precisa reativar seu perfil para liberar o aplicativo.'
              : 'Seu cadastro foi recebido. Um administrador precisa definir seu perfil e liberar o acesso.'}
          </p>
          <button type="button" className="auth-link-button access-pending-card__logout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={15} /> Sair
          </button>
        </section>
      </main>
    );
  }

  return children({
    user: session.user,
    profile: accessState.profile,
    unitAccess: accessState.unitAccess,
    storeAccess: accessState.unitAccess,
    onProfileRefresh: () => loadAccessProfile(session),
    signOut: () => supabase.auth.signOut(),
  });
}
