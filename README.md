# Byte & Blades // Cybershopping 3.0

Loja neon encostada na borda do sprawl, servindo como market mule para campanhas de Cyberpunk 2020. O front puxa inventário de JSON local, normaliza schemas mutantes e renderiza tudo em páginas estáticas sem backend.

## Sinal Forte

- Catálogo de cyberwares, acessórios, drogas e módulos extras (bundles e debug).
- Fluxo de chipware com subpáginas dedicadas para APTR, MRAM e Visual Recognition.
- Carrinho persistente em `localStorage` com export JSON e validações de consistência.
- Filtros por categoria, preço, HL, CIR e dificuldade no catálogo principal.
- Validação de dados via AJV + testes unitários para utilitários de core.

## Stack

- HTML estático (`index.html` + páginas em `html/`).
- CSS neon HUD em `css/styles.css`.
- JavaScript vanilla (`js/`) para fetch, normalização, renderização e carrinho.
- Node.js apenas para validação/testes e dependências de dev (`ajv`).

## Boot Sequence

1. Instale dependências:

   ```bash
   npm install
   ```

2. Rode as validações locais:

   ```bash
   npm run test
   npm run validate:data
   ```

3. Suba um servidor estático na raiz do projeto:

   ```bash
   python3 -m http.server
   ```

4. Acesse pelo browser:

   - `http://localhost:8000/index.html`

## Estrutura do Grid

- `html/cyberwares.html` – catálogo principal de implantes.
- `html/aptr-chips.html` – tabela APTR com seletor de nível e `ADD`.
- `html/mram-chips.html` – tabela MRAM com seletor de nível e `ADD`.
- `html/visual-rec-chips.html` – tabela Visual Recognition com regras por perfil.
- `html/accessories.html`, `html/drugs.html`, `html/weapons.html`, `html/cart.html`.
- `js/script.js` – render/filtros do catálogo e integração de compra.
- `js/cart.js` – totalização, export e avisos de consistência.
- `js/chip-rates.js` – render das tabelas APTR/MRAM/Visual.
- `data/cyberwares.json`, `data/equipment.json`, `data/drugs.json`, `data/chip-rates.json`.
- `manifest.webmanifest` – metadados PWA e atalhos rápidos.

## Notas de Dados

- O validador pode ignorar `weapons` quando o dataset estiver marcado como pendente.
- Sempre que alterar schemas ou datasets, rode `npm run validate:data` antes de commit.

## Contribuição

Quer injetar mais hardware? Cria branch, descreve escopo no PR e inclui evidência de validação (`test` + `validate:data`).

## Licença

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
Distribuído sob licença MIT.
