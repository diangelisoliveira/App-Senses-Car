const authContent = document.querySelector("#auth-content");
const dashboardContent = document.querySelector("#dashboard-content");
const toast = document.querySelector("#toast");
document.querySelector("#current-year").textContent = String(new Date().getFullYear());

const config = window.SENSES_CAR_CONFIG || {};
const supabaseApi = window.supabase;
const supabase =
  supabaseApi && config.url && config.publishableKey
    ? supabaseApi.createClient(config.url, config.publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

const state = {
  authMode: "login",
  authMessage: null,
  bootError: null,
  dashboardError: null,
  dashboardLoading: false,
  recovery: false,
  session: null,
  user: null,
  profile: null,
  fragrances: [],
  favorites: new Set(),
};

const icon = (name) => {
  const template = document.querySelector("#icon-" + name);
  return template ? template.innerHTML : "";
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });

const safeColor = (value) => (/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#D6A667");

const initials = (name, email) => {
  const source = String(name || email || "SC").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

const displayName = (profile, user) => {
  const name = String(profile?.full_name || "").trim();
  if (name) return name;
  return String(user?.email || "cliente").split("@")[0];
};

const firstName = (profile, user) => displayName(profile, user).split(/\s+/)[0];

const getRedirectUrl = () => {
  if (window.location.protocol !== "http:" && window.location.protocol !== "https:") {
    return undefined;
  }
  return window.location.href.split("#")[0];
};

const friendlyError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique também a caixa de spam.";
  }
  if (message.includes("user already registered")) return "Este e-mail já possui um acesso.";
  if (message.includes("password should be at least")) {
    return "Use uma senha com pelo menos 8 caracteres.";
  }
  if (message.includes("rate limit")) return "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
  if (message.includes("failed to fetch")) {
    return "Não foi possível alcançar o Supabase. Confira a conexão e tente novamente.";
  }
  return error?.message || "Algo não saiu como esperado. Tente novamente.";
};

let toastTimer;
const showToast = (message, type = "neutral") => {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "toast is-visible" + (type === "error" ? " is-error" : "");
  toastTimer = window.setTimeout(() => {
    toast.className = "toast";
  }, 4200);
};

const setAuthMessage = (message, type = "neutral") => {
  state.authMessage = message ? { message, type } : null;
  const element = document.querySelector("#auth-feedback");
  if (!element) return;
  element.textContent = message || "";
  element.className = "auth-feedback" + (message ? " is-" + type : "");
};

const setDashboardMessage = (message, type = "neutral") => {
  const element = document.querySelector("#profile-feedback");
  if (!element) return;
  element.textContent = message || "";
  element.className = "auth-feedback" + (message ? " is-" + type : "");
};

const renderAuthFeedback = () => {
  return (
    '<p id="auth-feedback" class="auth-feedback is-' +
    escapeHtml(state.authMessage?.type || "neutral") +
    '">' +
    escapeHtml(state.authMessage?.message || "") +
    "</p>"
  );
};

const renderAuth = () => {
  if (state.bootError) {
    return (
      '<div class="auth-heading">' +
      '<p class="eyebrow">Configuração necessária</p>' +
      "<h2>Conecte seu <em>espaço.</em></h2>" +
      '<p>' +
      escapeHtml(state.bootError) +
      "</p>" +
      "</div>" +
      '<div class="empty-state">Abra <strong>config.js</strong> e informe a URL do projeto e a chave publishable do Supabase.</div>'
    );
  }

  if (state.recovery) return renderRecovery();

  const isSignup = state.authMode === "signup";
  const submitLabel = isSignup ? "Criar meu acesso" : "Entrar no espaço";
  const feedback = renderAuthFeedback();
  const signupFields = isSignup
    ? '<div class="field-row">' +
      '<div class="field">' +
      "<label for='full-name'>Nome completo</label>" +
      "<input id='full-name' name='full_name' type='text' autocomplete='name' placeholder='Como podemos chamar você?' required />" +
      "</div>" +
      '<div class="field">' +
      "<label for='company-name'>Empresa <span>(opcional)</span></label>" +
      "<input id='company-name' name='company_name' type='text' autocomplete='organization' placeholder='Sua empresa' />" +
      "</div>" +
      "</div>"
    : "";
  const forgot = isSignup
    ? ""
    : '<div class="form-meta"><button class="text-button" type="button" data-action="forgot-password">Esqueci minha senha</button></div>';

  return (
    '<div class="auth-heading">' +
    '<p class="eyebrow">' +
    (isSignup ? "Primeiro acesso" : "Bem-vindo de volta") +
    "</p>" +
    "<h2>" +
    (isSignup ? "Crie seu <em>ritual.</em>" : "Seu espaço, <em>seu aroma.</em>") +
    "</h2>" +
    "<p>" +
    (isSignup
      ? "Guarde suas preferências e acompanhe uma curadoria feita para cada momento."
      : "Entre para continuar sua jornada entre notas, matérias e movimento.") +
    "</p>" +
    "</div>" +
    '<div class="auth-tabs" role="tablist" aria-label="Escolha uma ação">' +
    '<button class="auth-tab' +
    (isSignup ? "" : " is-active") +
    '" type="button" role="tab" aria-selected="' +
    (!isSignup) +
    '" data-action="toggle-auth-mode" data-auth-mode="login">Entrar</button>' +
    '<button class="auth-tab' +
    (isSignup ? " is-active" : "") +
    '" type="button" role="tab" aria-selected="' +
    isSignup +
    '" data-action="toggle-auth-mode" data-auth-mode="signup">Criar acesso</button>' +
    "</div>" +
    "<form id='auth-form' class='auth-form' data-form='auth' novalidate>" +
    signupFields +
    '<div class="field">' +
    "<label for='auth-email'>E-mail</label>" +
    "<input id='auth-email' name='email' type='email' autocomplete='email' placeholder='voce@empresa.com' required />" +
    "</div>" +
    '<div class="field">' +
    "<label for='auth-password'>Senha</label>" +
    '<div class="password-field">' +
    "<input id='auth-password' name='password' type='password' autocomplete='" +
    (isSignup ? "new-password" : "current-password") +
    "' placeholder='Mínimo de 8 caracteres' minlength='8' required />" +
    '<button class="password-toggle" type="button" data-action="toggle-password" data-target="auth-password" aria-label="Mostrar senha">' +
    icon("eye") +
    "</button>" +
    "</div>" +
    "</div>" +
    forgot +
    '<button class="primary-button primary-button--full" type="submit">' +
    '<span data-submit-label>' +
    submitLabel +
    "</span>" +
    icon("arrow") +
    "</button>" +
    feedback +
    '<div class="auth-note">Seu acesso é protegido pelo Supabase Auth. Seus favoritos ficam privados para você.</div>' +
    "</form>"
  );
};

const renderRecovery = () => {
  const feedback = renderAuthFeedback();
  return (
    '<div class="recovery-shell">' +
    '<button class="back-button" type="button" data-action="back-to-login">← Voltar para entrar</button>' +
    '<div class="auth-heading">' +
    '<p class="eyebrow">Redefinição segura</p>' +
    "<h2>Escolha uma <em>nova senha.</em></h2>" +
    "<p>Crie uma senha forte para continuar cuidando da sua experiência Senses Car.</p>" +
    "</div>" +
    "<form id='reset-form' class='auth-form' data-form='reset' novalidate>" +
    '<div class="field">' +
    "<label for='new-password'>Nova senha</label>" +
    '<div class="password-field">' +
    "<input id='new-password' name='password' type='password' autocomplete='new-password' placeholder='Mínimo de 8 caracteres' minlength='8' required />" +
    '<button class="password-toggle" type="button" data-action="toggle-password" data-target="new-password" aria-label="Mostrar senha">' +
    icon("eye") +
    "</button>" +
    "</div>" +
    "</div>" +
    '<div class="field">' +
    "<label for='confirm-password'>Confirme a senha</label>" +
    "<input id='confirm-password' name='confirm_password' type='password' autocomplete='new-password' placeholder='Digite novamente' minlength='8' required />" +
    "</div>" +
    '<button class="primary-button primary-button--full" type="submit"><span data-submit-label>Salvar nova senha</span>' +
    icon("arrow") +
    "</button>" +
    feedback +
    "</form>" +
    "</div>"
  );
};

const renderIntensity = (intensity) => {
  const level = Math.max(1, Math.min(5, Number(intensity) || 1));
  return (
    '<span class="intensity" aria-label="Intensidade ' +
    level +
    " de 5\">" +
    [1, 2, 3, 4, 5]
      .map((item) => '<i class="' + (item <= level ? "is-on" : "") + '"></i>')
      .join("") +
    "</span>"
  );
};

const renderNotes = (notes) =>
  (Array.isArray(notes) ? notes : [])
    .slice(0, 3)
    .map((note) => '<span class="note-chip">' + escapeHtml(note) + "</span>")
    .join("");

const renderFragranceCard = (fragrance) => {
  const isFavorite = state.favorites.has(fragrance.id);
  const color = safeColor(fragrance.accent_color);
  const favoriteLabel = (isFavorite ? "Remover " : "Adicionar ") + fragrance.name + " " + "dos favoritos";
  return (
    '<article class="fragrance-card" style="--accent: ' +
    color +
    '">' +
    '<div class="fragrance-card__top">' +
    '<span class="fragrance-card__category">' +
    escapeHtml(fragrance.category) +
    "</span>" +
    '<button class="favorite-button' +
    (isFavorite ? " is-active" : "") +
    '" type="button" data-action="favorite" data-fragrance-id="' +
    escapeHtml(fragrance.id) +
    '" aria-pressed="' +
    isFavorite +
    '" aria-label="' +
    escapeHtml(favoriteLabel) +
    '">' +
    icon("heart") +
    "</button>" +
    "</div>" +
    "<h4>" +
    escapeHtml(fragrance.name) +
    "</h4>" +
    '<p class="fragrance-card__description">' +
    escapeHtml(fragrance.description) +
    "</p>" +
    '<div class="fragrance-card__meta">' +
    '<div class="notes-list">' +
    renderNotes(fragrance.notes) +
    "</div>" +
    renderIntensity(fragrance.intensity) +
    "</div>" +
    "</article>"
  );
};

const renderDashboard = () => {
  if (state.dashboardLoading) {
    return '<div class="loading-state">Abrindo seu espaço Senses Car…</div>';
  }

  const profile = state.profile || {};
  const name = displayName(profile, state.user);
  const completedFields = ["full_name", "phone", "company_name"].filter(
    (field) => String(profile[field] || "").trim()
  ).length;
  const completion = Math.round((completedFields / 3) * 100);
  const fragrances = state.fragrances || [];
  const cards = fragrances.length
    ? fragrances.map(renderFragranceCard).join("")
    : '<div class="empty-state">A curadoria está sendo preparada. Volte em breve para descobrir novas notas.</div>';

  if (state.dashboardError) {
    return (
      '<div class="empty-state">' +
      escapeHtml(state.dashboardError) +
      "</div>"
    );
  }

  return (
    '<div class="dashboard-content">' +
    '<header class="dashboard-header">' +
    '<div class="dashboard-header__user">' +
    '<div class="avatar" aria-hidden="true">' +
    escapeHtml(initials(name, state.user?.email)) +
    "</div>" +
    "<div><p>" +
    escapeHtml(name) +
    "</p><span>" +
    escapeHtml(state.user?.email || "") +
    "</span></div>" +
    "</div>" +
    '<button class="logout-button" type="button" data-action="logout">' +
    icon("log-out") +
    "Sair</button>" +
    "</header>" +
    '<section class="dashboard-hero">' +
    '<p class="eyebrow">Seu painel sensorial</p>' +
    "<h2>Olá, <em>" +
    escapeHtml(firstName(profile, state.user)) +
    ".</em></h2>" +
    "<p>Uma seleção essencial para acompanhar o seu próximo movimento.</p>" +
    "</section>" +
    '<section class="dashboard-stats" aria-label="Resumo da conta">' +
    '<div class="stat-card"><span class="stat-card__number">' +
    fragrances.length +
    '</span><span class="stat-card__label">essências na curadoria</span></div>' +
    '<div class="stat-card"><span class="stat-card__number">' +
    state.favorites.size +
    '</span><span class="stat-card__label">favoritos guardados</span></div>' +
    '<div class="stat-card"><span class="stat-card__number">' +
    completion +
    '%</span><span class="stat-card__label">perfil preenchido</span></div>' +
    "</section>" +
    '<section aria-labelledby="collection-heading">' +
    '<div class="section-heading"><div><h3 id="collection-heading">Coleção Senses Car</h3></div><p>Escolhas para sentir</p></div>' +
    '<div class="fragrance-grid">' +
    cards +
    "</div>" +
    "</section>" +
    '<section class="dashboard-profile" aria-labelledby="profile-heading">' +
    '<div class="dashboard-profile__heading"><h3 id="profile-heading">Seu perfil</h3><span>Atualize quando quiser</span></div>' +
    "<form class='profile-form' data-form='profile'>" +
    '<div class="field-row">' +
    '<div class="field"><label class="profile-form__label" for="profile-name">Nome</label><input id="profile-name" name="full_name" value="' +
    escapeHtml(profile.full_name || "") +
    '" placeholder="Seu nome" /></div>' +
    '<div class="field"><label class="profile-form__label" for="profile-company">Empresa</label><input id="profile-company" name="company_name" value="' +
    escapeHtml(profile.company_name || "") +
    '" placeholder="Sua empresa" /></div>' +
    "</div>" +
    '<div class="field"><label class="profile-form__label" for="profile-phone">Telefone</label><input id="profile-phone" name="phone" type="tel" value="' +
    escapeHtml(profile.phone || "") +
    '" placeholder="(00) 00000-0000" /></div>' +
    '<div class="profile-actions"><p id="profile-feedback" class="auth-feedback"></p><button class="secondary-button" type="submit">Salvar perfil ' +
    icon("arrow") +
    "</button></div>" +
    "</form>" +
    "</section>" +
    "</div>"
  );
};

const render = () => {
  const showingAuth = !state.session || state.recovery;
  authContent.hidden = !showingAuth;
  dashboardContent.hidden = showingAuth;
  if (showingAuth) {
    authContent.innerHTML = renderAuth();
  } else {
    dashboardContent.innerHTML = renderDashboard();
  }
};

const openDashboard = async (session) => {
  if (!session) return;
  state.session = session;
  state.user = session.user;
  state.recovery = false;
  state.dashboardError = null;
  state.dashboardLoading = true;
  render();

  const [profileResult, fragranceResult, favoriteResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, company_name, avatar_url, created_at, updated_at").eq("id", session.user.id).maybeSingle(),
    supabase.from("fragrance_catalog").select("id, name, slug, category, description, notes, intensity, accent_color, created_at").eq("is_active", true).order("created_at", { ascending: true }),
    supabase.from("user_favorites").select("fragrance_id").eq("user_id", session.user.id),
  ]);

  if (profileResult.error || fragranceResult.error || favoriteResult.error) {
    const error = profileResult.error || fragranceResult.error || favoriteResult.error;
    state.dashboardError = friendlyError(error);
    state.profile = profileResult.data || {};
    state.fragrances = [];
    state.favorites = new Set();
  } else {
    state.profile = profileResult.data || {};
    state.fragrances = fragranceResult.data || [];
    state.favorites = new Set((favoriteResult.data || []).map((item) => item.fragrance_id));
  }

  state.dashboardLoading = false;
  render();
};

const handleAuthSubmit = async (form) => {
  if (!supabase) return;
  const submitButton = form.querySelector("button[type='submit']");
  const submitLabel = submitButton?.querySelector("[data-submit-label]");
  if (submitButton) submitButton.disabled = true;
  if (submitLabel) submitLabel.textContent = "Aguarde…";
  setAuthMessage("", "neutral");

  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const password = String(form.elements.password.value || "");

  if (!email || !password) {
    setAuthMessage("Preencha seu e-mail e sua senha.", "error");
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = state.authMode === "signup" ? "Criar meu acesso" : "Entrar no espaço";
    return;
  }

  let result;
  if (state.authMode === "signup") {
    const fullName = String(form.elements.full_name?.value || "").trim();
    const companyName = String(form.elements.company_name?.value || "").trim();
    if (!fullName) {
      setAuthMessage("Informe seu nome para criar o acesso.", "error");
      if (submitButton) submitButton.disabled = false;
      if (submitLabel) submitLabel.textContent = "Criar meu acesso";
      return;
    }
    const options = {
      data: {
        full_name: fullName,
        company_name: companyName,
      },
    };
    const redirectTo = getRedirectUrl();
    if (redirectTo) options.emailRedirectTo = redirectTo;
    result = await supabase.auth.signUp({ email, password, options });
  } else {
    result = await supabase.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    setAuthMessage(friendlyError(result.error), "error");
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = state.authMode === "signup" ? "Criar meu acesso" : "Entrar no espaço";
    return;
  }

  if (state.authMode === "signup" && !result.data.session) {
    setAuthMessage("Acesso criado. Confirme seu e-mail para liberar a entrada.", "success");
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = "Criar meu acesso";
    form.reset();
  } else if (state.authMode === "signup") {
    showToast("Acesso criado. Bem-vindo à Senses Car.");
  }
};

const handleForgotPassword = async () => {
  if (!supabase) return;
  const emailInput = document.querySelector("#auth-email");
  const email = String(emailInput?.value || "").trim().toLowerCase();
  if (!email) {
    setAuthMessage("Informe seu e-mail para receber o link de redefinição.", "error");
    emailInput?.focus();
    return;
  }

  setAuthMessage("Enviando o link de redefinição…", "neutral");
  const redirectTo = getRedirectUrl();
  const options = redirectTo ? { redirectTo } : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, options);
  if (error) {
    setAuthMessage(friendlyError(error), "error");
    return;
  }
  setAuthMessage("Link enviado. Confira seu e-mail para escolher uma nova senha.", "success");
};

const handlePasswordReset = async (form) => {
  const password = String(form.elements.password.value || "");
  const confirmation = String(form.elements.confirm_password.value || "");
  const submitButton = form.querySelector("button[type='submit']");
  const submitLabel = submitButton?.querySelector("[data-submit-label]");

  if (password.length < 8) {
    setAuthMessage("Use uma senha com pelo menos 8 caracteres.", "error");
    return;
  }
  if (password !== confirmation) {
    setAuthMessage("As senhas precisam ser iguais.", "error");
    return;
  }

  if (submitButton) submitButton.disabled = true;
  if (submitLabel) submitLabel.textContent = "Salvando…";
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    setAuthMessage(friendlyError(error), "error");
    if (submitButton) submitButton.disabled = false;
    if (submitLabel) submitLabel.textContent = "Salvar nova senha";
    return;
  }

  state.recovery = false;
  state.authMessage = null;
  showToast("Senha atualizada com sucesso.");
  await openDashboard(state.session);
};

const handleProfileSave = async (form) => {
  if (!state.user) return;
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;
  setDashboardMessage("Salvando…", "neutral");

  const profile = {
    full_name: String(form.elements.full_name.value || "").trim(),
    company_name: String(form.elements.company_name.value || "").trim(),
    phone: String(form.elements.phone.value || "").trim(),
  };
  const { data, error } = await supabase
    .from("profiles")
    .update(profile)
    .eq("id", state.user.id)
    .select("id, full_name, phone, company_name, avatar_url, created_at, updated_at")
    .single();

  if (error) {
    setDashboardMessage(friendlyError(error), "error");
    if (button) button.disabled = false;
    return;
  }

  state.profile = data;
  setDashboardMessage("Perfil atualizado.", "success");
  if (button) button.disabled = false;
  showToast("Seu perfil foi atualizado.");
};

const handleFavorite = async (fragranceId, button) => {
  if (!state.user || !fragranceId || button?.disabled) return;
  if (button) button.disabled = true;
  const isFavorite = state.favorites.has(fragranceId);
  const result = isFavorite
    ? await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", state.user.id)
        .eq("fragrance_id", fragranceId)
    : await supabase
        .from("user_favorites")
        .insert({ user_id: state.user.id, fragrance_id: fragranceId });

  if (result.error) {
    showToast(friendlyError(result.error), "error");
    if (button) button.disabled = false;
    return;
  }

  if (isFavorite) {
    state.favorites.delete(fragranceId);
  } else {
    state.favorites.add(fragranceId);
  }
  render();
};

const handleLogout = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    showToast(friendlyError(error), "error");
  }
};

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "toggle-auth-mode") {
    state.authMode = target.dataset.authMode || "login";
    state.authMessage = null;
    render();
    return;
  }

  if (action === "toggle-password") {
    const input = document.querySelector("#" + target.dataset.target);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    target.innerHTML = icon(isPassword ? "eye-off" : "eye");
    target.setAttribute("aria-label", isPassword ? "Ocultar senha" : "Mostrar senha");
    return;
  }

  if (action === "forgot-password") {
    void handleForgotPassword();
    return;
  }

  if (action === "back-to-login") {
    state.recovery = false;
    state.authMode = "login";
    state.authMessage = null;
    if (state.session) {
      state.session = null;
      state.user = null;
    }
    render();
    return;
  }

  if (action === "favorite") {
    void handleFavorite(target.dataset.fragranceId, target);
    return;
  }

  if (action === "logout") {
    void handleLogout();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.dataset.form === "auth") void handleAuthSubmit(form);
  if (form.dataset.form === "reset") void handlePasswordReset(form);
  if (form.dataset.form === "profile") void handleProfileSave(form);
});

if (!supabase) {
  state.bootError = "A aplicação precisa das configurações do Supabase para iniciar.";
  render();
} else {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      state.session = session;
      state.user = session?.user || state.user;
      state.recovery = true;
      state.authMessage = null;
      render();
      return;
    }
    if (event === "SIGNED_OUT") {
      state.session = null;
      state.user = null;
      state.profile = null;
      state.fragrances = [];
      state.favorites = new Set();
      state.dashboardLoading = false;
      state.dashboardError = null;
      state.authMode = "login";
      state.authMessage = null;
      render();
      return;
    }
    if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
      void openDashboard(session);
      return;
    }
    if (session) {
      state.session = session;
      state.user = session.user;
    }
  });

  const bootstrap = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      state.bootError = friendlyError(error);
      render();
      return;
    }
    if (data.session) {
      await openDashboard(data.session);
    } else {
      render();
    }
  };

  void bootstrap();
}
