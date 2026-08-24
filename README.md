# Senses Car Controle

Aplicativo desktop local para consolidar **Passagens** e **Kits de Higienização (vendidos)** a partir de arquivos CSV/XLS/XLSX e de lançamentos manuais.

## Principais recursos

- painel com os saldos consolidados de Passagens e Kits vendidos;
- importação de CSV, XLS e XLSX com identificação e mapeamento de colunas;
- prévia antes da importação;
- lançamentos manuais padronizados por Marca, Loja e Gerente;
- fluxo obrigatório de lançamento manual Marca → Loja → Dados de Vendas, com lojas filtradas por marca;
- sequência manual completa Marca → Loja → Gerente → Consultor → Passagens → Kits Vendidos → CONCLUIR, com o botão desabilitado enquanto os números forem inválidos ou Kits Vendidos superar Passagens;
- consultores vinculados por Marca + Loja a partir do cadastro de `data/Consultores.xlsx`, sem digitação livre;
- logos visuais automáticos de Fiat, Jeep, Nissan e BYD na seleção e no dashboard;
- identificação automática do Gerente responsável para lançamentos manuais e importações, respeitando a competência do lançamento;
- histórico de responsáveis por Competência + Marca + Loja, sem substituir o gerente corrente de outras competências;
- resumo de conferência da importação com Marca, Loja, Gerente, Passagens, Kits Vendidos e Parcial de Aproveitamento;
- Relatórios com demonstrativo histórico de Data e Hora da Importação, Marca, Loja, Gerente, Consultor, Passagens, Kits Vendidos e aproveitamento inteiro calculado por Kits Vendidos ÷ Passagens;
- filtros de Relatórios e Dashboard BI por período, Marca, Loja, Gerente e Consultor;
- totais consolidados, aproveitamento total, gráfico de kits por marca e ranking de consultores;
- validação de Passagens e Kits Vendidos como inteiros não negativos, aceitando `0/0`, valores iguais ou Passagens maiores que Kits, sem permitir Kits Vendidos acima de Passagens;
- histórico operacional e filtros mantidos no módulo **Relatórios**, com registro de origem;
- exportação do histórico em XLSX e PDF a partir de **Relatórios**;
- Visão Geral dedicada exclusivamente ao resumo executivo;
- relatórios filtráveis por período, Marca, Loja, Gerente, Consultor e situação do aproveitamento, com exportação em XLSX e PDF;
- Dashboard BI com meta automática de 40%, indicadores, Kits vendidos e rankings de consultores na faixa superior, ranking de unidades em largura total, medalhas para os três primeiros lugares e detalhamento por consultor;
- ranking global de unidades considerando todas as Marcas e Lojas cadastradas, inclusive unidades sem lançamentos com `0%` e situação `SEM DADOS`;
- rankings globais dos 3 melhores consultores e dos 3 consultores a melhorar, consolidados por nome e incluindo consultores cadastrados sem lançamentos com `0%`;
- os rankings globais ignoram os filtros do Dashboard BI; KPIs, gráfico por Marca e demais indicadores continuam respeitando os filtros selecionados;
- sinalização objetiva `≥ 40% = DENTRO DA META` e `< 40% = ABAIXO DA META`, usando verde e vermelho;
- consolidacao de Passagens pela soma de todos os lancamentos filtrados; valores iguais em consultores diferentes nao sao removidos.
- totais de Passagens, Kits Vendidos e Aproveitamento calculados pela mesma regra nas visões executivas, respeitando os filtros de cada página;
- **Configurações** para cadastrar Marca, Loja, Gerente e Consultor sem editar o código;
- exclusão protegida e confirmada de lançamentos em Relatórios e de cadastros em Configurações;
- controle de acesso por perfil com Administrador, Gerente ativo e cadastro pendente;
- **Configurações → Controle de Acessos** visível somente para administradores, com ativação/desativação de perfis, definição de função e vínculos por Marca + Loja;
- gerentes ativos visualizam apenas os lançamentos locais das lojas vinculadas ao seu perfil; ações de criação, importação e manutenção de cadastros permanecem administrativas;
- **Comissões** aparece logo abaixo de **Ranking** somente para Administradores e oferece uma central de conferência somente leitura;
- Comissões possui filtros de **Competência/Período**, Marca, Loja e Gerente; o filtro Consultor aparece apenas nas visões Todos/Consultores e o filtro de Tipo de Comissão não é exibido;
- a tela Comissões apresenta as visões **Todos**, **Gerentes** e **Consultores** de forma independente; a aba Gerentes não mostra filtros, cards ou colunas de Consultores;
- a competência **Maio/2026** possui exatamente 12 registros de **Comissão Fixa Gerente**, um por combinação Marca + Loja + Gerente, no valor fixo de **R$ 1.000,00**, totalizando **R$ 12.000,00**;
- na competência **Junho/2026**, a aba **Gerentes** usa exclusivamente a referência oficial fechada de 12 combinações Marca + Loja + Gerente, preserva as unidades zeradas e exibe os valores definidos para cada linha;
- na competência **Julho/2026**, a aba **Gerentes** consolida cada unidade e calcula a comissão por Kits para as unidades não BYD e não descontinuadas: `Kits × R$ 5,00` para aproveitamento `≥ 40%` e `Kits × R$ 2,50` para aproveitamento `< 40%`; as unidades BYD permanecem listadas com **R$ 0,00** até o fechamento de Agosto/2026;
- unidades, nomes ou gerentes de Junho/2026 que não estejam na referência oficial — incluindo **BYD + Aricanduva** — não participam da listagem;
- quando o mesmo Gerente estiver vinculado a mais de uma unidade em Junho/2026, a aba **Gerentes** consolida as Marcas/Lojas, Passagens, Kits e comissões em uma única linha para esse nome;
- a partir de **01/07/2026**, **Nissan + Braz Leme** permanece nos totais gerais, mas recebe o status de unidade **Descontinuada** no Ranking, Relatórios e Comissões; o status é resolvido pela competência, preservando os registros anteriores;
- a partir de **Julho/2026**, o gerente de **Jeep + Aricanduva** é **DIEGO ROBERTO** e o gerente de **Fiat + Aricanduva** é **HENRIQUE FERREIRA**; as regras históricas mantêm Larissa Trivelato Suguimoto e José Elias da C. Silva nas competências anteriores;
- na aba **Gerentes**, Maio mantém os cards e colunas financeiras históricas; Junho exibe Quantidade de Gerentes/unidades, Gerentes Elegíveis, Total Pago aos Gerentes e Data de Pagamento, além de Marca, Loja, Gerente, Passagens, Kits, % Aproveitamento, Comissão e Data de Pagamento;
- os dados de Junho são gerados somente a partir dos lançamentos locais da competência e preservam a Data de Pagamento já registrada; quando vazia, a tela mostra **Não informada**. A regra de Junho não é aplicada automaticamente a outros meses;
- na aba **Consultores**, os cards e a tabela são exclusivos de Consultores; **Todos** pode consolidar os dois grupos;
- para Consultores em **Junho/2026**, a loja usa o aproveitamento consolidado de Junho: cada kit vale **R$ 15,00** quando o aproveitamento for `≥ 40%` e **R$ 7,50** quando for `< 40%`; em **Maio/2026**, os kits do consultor usam a mesma faixa de aproveitamento da respectiva loja em Junho;
- para Consultores em **Julho/2026**, a loja usa o aproveitamento consolidado de Julho com a mesma faixa de **R$ 15,00** ou **R$ 7,50** por kit; as unidades **BYD** permanecem listadas, mas com **R$ 0,00** e fora do total até nova orientação;
- as comissões fixas de Gerentes continuam sendo lidas do histórico oficial; as comissões de Consultores de Maio e Junho são calculadas pelos kits do consultor e pela faixa de aproveitamento da loja, enquanto os indicadores operacionais seguem preservados;
- a conferência distribui as colunas por toda a largura do painel, ajusta valores monetários responsivamente sem cortes, mantém rolagem horizontal apenas em telas estreitas e permite exportar a visão filtrada atual em PDF e Excel, assim como Relatórios;
- persistência local em arquivo JSON no diretório de dados do usuário;
- funcionamento offline após a instalação.
- redesign visual premium com azul-marinho, grafite, off-white, vidro fosco e imagens automotivas conceituais por página;
- Visão Geral com destaque comercial dos produtos Senses Car no interior do veículo;
- seleção visual de Marca no Novo Lançamento e logos vetoriais locais de Fiat, Jeep, Nissan e BYD;
- logos das montadoras preservadas em cores próprias, sem filtros, blend modes ou alteração de saturação, sempre sobre áreas neutras de alto contraste;
- microinterações discretas, hierarquia executiva e responsividade para telas corporativas.

## Autenticação e Supabase

A aplicação inicia com uma tela de acesso Senses Car e usa o Supabase Auth para login, criação de conta, recuperação de senha e persistência da sessão. O cadastro também grava nome e empresa no perfil protegido do usuário.

A tela inicial utiliza a arte aprovada em `src/visuals/access-login-reference.png`. Os campos reais de e-mail, senha, visibilidade da senha, recuperação e acesso permanecem funcionais sobre a composição visual, com a verificação de versão posicionada antes da entrada no sistema.

Antes de liberar o login, o aplicativo Windows empacotado consulta o Release mais recente no GitHub. A tela inicial exibe o painel e o botão **Buscar atualizações**. Enquanto a verificação estiver em andamento, houver uma versão nova para baixar, uma atualização pronta para reiniciar ou ocorrer um erro de verificação, o login permanece bloqueado. O acesso só é liberado quando o estado informa que o sistema está atualizado; nesse caso, uma mensagem confirma a liberação. Se já existir uma sessão persistida, o mesmo bloqueio aparece em uma tela obrigatória antes do painel, evitando que uma versão antiga contorne a atualização.

Os registros operacionais, importações, configurações e relatórios continuam locais no Electron, preservando o uso offline. Autenticação, sessão, perfil, marcas, lojas e vínculos de acesso passam pelo projeto Supabase configurado. O banco possui RLS nas tabelas públicas, funções privadas de autorização e grants explícitos. A aplicação usa somente a chave publishable no frontend; nenhuma chave `service_role` é distribuída.

Novos cadastros entram como `role = null` e `is_active = false`. Depois da confirmação do e-mail, o administrador abre **Configurações → Controle de Acessos**, define `Gerente` ou `Administrador`, marca **Acesso ativo** e salva. Para limitar um gerente, seleciona o usuário, uma Marca existente e uma Loja existente e clica em **Conceder acesso**. Os vínculos são cumulativos e podem ser removidos individualmente. Como os registros operacionais continuam locais nesta fase, Overview, Relatórios, Dashboard BI, Ranking e Comissões filtram pela combinação exata Marca + Loja quando aplicável.

O item **Comissões** e a rota interna `#/commissions` são protegidos por `role = admin` e `is_active = true`: o menu não é renderizado para outros perfis e o guard de renderização redireciona acessos diretos para a Visão Geral. Antes de abrir a tela, o frontend chama a função Supabase `public.can_view_commissions()`, que delega a autorização para `private.is_admin()`. A migration `supabase/migrations/20260823173000_senses_car_commissions_access.sql` precisa estar aplicada no projeto Supabase ativo; sem essa função, o link aparece para o administrador, mas a abertura é recusada pelo guard. A tela não possui ações de criação, edição ou exclusão; ela consulta o histórico financeiro local e os registros operacionais locais apenas para o contexto de desempenho.

Para desenvolvimento web, podem ser definidos `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Sem essas variáveis, o bundle usa a configuração do projeto Senses Car já incluída no aplicativo portátil. No painel do Supabase, mantenha a URL do site e `http://localhost:5173` como URLs permitidas para os fluxos de e-mail durante o desenvolvimento.

O catálogo oficial de Marca e Loja é mantido no Supabase nas tabelas `brands` e `stores`, com a relação protegida em `user_access`. **Controle de Acessos** apenas seleciona registros existentes: não há criação ou edição de lojas nessa tela. A manutenção do catálogo continua em **Configurações** e sincroniza primeiro com o Supabase.

O projeto exige confirmação de e-mail antes do primeiro acesso. O serviço de e-mail padrão do Supabase possui limite de envio; para uso real, configure um SMTP próprio ou aguarde o limite ser renovado. O aplicativo informa esse caso diretamente na tela.

## Competência e histórico de Gerentes

Cada lançamento mantém `date`, `importDate` e `importedAt`. A identificação histórica usa `date` como competência principal e resolve o responsável pela chave `Competência + Marca + Loja`; quando não existe uma regra histórica para o mês, o aplicativo preserva o gerente gravado no lançamento antes de consultar o gerente corrente do catálogo. O alias `W. Luiz` é normalizado para a loja canônica `WASHINGTON LUIZ`.

Para Maio/2026, o mapeamento oficial usado em todas as visões é:

| Marca | Loja | Gerente |
|---|---|---|
| Fiat | Aricanduva | José Elias da C. Silva |
| Fiat | Ceasa | Felipe Martins Dominguez |
| Fiat | Nações Unidas | Adriano Amorim Dos Santos |
| Fiat | Osasco | Arthur Rodrigo de Souza |
| Jeep | Aricanduva | Larissa Trivelato Suguimoto |
| Jeep | Ceasa | Waldyr Bertolacini Junior |
| Jeep | Guarulhos | Aline Pereira Cardoso |
| Jeep | Sumaré | Izalto Ferreira Guimarães Junior |
| Jeep | Vila Guilherme | Erasmo Rodrigues da Costa |
| Jeep | W. Luiz | Carlos Eduardo Mendes |
| Nissan | Braz Leme | Diego Roberto Horvath |
| Nissan | Ceasa | Patrick Wallace dos Santos Plácido |

Para as Comissões de Gerentes de Junho/2026, a referência oficial é exatamente:

| Marca | Loja | Gerente | Comissão |
|---|---|---|---:|
| Fiat | Aricanduva | José Elias da C. Silva | R$ 0,00 |
| Fiat | Ceasa | Felipe Martins Dominguez | R$ 1.000,00 |
| Fiat | Nações Unidas | Adriano Amorim Dos Santos | R$ 1.000,00 |
| Fiat | Osasco | Arthur Rodrigo de Souza | R$ 0,00 |
| Jeep | Aricanduva | Larissa Trivelato Suguimoto | R$ 1.000,00 |
| Jeep | Ceasa | Waldyr Bertolacini Junior | R$ 1.000,00 |
| Jeep | Guarulhos | Aline Pereira Cardoso | R$ 1.000,00 |
| Jeep | Sumaré | Izalto Ferreira Guimarães Junior | R$ 1.000,00 |
| Jeep | Vila Guilherme | Erasmo Rodrigues da Costa | R$ 0,00 |
| Jeep | W. Luiz | Carlos Eduardo Mendes | R$ 0,00 |
| Nissan | Braz Leme | Diego Roberto Horvath | R$ 1.000,00 |
| Nissan | Ceasa | Patrick Wallace dos Santos Plácido | R$ 1.000,00 |

Os registros financeiros usam os campos `competence`, `brand`, `store`, `managerId`, `managerName`, `commissionType`, `commissionValue`, `status`, `paymentDate`, `note` e `createdAt`. Os registros de Junho e Julho também preservam `passages`, `kits`, `percentage`, `eligible` e `commission`. Na apuração de Junho de Gerentes, Passagens, Kits e aproveitamento continuam vindo dos lançamentos locais, enquanto nomes, unidades e valores seguem somente a referência acima; a apresentação consolida em uma única linha os dados de unidades vinculadas ao mesmo Gerente. Vínculos e valores oficiais de Gerentes de Maio e Junho são preservados; os campos de comissão dos lançamentos de Consultores de Maio e Junho são recalculados pela regra de aproveitamento da loja. `commissionType` permanece no histórico para compatibilidade, mas não é oferecido como filtro na tela.

Para as Comissões de Consultores de Junho/2026, o aplicativo soma Passagens e Kits de todos os lançamentos da Marca + Loja na competência para definir a faixa da loja. Cada Consultor recebe `Kits Vendidos do Consultor × R$ 15,00` quando a loja atinge `>= 40%`, ou `Kits Vendidos do Consultor × R$ 7,50` quando fica abaixo de `40%`. Para Maio/2026, os kits de cada Consultor usam a faixa calculada para a mesma Marca + Loja em Junho/2026. Em Julho/2026, a faixa é calculada pela própria loja em Julho; os Consultores das unidades BYD permanecem com comissão de **R$ 0,00** e não entram no total. A regra é recalculada quando os lançamentos locais são carregados, incluídos ou importados.

Para as Comissões de Julho/2026, cada combinação Marca + Loja é consolidada pelos lançamentos da competência. Nas unidades não BYD e não descontinuadas, a regra é `Kits Vendidos × R$ 5,00` quando o aproveitamento da unidade é `>= 40%`; caso contrário, `Kits Vendidos × R$ 2,50`. A apuração recalcula esses registros a partir de Passagens e Kits locais. As unidades BYD permanecem na conferência, mas com comissão temporariamente fixada em **R$ 0,00**, pois o comissionamento de Julho será apurado com referência ao mês fechado de Agosto/2026; elas não entram no total pago de Julho. Nissan Braz Leme permanece na listagem com `unitStatus = "Descontinuada"` e R$ 0,00 a partir de 01/07/2026, sem ser removida dos totais operacionais, mas também não entra no total de comissões de Julho. O campo de status da unidade também é exportado para XLSX e PDF em Relatórios e Comissões.

## Executar em desenvolvimento

Pré-requisitos: Node.js 20 ou superior e npm.

```bash
npm install
npm run dev
```

## Regra de rebuild após modificações

Toda alteração no sistema deve ser seguida de um rebuild completo antes da entrega ou do teste no aplicativo instalado. Isso inclui mudanças na interface, regras de negócio, persistência, autenticação, assets, dependências, configuração e empacotamento.

Execute sempre:

```bash
npm run dist
```

Esse comando executa `npm run build` e depois gera novamente o aplicativo portátil Windows. O resultado atualizado fica em `release/Senses-Car-Controle-<versão>.exe` e em `release/win-unpacked/`. Feche qualquer instância antiga do Senses Car antes de testar e abra o arquivo `Abrir Senses Car.cmd` ou o novo `.exe`. Verifique a data/hora do arquivo para confirmar que está usando o rebuild atual.

`npm run build` sozinho serve apenas para validar o bundle da interface; ele não atualiza o executável que está na pasta `release` e, portanto, não substitui `npm run dist`.

## Atualizações automáticas e Releases no GitHub

O projeto usa o `electron-updater` com Releases públicos do GitHub. O empacotamento Windows gera dois formatos: o instalador NSIS (`Senses-Car-Controle-<versão>-Setup.exe`), que recebe atualizações automáticas, e o executável portátil (`Senses-Car-Controle-<versão>.exe`), que continua disponível para uso sem instalação. O atualizador é suportado pelo instalador NSIS; a versão portátil deve ser substituída manualmente quando uma nova versão for publicada.

No aplicativo empacotado, a verificação ocorre automaticamente ao abrir o aplicativo, antes da autenticação, e é repetida periodicamente. O botão visível **Buscar atualizações** na tela inicial permite iniciar a verificação manualmente; depois do login, o mesmo controle continua disponível no cabeçalho. Quando uma versão é encontrada, o download é feito automaticamente e o acesso permanece bloqueado até a instalação; ao terminar, o botão muda para **Reiniciar e atualizar**. Se a consulta falhar, o aplicativo informa o problema e mantém o login bloqueado até uma nova verificação confirmar que o sistema está atualizado. Os dados locais permanecem na pasta de dados do usuário durante a atualização.

O workflow `.github/workflows/release.yml` é executado a cada push na branch `main` e também pode ser iniciado manualmente. Ele instala o pnpm no runner, incrementa o patch do `package.json`, cria e envia explicitamente uma tag anotada `vX.Y.Z`, aguarda a propagação dessa tag na API do GitHub, gera os instaladores sem publicar em paralelo e usa `gh release create` para enviar sequencialmente o instalador NSIS, o portátil, o blockmap e `latest.yml` ao GitHub Release. O workflow usa apenas `GITHUB_TOKEN` com permissão `contents: write`; nenhum token é incluído no aplicativo.

O repositório oficial é [diangelisoliveira/App-Senses-Car](https://github.com/diangelisoliveira/App-Senses-Car). Para habilitar o fluxo em outro repositório, mantenha o remote `origin` apontando para o repositório GitHub e envie as alterações para `main`:

```bash
git remote add origin https://github.com/diangelisoliveira/App-Senses-Car.git
git branch -M main
git push -u origin main
```

O primeiro push inicia o primeiro Release automaticamente. Releases posteriores são criados a cada novo push em `main`. Para publicar localmente, sem criar um Release no GitHub, use `npm run dist`; para publicar com `GH_TOKEN` configurado, use `npm run dist:publish`.

## Gerar o aplicativo portátil para Windows

```bash
npm install
npm run dist
```

O `pnpm-workspace.yaml` autoriza o script de build do `electron-winstaller`, necessário para gerar o instalador Windows. Mantenha essa permissão ao reinstalar as dependências com pnpm.

O pacote portátil Windows é entregue como `release/Senses-Car-Controle-<versão>.exe` e o instalador como `release/Senses-Car-Controle-<versão>-Setup.exe`. Após cada modificação, esse comando deve ser executado novamente. Para executar a versão descompactada atualizada, abra `release/win-unpacked/Senses Car.exe` ou use o arquivo `Abrir Senses Car.cmd`. A pasta inteira deve ser mantida junta ao copiar a versão descompactada para outra máquina Windows 64 bits.

O `Abrir Senses Car.cmd` usa primeiro `release/win-unpacked/Senses Car.exe` e, se essa pasta não existir, seleciona automaticamente o portátil mais recente disponível em `release/`, sem depender de um número de versão fixo.

Para apenas validar a compilação da interface:

```bash
npm run build
```

## Como usar

1. Abra o aplicativo.
2. Clique em **Importar CSV/XLSX** e selecione a planilha.
3. Relacione as colunas de data, descrição, passagens e kits.
4. Confira a prévia e conclua a importação.
5. Para lançar manualmente, selecione uma Marca, depois uma Loja, confira o Gerente preenchido automaticamente, selecione o Consultor e informe Passagens e Kits Vendidos. O botão **CONCLUIR** só é habilitado para inteiros não negativos; a combinação `0` Passagens e `0` Kits é válida, enquanto Kits Vendidos maiores que Passagens mantêm o botão desabilitado e são recusados.
6. Selecione o Consultor cadastrado para a Marca + Loja; somente depois os campos numéricos serão liberados.
7. Para importar, selecione Marca, Loja e Consultor no resumo de conferência, confirme o Gerente automático e só então clique em **Concluir Importação**. Também é possível mapear uma coluna de Consultor na planilha.
8. O registro recebe automaticamente a Data e Hora da Importação, o Gerente, o Consultor e o aproveitamento (`Kits Vendidos ÷ Passagens`), ficando estruturado para filtros e consolidações.
9. Use **Relatórios** para consultar o histórico, aplicar filtros combinados e exportar XLSX ou PDF.
10. Use **Dashboard BI** para consultar indicadores, ranking global por unidade, os rankings de consultores, meta de 40% e detalhamento por consultor. Os filtros alteram KPIs e gráficos, mas não os rankings globais. Clique em uma unidade para abrir os consultores.
11. Se você for administrador, abra **Configurações → Controle de Acessos** para aprovar usuários, definir `Gerente` ou `Administrador`, ativar/desativar perfis e conceder ou remover visibilidade por Marca + Loja. O painel fica oculto para gerentes; as Marcas e Lojas são selecionadas do catálogo existente.
12. Se você for administrador, abra **Ranking → Comissões** para conferir a operação. Use **Competência/Período** em **Todos os meses**, Maio/2026, Junho/2026 ou competências posteriores, escolha múltiplas Marcas/Lojas quando necessário e refine por Gerente; o filtro de Tipo de Comissão não é exibido.
13. Na competência Maio/2026, selecione a aba **Gerentes** para consultar as 12 combinações oficiais. Os cards mostram 12 gerentes, Total Pago aos Gerentes de R$ 12.000,00 e Data de Pagamento como **Não informada** até existir um registro. A tabela mostra Marca, Loja, Gerente, Competência, Valor Pago e Data de Pagamento.
14. Na competência Junho/2026, a aba **Gerentes** mostra somente as 12 linhas da referência oficial, inclusive as quatro com comissão R$ 0,00, com Passagens, Kits, % Aproveitamento, Comissão e Data de Pagamento. Se um gerente tiver mais de uma unidade, seus dados aparecem consolidados em uma única linha.
15. Alterne entre **Todos**, **Gerentes** e **Consultores**. Gerentes e Consultores possuem cards e tabelas independentes; exporte a visão filtrada atual em PDF ou Excel. Em Maio e Junho, a aba **Consultores** usa os kits de cada consultor e a faixa de aproveitamento da loja em Junho, com R$ 15,00 na meta e R$ 7,50 abaixo dela. Em Julho, usa a faixa da própria loja em Julho e mantém as BYD em R$ 0,00. A regra oficial de Junho dos Gerentes permanece específica da competência. A partir de Julho, Nissan Braz Leme aparece com **Descontinuada** sem ser removida dos totais operacionais.
16. Use **Configurações** para incluir cadastros oficiais. Para remover um lançamento ou cadastro, clique no ícone de lixeira e confirme a ação.

## Formato das planilhas

A primeira linha deve conter cabeçalhos. O aplicativo tenta reconhecer nomes como `Data`, `Descrição`, `Cliente`, `Consultor`, `Nome do premiado`, `Passagens`, `Ticket`, `Kits` e `Higienização`. Caso os nomes sejam diferentes, basta selecionar manualmente a coluna correspondente na etapa de conferência. A Marca, a Loja, o Gerente e os Consultores são definidos pelos cadastros oficiais; não há digitação livre de Consultor.

## Armazenamento e privacidade

Os dados de acesso e o perfil básico do usuário autenticado são tratados pelo Supabase Auth. Os dados operacionais permanecem locais e não são enviados ao Supabase.

No aplicativo empacotado, os lançamentos são gravados em `senses-car-dados.json`, os cadastros em `senses-car-cadastros.json` e o histórico financeiro em `senses-car-comissoes.json`, dentro da pasta de dados da aplicação do usuário. No modo de prévia pelo navegador, o armazenamento local do navegador é usado. O arquivo financeiro preserva a competência e o valor oficial de cada comissão; não há envio desses dados operacionais ao Supabase.

## Estrutura

- src/visuals/auth-blue-automotive.png: fundo principal azul/cobalto da autenticação, com carro e rastros de luz para a linguagem visual da tela de acesso.
- src/visuals/access-login-reference.png: arte integral aprovada para a tela inicial de acesso; os controles de autenticação são posicionados sobre os campos da imagem.
- src/visuals/auth-automotive-background.png: imagem automotiva usada como fundo sutil do painel de autenticação, com sobreposição para preservar a leitura dos campos.
- src/visuals/auth-auto-fragrance-v2.png: imagem de acesso com destaque sutil para o perfume Senses Car, preservando a atmosfera automotiva.

- `src/`: interface e regras de negócio;
- `electron/`: janela desktop, persistência e ponte segura com a interface;
- `public/`: logo exibido no aplicativo;
- `public/senses-car-logo.png`: logo Senses Car branca, em PNG transparente, usada na interface;
- `public/senses-car-logo-black.png`: variante preta transparente disponivel para documentos que exigirem fundo claro;
- `src/assets/senses-car-logo-white.png` e `src/assets/senses-car-logo-black.png`: variantes versionadas importadas pelo componente global `SensesLogo`; a extracao de resultados usa a branca transparente;
- `public/brands/`: logotipos vetoriais locais das marcas automotivas;
- `src/assets/brands/`: copia versionada dos SVGs importada pelo componente reutilizavel `BrandLogo` e incluida diretamente no bundle Vite;
- `public/visuals/` e `src/visuals/`: imagens conceituais fornecidas para a composição visual offline;
- `data/Consultores.xlsx`: cadastro de referência usado para gerar os vínculos Marca + Loja + Consultor;
- `build/`: ícone PNG usado no empacotamento;
- `electron/main.cjs`: persistência local dos lançamentos, cadastros e comissões, exportação PDF via impressão nativa do Electron e atualização automática via GitHub Releases;
- `electron/preload.cjs`: ponte IPC isolada para persistência, exportação e ações seguras de atualização;
- `.github/workflows/release.yml`: versionamento de patch, tags e publicação automática dos Releases Windows;
- `supabase/migrations/`: migrations versionadas do núcleo de perfis, catálogo Marca + Loja, vínculos `user_access`, policies RLS e o gate server-side `public.can_view_commissions()`;
- `release/`: executáveis gerados (não versionados).

## Manutenção da documentação

Toda alteração de comportamento, instalação, importação, armazenamento, comandos ou estrutura deve ser refletida neste README no mesmo conjunto de alterações. As regras para agentes de desenvolvimento estão em `AGENTS.md`.
