# AGENTS.md — Senses Car Controle

Estas instruções valem para todo o projeto.

## Regra obrigatória de documentação

Sempre mantenha a documentação sincronizada com o aplicativo. Toda mudança que altere funcionalidade, fluxo de usuário, estrutura, dependências, scripts, empacotamento, formato de importação ou persistência deve atualizar o `README.md` no mesmo trabalho.

Antes de concluir qualquer tarefa:

1. revise o impacto da mudança no `README.md`;
2. atualize exemplos e comandos que tenham mudado;
3. registre novos campos, formatos de importação e decisões de armazenamento;
4. confirme que a documentação descreve o comportamento real da versão entregue.

Não marque uma tarefa como concluída quando código e documentação estiverem divergentes.

## Regra obrigatória de rebuild

Após qualquer modificação no sistema — incluindo interface, regras de negócio, persistência, autenticação, assets, dependências, configuração ou empacotamento — execute o rebuild completo com `npm run dist` antes de considerar o trabalho concluído.

`npm run build` valida somente o bundle da interface e não substitui o rebuild do aplicativo Windows. O `npm run dist` deve gerar novamente o pacote portátil em `release/Senses-Car-Controle-<versão>.exe` e atualizar a versão descompactada em `release/win-unpacked/`.

Depois do rebuild, confirme a data/hora dos artefatos gerados, feche qualquer instância antiga do aplicativo e valide a execução pelo `Abrir Senses Car.cmd` ou pelo novo executável portátil. Não entregue a alteração apontando para uma versão empacotada anterior.

## Diretrizes técnicas

- Preserve o funcionamento offline e a persistência local.
- Não introduza envio de dados a serviços externos sem autorização explícita.
- Mantenha `contextIsolation: true` e `nodeIntegration: false` no Electron.
- Valide entradas importadas e aceite CSV, XLS e XLSX.
- Trate os lançamentos manuais como inteiros não negativos, incluindo zero.
- No fluxo manual, exija Marca e Loja por seleção; mantenha a lista de lojas derivada exclusivamente de `BRAND_STORES`.
- Mantenha `BRAND_MANAGERS` sincronizado com o cadastro oficial de responsáveis e derive o Gerente automaticamente a partir de Marca + Loja.
- Preserve regras históricas de gerente por `Competência + Marca + Loja`; para Maio/2026 use o mapeamento oficial documentado no `README.md` sem substituir o gerente corrente de outras competências.
- Exiba o Gerente em modo bloqueado no lançamento manual e na conferência de importação; nunca permita digitação manual.
- Mantenha `src/consultants.js` sincronizado com `data/Consultores.xlsx`, normalizando apenas aliases de loja documentados no código.
- Exija Consultor válido para liberar Passagens e Kits no lançamento manual; a seleção deve ser um `<select>` filtrado por Marca + Loja.
- Se a importação possuir coluna de Consultor, valide cada valor contra o cadastro da Marca + Loja; sem coluna, exija um Consultor único selecionado na conferência.
- Toda importação deve exigir Marca, Loja, Consultor (ou coluna de Consultor) e mapeamento de Passagens e Kits antes de habilitar **Concluir Importação**.
- Preserve `manager` e calcule `Parcial de Aproveitamento` como Kits Vendidos ÷ Passagens, exibindo percentual inteiro e `0%` quando Passagens for zero.
- Preserve o histórico financeiro local de Comissões em `senses-car-comissoes.json`, incluindo `competence`, `brand`, `store`, `managerId`, `managerName`, `commissionType`, `commissionValue`, `status`, `paymentDate`, `note` e `createdAt`; comissão fixa nunca pode ser derivada de Passagens, Kits, aproveitamento ou meta.
- Preserve `consultant`, `importedAt` e `importDate`; o dashboard deve permitir filtros por período, Marca, Loja, Gerente e Consultor e manter os gráficos consolidados.
- Mantenha a Visão Geral com acessos funcionais para Relatórios e Dashboard BI; ambos devem usar os mesmos registros e filtros oficiais.
- Preserve a meta oficial em `META_TARGET = 40`: `>= 40%` é **DENTRO DA META** (verde) e `< 40%` é **ABAIXO DA META** (vermelho), sem números fixos no ranking.
- O ranking deve agrupar Marca + Loja + Gerente e somar cada lancamento de Passagens uma vez; valores iguais em consultores diferentes nao sao deduplicados. Kits Vendidos permanecem somados por lancamento.
- Relatórios devem respeitar exatamente os filtros aplicados e exportar as colunas Data da Importação, Marca, Loja, Gerente, Consultor, Passagens, Kits Vendidos e % Aproveitamento em XLSX e PDF.
- O Dashboard BI deve recalcular indicadores, gráficos, ranking e detalhamento de consultores quando qualquer filtro for alterado; nunca usar dados fixos da imagem de referência.
- Aceite em Passagens e Kits Vendidos somente inteiros não negativos, incluindo zero.
- Preserve os campos estruturados `brand`, `store`, `passages`, `kits` e `date` em cada novo registro.
- Preserve compatibilidade com empacotamento portátil para Windows.
- Reutilize o asset global `public/senses-car-logo.png`/`src/assets/senses-car-logo-white.png` (branco transparente) no aplicativo e na extracao de resultados; use `senses-car-logo-black.png` somente quando um documento exigir fundo claro. Mantenha `build/senses-car-icon.png` no empacotamento.
- Nao transforme logo preta em branca via CSS, filtro, opacity, blend mode ou overlay; a cor deve estar no proprio PNG. Preserve a composicao original "senses / car / Tecnologia no Ar" e mantenha proporcoes com `object-fit: contain`.
- Preserve o conceito visual premium: azul-marinho profundo, grafite, off-white, vidro fosco discreto e imagens automotivas integradas por gradiente; não substituir a logo Senses Car por texto genérico.
- Ao alterar telas, mantenha as composições de imagem por contexto (`public/visuals/`) e a legibilidade de tabelas, números e filtros.
- Use o componente único `BrandLogo` e os assets locais de `src/assets/brands/` (mantendo `public/brands/` sincronizado) para Fiat, Jeep, Nissan e BYD; não crie logotipos fictícios ou desenhados manualmente. Prefira imports estáticos do bundle a URLs relativas em runtime.
- Nunca aplique `filter`, `opacity`, `mix-blend-mode`, overlay ou alteração de saturação nos elementos `.brand-logo img`; efeitos de seleção devem atingir somente o card e a borda, mantendo o fundo neutro.
- Mudanças visuais não podem alterar a sequência Marca → Loja → Gerente → Consultor → Passagens → Kits Vendidos nem os contratos de persistência, importação, ranking e relatórios.

## Verificação mínima

Execute `npm run dist` após toda modificação no sistema. Esse comando executa o build da interface e o empacotamento portátil para Windows. Use `npm run build` adicionalmente quando precisar validar apenas o bundle, mas nunca como substituto do rebuild completo.
