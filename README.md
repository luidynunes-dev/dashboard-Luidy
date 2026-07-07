# Dashboard GESTA - Aure Digital

Dashboard de performance para o Grupo GESTA (33 lojas) e clientes avulsos (11 lojas) da Aure Digital.

## Rodar localmente

**Pré-requisitos:** Node.js

1. Instalar dependências:
   `npm install`
2. Copiar `.env.example` para `.env.local` e preencher `GEMINI_API_KEY`
3. Criar `firebase-applet-config.json` na raiz (use `firebase-applet-config.example.json` como base) com as credenciais do SEU projeto Firebase
4. Preencher os Act IDs do Meta Ads em `src/config/metaAccounts.ts`
5. Preencher o histórico de vendas em `src/data/gesta.ts` e `src/data/avulsos.ts`
6. Rodar: `npm run dev`

## Deploy (Vercel)

1. Suba este repositório no GitHub
2. Importe o repositório na Vercel
3. Configure as variáveis de ambiente (`GEMINI_API_KEY`) nas configurações do projeto na Vercel
4. Adicione o conteúdo de `firebase-applet-config.json` como variável de ambiente ou faça upload seguro do arquivo (não commitar no Git)
