# Projeto Hexis

## Setup

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
- Copie `.env.local.example` para `.env.local`
- Preencha com suas credenciais do Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Execute o projeto:
```bash
npm run dev
```

## FUNÇÃO 0.1 - Autenticação mínima

### Funcionalidades implementadas:
- Login com email e senha
- Logout
- Proteção básica de rotas (middleware)

### Teste manual:

1. Acesse `http://localhost:3000`
2. Você será redirecionado para `/login`
3. Faça login com um usuário do Supabase
4. Após login, será redirecionado para `/home`
5. Clique em "Sair" para fazer logout
6. Tente acessar `/home` diretamente sem estar logado - será redirecionado para `/login`

