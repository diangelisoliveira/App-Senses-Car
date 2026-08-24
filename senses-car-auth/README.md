# Senses Car · Tecnologia no Ar

Aplicação web estática para a primeira experiência digital da Senses Car. A tela combina a identidade visual existente da marca com uma imagem inédita de fundo que conecta interior automotivo premium e perfumaria.

## O que está pronto

- Login por e-mail e senha com Supabase Auth.
- Cadastro com nome e empresa, incluindo confirmação de e-mail.
- Recuperação de senha por e-mail.
- Sessão persistente e logout.
- Painel protegido com catálogo de quatro fragrâncias.
- Favoritos privados por usuário.
- Edição de nome, empresa e telefone.
- Banco com RLS em todas as tabelas públicas e perfil criado automaticamente após o cadastro.

## Executar localmente

Como o projeto usa módulos ES no navegador, abra por um servidor HTTP local:

```powershell
cd "G:\Drives compartilhados\5.0 Financeiro\SSS\senses-car-auth"
node server.mjs 4173
```

Depois abra `http://localhost:4173`.

O arquivo `config.js` já aponta para o projeto Supabase fornecido. A chave usada é a chave **publishable**, apropriada para clientes web; nunca coloque uma chave `service_role` no navegador. Para outro ambiente, copie `config.example.js` para `config.js` e ajuste os valores.

## Supabase Auth

No painel do projeto, em Auth → URL Configuration, configure o Site URL e adicione o redirect local:

```text
http://localhost:4173
```

Em projetos hospedados, a confirmação de e-mail costuma estar habilitada. Nesse caso, o usuário precisa clicar no link recebido antes de fazer login.

## Banco de dados

As migrations remotas foram aplicadas ao projeto `rfbwixpvevwdoiuacyha` e também estão versionadas em `supabase/migrations/`:

- `profiles`: dados editáveis do usuário, ligados a `auth.users`.
- `fragrance_catalog`: catálogo público de essências ativas.
- `user_favorites`: relação privada entre usuários e essências favoritas.

O schema mantém a função de criação de perfil no schema privado `private`. As políticas usam `auth.uid()` e as escritas de perfil/favoritos ficam restritas ao próprio usuário.

## Assets

- `assets/hero-auto-fragrance.png`: imagem de fundo gerada para a tela de autenticação.
- `assets/senses-car-brand.jpg`: recorte da imagem de marca já existente na workspace, usado no wordmark da interface.
