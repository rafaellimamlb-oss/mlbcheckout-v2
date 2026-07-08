# Sistema de Conferência — App Web (Desktop + Android)

Este é um projeto **completo** — Vite + React + TypeScript + Tailwind — pronto
para rodar local ou publicar no Vercel. Nenhum passo de configuração de
scaffold é necessário além do Supabase.

## 1. Rode local primeiro (importante!)

Antes de tentar publicar, teste na sua máquina. Isso evita descobrir um erro de
configuração só depois do deploy.

```bash
npm install
cp .env.example .env
```

Abra o `.env` e preencha com os dados do seu projeto Supabase
(Project Settings → API):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-CHAVE-ANON-PUBLICA
```

Depois:

```bash
npm run dev
```

Abra `http://localhost:5173`. Se a tela de login aparecer, está tudo certo —
pode publicar. Se der erro no terminal ou tela branca, resolva aqui antes de
ir pro Vercel (o erro vai ser o mesmo nos dois lugares).

> Se ainda não rodou o `supabase/schema.sql` no SQL Editor do Supabase, faça
> isso antes — sem as tabelas `products` e `scans`, o login até funciona mas a
> tela de conferência vai dar erro.

## 2. Publicando no Vercel

1. Suba esta pasta para um repositório no GitHub (ou GitLab/Bitbucket).
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
   O Vercel detecta automaticamente que é um projeto Vite — não precisa mudar
   nenhuma configuração de build.
3. **Antes de clicar em Deploy**, abra a seção **Environment Variables** e adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (os mesmos valores do seu `.env` local — **isto é o passo mais esquecido** e
   causa tela branca porque o app trava de propósito se essas variáveis não
   existirem)
4. Deploy.

## 3. Se der tela branca mesmo assim

Abra o site publicado, aperte F12 → aba Console, e veja a mensagem de erro
em vermelho. As causas mais comuns:

- `Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY...` → variáveis de
  ambiente não foram salvas no Vercel (ou foram salvas com o nome errado).
- Erro de CORS ou 401 vindo do Supabase → confira se copiou a chave **anon
  public**, não a `service_role` (essa nunca deve ir para o front-end).
- Tela branca sem nenhum erro no console → geralmente é build antigo em cache;
  force um novo deploy em **Deployments → ⋯ → Redeploy**.

## Cadastro de usuários e produtos

Feito direto no painel do Supabase (não tem tela própria no app ainda):
- **Usuários**: Authentication → Users → Add user.
- **Produtos**: Table Editor → tabela `products` → Insert row (ou importar CSV
  para dentro da tabela).
