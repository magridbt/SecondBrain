# Design System Premium - Sri Amma Bhagavan

## Visão Geral

Este Design System implementa uma estética premium com paleta de cores **Branco e Dourado** (#d6b75f), utilizando técnicas avançadas de Tailwind CSS para criar uma experiência visual sofisticada e espiritual.

---

## Paleta de Cores

### Gold (Cor Principal)

| Shade | Hex | Uso |
|-------|-----|-----|
| gold-50 | `#fefcf3` | Backgrounds sutis, hovers |
| gold-100 | `#fdf8e3` | Backgrounds de cards |
| gold-200 | `#fbf0c4` | Bordas suaves |
| gold-300 | `#f6e29a` | Destaques |
| gold-400 | `#e8cb6e` | Gradientes secundários |
| **gold-500** | **`#d6b75f`** | **Cor principal - CTAs, links** |
| gold-600 | `#c4a24a` | Hovers de botões |
| gold-700 | `#a3863d` | Textos de ênfase |
| gold-800 | `#866c35` | Bordas dark mode |
| gold-900 | `#6e592d` | Backgrounds dark mode |

### Cores de Apoio

```css
/* Backgrounds */
--background-light: slate-50 (#f8fafc)
--background-dark: gray-900 (#111827)

/* Textos */
--text-primary: gray-800 / gray-100 (dark)
--text-secondary: gray-600 / gray-400 (dark)

/* Estados */
--error: red-500
--warning: yellow-500
--info: blue-500
```

---

## Tipografia

### Fonte Principal: Inter

```jsx
// layout.tsx
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
})
```

### Estilos de Texto

| Elemento | Classes |
|----------|---------|
| Título Principal | `text-3xl font-black tracking-tighter` |
| Subtítulo | `text-gold-600 font-medium` |
| Corpo | `text-gray-800 dark:text-gray-200` |
| Labels | `text-sm font-semibold text-gray-700` |
| Helper Text | `text-xs text-gray-400` |

---

## Cantos Arredondados

| Componente | Classes |
|------------|---------|
| Cards Premium | `rounded-[2rem]` ou `rounded-4xl` |
| Botões | `rounded-2xl` |
| Inputs | `rounded-xl` |
| Tags/Badges | `rounded-full` |
| Avatares | `rounded-2xl` ou `rounded-3xl` |

---

## Sombras

### Definições Customizadas

```js
// tailwind.config.js
boxShadow: {
  'gold': '0 4px 14px 0 rgba(214, 183, 95, 0.25)',
  'gold-lg': '0 10px 40px 0 rgba(214, 183, 95, 0.3)',
  'gold-xl': '0 20px 60px 0 rgba(214, 183, 95, 0.35)',
}
```

### Uso

| Estado | Classes |
|--------|---------|
| Default | `shadow-gold` |
| Hover | `hover:shadow-gold-lg` |
| Elevated | `shadow-gold-xl` |

### Inline Shadows (para cards grandes)

```jsx
style={{ boxShadow: '0 25px 60px -12px rgba(214, 183, 95, 0.2)' }}
```

---

## Botões

### Botão Primário (Gold)

```jsx
className="px-6 py-4 bg-gradient-to-r from-gold-500 to-gold-400
           hover:from-gold-600 hover:to-gold-500 text-white font-semibold
           rounded-2xl transition-all duration-300 shadow-gold-lg
           hover:shadow-gold-xl transform hover:-translate-y-0.5
           active:translate-y-0 disabled:opacity-50"
```

### Botão Secundário

```jsx
className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600
           dark:text-gray-300 rounded-xl hover:bg-gray-300
           dark:hover:bg-gray-600 transition-all duration-300"
```

### Botão Ghost

```jsx
className="p-2.5 text-gray-400 hover:text-gold-600
           dark:hover:text-gold-400 rounded-xl
           hover:bg-gold-50/50 dark:hover:bg-gold-900/20
           transition-all duration-200"
```

---

## Cards

### Card Premium

```jsx
className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
           rounded-[2rem] shadow-2xl p-8
           border border-gold-100/50 dark:border-gold-800/30"
style={{ boxShadow: '0 25px 60px -12px rgba(214, 183, 95, 0.2)' }}
```

### Card de Seção

```jsx
className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
           rounded-[2rem] border border-gold-100/50
           dark:border-gold-800/30 overflow-hidden shadow-lg"
style={{ boxShadow: '0 15px 40px -12px rgba(214, 183, 95, 0.15)' }}
```

---

## Inputs

### Input Premium

```jsx
className="w-full px-4 py-3.5 bg-white dark:bg-gray-800
           border border-slate-200 dark:border-gray-700 rounded-xl
           focus:ring-2 focus:ring-gold-400 dark:focus:ring-gold-600
           focus:border-transparent outline-none transition-all duration-300
           text-gray-900 dark:text-gray-100 placeholder-gray-400"
```

### Select Premium

```jsx
className="px-4 py-2 border border-gray-200 dark:border-gray-600
           rounded-lg focus:ring-2 focus:ring-gold-400
           focus:border-transparent outline-none bg-white
           dark:bg-gray-700 text-gray-800 dark:text-gray-200"
```

---

## Animações

### Definições CSS

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Classes Tailwind

```js
// tailwind.config.js
animation: {
  'fadeIn': 'fadeIn 0.4s ease-out',
  'slideUp': 'slideUp 0.4s ease-out',
  'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
}
```

### Uso

```jsx
// Fade in ao montar
className="animate-fadeIn"

// Slide up com delay
className="animate-slideUp"
style={{ animationDelay: '0.1s' }}

// Pulsação suave (para avatares/ícones)
className="animate-pulse-soft"
```

---

## Glassmorphism

### Glass Light

```jsx
className="backdrop-blur-xl bg-white/90 border border-gold-100/50"
```

### Glass Dark

```jsx
className="backdrop-blur-xl bg-gray-900/90 border border-gold-800/30"
```

---

## Avatar

### Avatar Grande (Login/Welcome)

```jsx
className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600
           rounded-full flex items-center justify-center shadow-gold-lg"
```

### Avatar Médio (Sidebar)

```jsx
className="w-11 h-11 bg-gradient-to-br from-gold-400 to-gold-600
           rounded-2xl flex items-center justify-center shadow-gold"
```

### Avatar Pequeno (Chat)

```jsx
className="w-10 h-10 rounded-2xl flex items-center justify-center
           bg-gradient-to-br from-gold-200 to-gold-300
           dark:from-gold-700 dark:to-gold-800"
```

---

## Mensagens de Chat

### Mensagem do Usuário

```jsx
className="bg-gradient-to-r from-gold-500 to-gold-400 text-white
           rounded-2xl rounded-br-md shadow-gold px-5 py-3.5"
```

### Mensagem do Assistente

```jsx
className="bg-white dark:bg-gray-900 border border-gold-100/50
           dark:border-gold-800/30 rounded-2xl rounded-bl-md
           text-gray-800 dark:text-gray-200 shadow-lg px-5 py-3.5"
style={{ boxShadow: '0 8px 30px -12px rgba(214, 183, 95, 0.15)' }}
```

---

## Navegação Ativa

### Item de Menu Ativo

```jsx
className="bg-gradient-to-r from-gold-500/10 to-gold-400/10
           text-gold-700 dark:text-gold-400
           border border-gold-200/50 dark:border-gold-700/30 shadow-sm"
```

### Item de Menu Inativo

```jsx
className="text-gray-600 dark:text-gray-400
           hover:bg-gold-50/50 dark:hover:bg-gold-900/20
           hover:text-gold-700 dark:hover:text-gold-400"
```

---

## Status Badges

| Status | Classes |
|--------|---------|
| Ativo/Sucesso | `bg-gold-100 text-gold-700` |
| Pendente | `bg-yellow-100 text-yellow-700` |
| Processando | `bg-blue-100 text-blue-700` |
| Erro | `bg-red-100 text-red-700` |
| Inativo | `bg-gray-100 text-gray-600` |

---

## Scrollbar Customizada

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #fefcf3; border-radius: 4px; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #e8cb6e 0%, #d6b75f 100%);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #d6b75f 0%, #c4a24a 100%);
}
```

---

## Dark Mode

O sistema suporta dark mode automaticamente através da classe `.dark` no `<html>`. Todas as cores possuem variantes dark mode definidas.

### Exemplo Completo

```jsx
className="bg-white dark:bg-gray-900
           text-gray-800 dark:text-gray-100
           border-gold-100/50 dark:border-gold-800/30"
```

---

## Estrutura de Arquivos

```
src/
├── app/
│   ├── globals.css          # Animações, glassmorphism, utilitários
│   └── layout.tsx           # Fonte Inter, background padrão
├── tailwind.config.js       # Paleta gold, sombras, animações
└── components/
    ├── Sidebar.tsx          # Navegação premium
    ├── ChatMessage.tsx      # Mensagens estilizadas
    └── ...
```

---

## Checklist de Implementação

- [x] Paleta de cores gold configurada no Tailwind
- [x] Fonte Inter com todos os pesos (400-900)
- [x] Animações fadeIn e slideUp
- [x] Sombras customizadas gold
- [x] Glassmorphism utilities
- [x] Scrollbar estilizada
- [x] Todos os componentes atualizados para gold
- [x] Dark mode completo
- [x] Documentação do Design System

---

## Manutenção

Ao adicionar novos componentes, siga estas diretrizes:

1. **Use as cores gold** para elementos interativos e destaques
2. **Use bordas semitransparentes** (`border-gold-100/50`)
3. **Aplique `rounded-xl` ou maior** para cantos arredondados
4. **Adicione transições** (`transition-all duration-300`)
5. **Inclua estados hover** com elevação ou mudança de cor
6. **Suporte dark mode** em todos os elementos
