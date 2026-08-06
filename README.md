# Byte & Blades

Loja estática bilíngue para campanhas de **Cyberpunk 2020**, apresentada como um DataTerm fora da rede. O site reúne ciberware, equipamentos, armas, munições, drogas, chips de perícia e pacotes prontos sem depender de backend ou banco de dados.

## Recursos

- Interface completa em `en-US` e `pt-BR`, com idioma persistido entre páginas e sessões.
- Catálogos de ciberware, equipamentos, armas, munições, drogas e chips de perícia.
- Filtros por categoria e atributos específicos de cada catálogo.
- Carrinho persistente em `localStorage`, com preço, Perda de Humanidade, avisos de consistência e exportação em JSON.
- Pacotes gerados com validação de dependências, provedores, capacidades e slots.
- Forja de drogas baseada nas tabelas de criação do sistema.
- Minigame de invasão do carrinho, login local por handle e console de diagnóstico.
- Manifestos PWA localizados e ícones em SVG e PNG.
- Schemas JSON, validação de build e suíte automatizada com limites obrigatórios de cobertura.

## Requisitos

- Node.js `20.19.0` ou superior dentro da linha 20, ou `22.12.0` ou superior.
- npm.
- Python 3 para os scripts de restauração e localização.
- Um navegador moderno.

O Node.js é usado apenas no desenvolvimento, nos testes e na geração do build. O site publicado é composto somente por arquivos estáticos.

## Início rápido

Instale as dependências:

```bash
npm ci
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra o endereço exibido pelo Vite. A entrada normal da aplicação é `login.html`.

Nenhuma conta é criada e nenhum dado é enviado a um servidor: o handle, o idioma e o carrinho permanecem no armazenamento local do navegador.

## Build de produção

Gere e valide a versão publicável:

```bash
npm run build
npm run validate
```

O resultado será criado em `dist/`. Para testá-lo localmente:

```bash
python3 -m http.server 8000 --directory dist
```

Depois, acesse `http://localhost:8000/login.html`.

O build copia os arquivos estáticos necessários sem modificar os datasets de origem. O conteúdo de `dist/` é gerado e não deve ser editado diretamente.

## Localização

O catálogo `en-US` é a fonte mecânica do projeto. As versões `pt-BR` preservam os mesmos IDs, preços, estatísticas, dependências e slots, alterando apenas o conteúdo visível.

Para regenerar todos os datasets brasileiros:

```bash
npm run localize:pt-BR
```

Também é possível regenerar um catálogo isoladamente:

```bash
npm run localize:cyberware:pt-BR
npm run localize:equipment:pt-BR
npm run localize:weapons:pt-BR
npm run localize:drugs:pt-BR
npm run localize:chips:pt-BR
```

No português brasileiro, a categoria editorial `APTR` é exibida como `PART`. A chave interna continua sendo `aptr` para preservar URLs, carrinho e compatibilidade entre idiomas.

Ao alterar um catálogo:

1. Edite a versão inglesa e mantenha os IDs estáveis.
2. Atualize a memória ou o script de localização correspondente.
3. Execute `npm run localize:pt-BR`.
4. Confirme a equivalência mecânica com `npm run test:all`.

## Dados e schemas

| Catálogo | EN-US | PT-BR | Schema |
| --- | --- | --- | --- |
| Ciberware | `data/cyberwares.json` | `data/cyberwares.pt-BR.json` | `data/cyberwares.schema.json` |
| Equipamentos | `data/equipment.json` | `data/equipment.pt-BR.json` | `data/equipment.schema.json` |
| Armas e munições | `data/weapons.json` | `data/weapons.pt-BR.json` | `data/weapons-store.schema.json` |
| Drogas | `data/drugs.json` | `data/drugs.pt-BR.json` | `data/drugs.schema.json` |
| Chips de perícia | `data/chip-rates.json` | `data/chip-rates.pt-BR.json` | `data/chip-rates.schema.json` |

Os schemas e os testes verificam tanto a validade individual dos arquivos quanto a equivalência estrutural e mecânica entre os idiomas.

## Testes e validação

O gate completo do projeto é:

```bash
npm run test:all
```

Esse comando executa:

1. verificação de sintaxe de todos os scripts;
2. validação dos datasets por schema;
3. testes funcionais e de integridade;
4. geração do build estático;
5. validação dos arquivos publicados;
6. suíte instrumentada de cobertura.

Os limites mínimos obrigatórios são:

- 99% das linhas;
- 80% dos ramos;
- 95% das funções.

Comandos auxiliares:

| Comando | Finalidade |
| --- | --- |
| `npm run check` | Sintaxe, datasets e testes rápidos |
| `npm run test:quick` | Testes sem instrumentação de cobertura |
| `npm test` | Testes com os limites obrigatórios de cobertura |
| `npm run build` | Gera `dist/` |
| `npm run validate` | Valida a estrutura e as referências do build |
| `npm run test:all` | Executa o gate completo |

## Estrutura do projeto

```text
assets/       Ícones e recursos visuais
css/          Identidade visual e layout
data/         Catálogos bilíngues e schemas JSON
html/         Catálogos, carrinho, pacotes e ferramentas
js/           Interface, regras do carrinho, i18n e validações
scripts/      Restauração, localização, build e validação
tests/        Testes de dados, componentes e fluxos do site
dist/         Build estático gerado
index.html    Página inicial
login.html    Entrada da aplicação
```

## Contribuição

Antes de abrir um pull request:

- não altere IDs existentes sem uma migração explícita;
- mantenha as versões `en-US` e `pt-BR` mecanicamente equivalentes;
- não edite arquivos em `dist/` manualmente;
- execute `npm run test:all` e inclua o resultado na descrição do PR.

## Licença e direitos

O código próprio do projeto é distribuído sob a licença [MIT](LICENSE).

Este é um projeto de fã, sem afiliação oficial. **Cyberpunk 2020** e o material de jogo relacionado pertencem aos respectivos detentores de direitos e não são licenciados pela MIT.
