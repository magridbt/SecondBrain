# SecondBrain - Sri Amma Bhagavan

Plataforma de IA para a comunidade Oneness com os ensinamentos de Sri Amma Bhagavan.

## Requisitos

- Node.js 18+
- npm ou yarn

## Instalacao

```bash
# Instalar dependencias
npm install

# Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:3000

## Configuracao

O arquivo `.env.local` ja esta configurado com as credenciais.

## Estrutura

```
src/
├── app/                # Paginas Next.js
│   ├── api/           # API Routes
│   ├── app/           # Area logada
│   └── login/         # Autenticacao
├── components/        # Componentes React
└── lib/              # Utilitarios e configuracoes
```

## Funcionalidades

- Chat com IA baseado nos ensinamentos
- Sistema de convites por email
- Painel admin para gerenciar documentos
- Busca semantica nos ensinamentos

## Proximos Passos

1. Fazer upload de documentos (PDFs com ensinamentos)
2. Processar documentos para gerar embeddings
3. Convidar membros da comunidade
