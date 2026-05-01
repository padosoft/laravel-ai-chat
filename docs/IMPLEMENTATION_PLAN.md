# Implementation plan — `laravel-ai-chat`

> Demo open-source di una chat ChatGPT-like su **Laravel 13 + React + Vercel AI SDK**, alimentata da `laravel/ai` (SDK ufficiale) con `padosoft/laravel-ai-regolo` come provider di default (sovereign cloud italiano).
>
> **Documento operativo per un'AI esecutrice.** Ogni step è autocontenuto: percorsi file assoluti relativi alla repo, snippet copiabili, comandi runnabili. Quando un dettaglio è ambiguo, la voce porta esplicitamente *DECISIONE* con la scelta presa e il motivo.

---

## 0. Vincoli non negoziabili

1. **È una demo, non un'app enterprise.** Niente RAG, niente embeddings, niente reranking, niente PII redactor, niente activity log, niente refusal/confidence/citations. Se ti viene voglia di aggiungerlo: non aggiungerlo.
2. Riusa **lo shape**, non il volume, dei pattern di [`AskMyDocs`](file:///C:/Users/lopad/Documents/DocLore/Visual%20Basic/Ai/AskMyDocs) — copia struttura streaming + hook React, scarta tutto il resto.
3. README finale deve essere **WOW** stile [`padosoft/laravel-ai-regolo`](https://github.com/padosoft/laravel-ai-regolo) (badge, TOC, mermaid, screenshot, comparison table, sister-packages footer, "Made with ☕ in Italy"). Vedi §17.
4. Default provider: **Regolo** (`padosoft/laravel-ai-regolo`). OpenAI è opzionale, configurato ma commentato.
5. Licenza: **MIT** (più permissiva di Apache-2.0 di laravel-ai-regolo, scelta per massima adoption della demo).
6. **Non** usare `php artisan serve` per il deploy locale: usa **Laravel Sail** o **Herd** (lascia scelta al lettore nel README, ma documenta entrambe).

---

## 1. Stack & versioni target

| Layer | Tecnologia | Versione |
|-------|-----------|----------|
| Backend | PHP | `^8.3` |
| Backend | Laravel | `^13.0` |
| Backend | `laravel/ai` | `^0.6` |
| Backend | `padosoft/laravel-ai-regolo` | `^0.2` |
| Backend | `laravel/sanctum` | `^4.2` (solo per CSRF SPA, no API tokens) |
| DB | SQLite | (default; nessun bisogno di Postgres) |
| Frontend | React | `^18.3` |
| Frontend | TypeScript | `^5.6` |
| Frontend | `@ai-sdk/react` | `^3.0` |
| Frontend | `ai` | `^6.0` |
| Frontend | Vite | `^5.4` (via `laravel-vite-plugin`) |
| Frontend | Tailwind | `^3.4` |
| Frontend | `react-markdown` + `remark-gfm` | latest stabile |
| Test | PHPUnit | `^12` |
| Test | Vitest + Testing Library | `^2.x` |

> **DECISIONE — Tailwind v3, non v4.** AskMyDocs usa v3 e il tooling React di laravel/vite plugin oggi è più stabile su v3. Niente value-add a saltare a v4 in una demo.

> **DECISIONE — niente TanStack Router.** Single-page chat, una sola route. Usiamo solo `useState` per `activeConversationId`.

---

## 2. Prerequisiti runtime

- PHP 8.3+ con estensioni `sqlite3`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`.
- Composer 2.7+.
- Node 20+ (LTS) e npm 10+.
- Una API key Regolo (`rg_live_...`) — ottenibile su https://regolo.ai. **Senza key la demo si avvia ma il primo messaggio fallisce** — il README deve dirlo a chiare lettere.

---

## 3. Bootstrap del progetto

> Il repo attuale ha solo `README.md` + `LICENSE`. Lo skeleton Laravel va creato in-place.

**Step 3.1 — Skeleton Laravel 13:**

```powershell
# Eseguire dalla root del repo (C:\Users\lopad\Documents\DocLore\Visual Basic\Ai\laravel-ai-chat)
composer create-project laravel/laravel:^13.0 .tmp-laravel
# Spostare i contenuti senza schiacciare README.md / LICENSE già presenti
robocopy .tmp-laravel . /E /XF README.md LICENSE
Remove-Item .tmp-laravel -Recurse -Force
```

> **DECISIONE — preservare README.md e LICENSE esistenti.** Il README minimal corrente verrà sovrascritto allo step §17. La LICENSE va lasciata come marker MIT.

**Step 3.2 — Composer require:**

```bash
composer require laravel/ai:^0.6
composer require padosoft/laravel-ai-regolo:^0.2
composer require laravel/sanctum:^4.2
composer require --dev laravel/pint:^1.18
```

Pubblica `config/ai.php` (dal pacchetto `laravel/ai`):

```bash
php artisan vendor:publish --tag=ai-config
```

Pubblica e migra Sanctum:

```bash
php artisan install:api
php artisan migrate
```

**Step 3.3 — Frontend init:**

```bash
npm install
npm install -D @vitejs/plugin-react @types/react @types/react-dom \
  typescript tailwindcss postcss autoprefixer
npm install react@^18 react-dom@^18 \
  @ai-sdk/react@^3 ai@^6 \
  react-markdown@^10 remark-gfm@^4 \
  zustand@^5
npx tailwindcss init -p
```

> **DECISIONE — zustand vs useState/useReducer.** Per gestione di una eventuale sidebar conversazioni un store minimo zustand semplifica e basta uno store in tutto. Se preferisci zero dipendenze extra puoi usare `useState` liftato in `App.tsx` — è equivalente.

---

## 4. Configurazione

### 4.1 `.env` — chiavi rilevanti

```dotenv
APP_NAME="Laravel AI Chat Demo"
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
# Lascia DB_DATABASE vuoto: Laravel 13 default è database/database.sqlite

SESSION_DRIVER=database
SESSION_LIFETIME=120

# === laravel/ai ===
AI_DEFAULT_TEXT=regolo
AI_DEFAULT_EMBEDDINGS=regolo
AI_DEFAULT_RERANKING=regolo

# === Regolo provider ===
REGOLO_API_KEY=rg_live_REPLACE_ME
REGOLO_BASE_URL=https://api.regolo.ai/v1

# === Sanctum SPA ===
SANCTUM_STATEFUL_DOMAINS=localhost:8000,127.0.0.1:8000
SESSION_DOMAIN=localhost
```

> **DECISIONE — DB SQLite.** Zero setup, file singolo committabile in `.gitignore`. Conversazioni e messaggi sono <100 righe per demo.

### 4.2 `config/ai.php`

Sostituire il `providers` array generato dal publish con (mantieni i defaults agli env var):

```php
'providers' => [
    // Default — Regolo (Italian sovereign cloud)
    'regolo' => [
        'driver'  => 'regolo',
        'name'    => 'regolo',
        'key'     => env('REGOLO_API_KEY'),
        'url'     => env('REGOLO_BASE_URL', 'https://api.regolo.ai/v1'),
        'timeout' => 60,
        'models'  => [
            'text' => [
                'default'  => env('REGOLO_TEXT_MODEL', 'Llama-3.3-70B-Instruct'),
                'cheapest' => 'Llama-3.1-8B-Instruct',
                'smartest' => 'Llama-3.3-70B-Instruct',
            ],
            'embeddings' => ['default' => 'Qwen3-Embedding-8B', 'dimensions' => 4096],
            'reranking'  => ['default' => 'Qwen3-Reranker-4B'],
        ],
    ],

    // Optional fallback — uncomment + set OPENAI_API_KEY to compare
    // 'openai' => ['driver' => 'openai', 'key' => env('OPENAI_API_KEY')],
],

'defaults' => [
    'text'       => env('AI_DEFAULT_TEXT', 'regolo'),
    'embeddings' => env('AI_DEFAULT_EMBEDDINGS', 'regolo'),
    'reranking'  => env('AI_DEFAULT_RERANKING', 'regolo'),
],
```

### 4.3 `config/sanctum.php`

Lascia default; conferma `stateful` legge da `SANCTUM_STATEFUL_DOMAINS`. La demo non usa token API, solo cookie session.

### 4.4 `bootstrap/app.php`

Aggiungi il middleware Sanctum SPA al gruppo `api`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->statefulApi();
})
```

### 4.5 `vite.config.js`

```js
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
});
```

### 4.6 `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './resources/**/*.blade.php',
    './resources/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
};
```

### 4.7 `tsconfig.json`

Crea alla root:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": { "@/*": ["resources/js/*"] }
  },
  "include": ["resources/js"]
}
```

---

## 5. Modello dati

> **DECISIONE — schema minimale.** Solo `conversations` e `messages`. Niente users (Sanctum SPA non richiede tabella users custom — usa `users` default Laravel). Per la demo si può saltare auth e legare conversazioni a `session_id` dal cookie. Più semplice.

### 5.1 Migration `database/migrations/2026_05_01_000001_create_conversations_table.php`

```php
Schema::create('conversations', function (Blueprint $table) {
    $table->id();
    $table->string('session_id', 36)->index(); // bind a session cookie, no auth richiesta
    $table->string('title')->default('New chat');
    $table->timestamps();
});
```

### 5.2 Migration `database/migrations/2026_05_01_000002_create_messages_table.php`

```php
Schema::create('messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
    $table->enum('role', ['user', 'assistant']);
    $table->longText('content');
    $table->json('artifacts')->nullable(); // tool-call results serializzati
    $table->timestamps();
});
```

### 5.3 Modelli

`app/Models/Conversation.php`:

```php
class Conversation extends Model
{
    protected $fillable = ['session_id', 'title'];
    public function messages() { return $this->hasMany(Message::class)->orderBy('created_at'); }
}
```

`app/Models/Message.php`:

```php
class Message extends Model
{
    protected $fillable = ['conversation_id', 'role', 'content', 'artifacts'];
    protected $casts = ['artifacts' => 'array'];
    public function conversation() { return $this->belongsTo(Conversation::class); }
}
```

---

## 6. Backend — Tool definitions (artifact stubs)

> Ogni tool è un piccolo handler deterministico che restituisce un payload JSON. Il modello LLM lo invoca quando la domanda matcha; il frontend lo renderizza come "artifact card". I tool **NON** chiamano API esterne — sono stub fissi (perché è una demo).

Cartella: `app/Ai/Tools/`.

### 6.1 `app/Ai/Tools/ShowImageTool.php`

```php
namespace App\Ai\Tools;

use Illuminate\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request as ToolRequest;

class ShowImageTool implements Tool
{
    public function description(): string
    {
        return 'Show an inline image artifact. Call this when the user asks to see/show/display a picture/photo/image of something.';
    }

    public function schema(JsonSchema $schema): array
    {
        return $schema->object()
            ->property('subject', $schema->string()->required()
                ->description('Short subject of the image, e.g. "Colosseum at sunset".'))
            ->property('caption', $schema->string()
                ->description('Optional caption rendered below the image.'))
            ->toArray();
    }

    public function handle(ToolRequest $request): string
    {
        $subject = (string) ($request->arguments['subject'] ?? 'demo');
        $caption = (string) ($request->arguments['caption'] ?? '');

        // Stub deterministico: usa Picsum con un seed dal subject hash
        $seed = substr(md5($subject), 0, 8);
        return json_encode([
            '__artifact' => 'image',
            'url'        => "https://picsum.photos/seed/{$seed}/800/450",
            'alt'        => $subject,
            'caption'    => $caption !== '' ? $caption : $subject,
        ]);
    }
}
```

### 6.2 `app/Ai/Tools/ShowDocTool.php`

```php
public function description(): string
{
    return 'Show a document card artifact. Call this when the user asks for a document, PDF, contract sample, or similar file reference.';
}

public function handle(ToolRequest $request): string
{
    return json_encode([
        '__artifact' => 'doc',
        'title'    => (string) $request->arguments['title'],
        'mime'     => 'application/pdf',
        'pages'    => (int) ($request->arguments['pages'] ?? 4),
        'snippet'  => (string) ($request->arguments['snippet'] ?? 'Demo document — content not available in the demo.'),
        'fakeUrl'  => '#demo-doc',
    ]);
}
```

### 6.3 `app/Ai/Tools/ListLinksTool.php`

Restituisce `__artifact: 'links'`, payload `links: [{ title, url, description }]`. Stub: lista hardcoded di 3-5 link Padosoft / Regolo / Laravel docs in base al `topic` argomento.

### 6.4 `app/Ai/Tools/CodeSnippetTool.php`

Restituisce `__artifact: 'code'`, payload `{ language, code }`. Stub: per `language=php`, `language=ts`, `language=bash` snippet pre-confezionati prendendo il `topic` come header del commento.

### 6.5 `app/Ai/Tools/DataTableTool.php`

Restituisce `__artifact: 'table'`, payload `{ columns, rows }`. Stub: lista top-5 modelli Regolo (catalogo statico):

```php
return json_encode([
    '__artifact' => 'table',
    'columns'    => ['Model', 'Family', 'Context', 'Hosted in'],
    'rows'       => [
        ['Llama-3.3-70B-Instruct', 'Meta Llama', '128k', '🇮🇹 Italy'],
        ['Qwen3-Embedding-8B',     'Alibaba Qwen', '8k', '🇮🇹 Italy'],
        ['Qwen-Image',             'Alibaba Qwen', 'n/a', '🇮🇹 Italy'],
        ['faster-whisper-large-v3','OpenAI Whisper', 'n/a', '🇮🇹 Italy'],
        ['Mistral-7B-Instruct',    'Mistral', '32k', '🇮🇹 Italy'],
    ],
]);
```

> **Nota wire-format.** L'output di un Tool nel SDK `laravel/ai` viene incorporato nel transcript come `tool-result` part. Quando si usa `usingVercelDataProtocol()`, la SDK serializza automaticamente il `tool-call` + `tool-result` come parts compatibili con `@ai-sdk/react` v6 (`UIMessage.parts[]` con `type: 'tool-<name>'`, `state: 'output-available'`, `output: <stringJSON>`). Il frontend non deve fare altro che riconoscere i parts tool e parsare l'`output`. Se il modello scelto **non** supporta tool calling nativo, `laravel/ai` fa fallback ReAct-style — il pattern è lo stesso lato frontend.

---

## 7. Backend — Controller streaming

### 7.1 Pattern di riferimento

Sorgente: [`AskMyDocs/app/Http/Controllers/Api/MessageStreamController.php`](file:///C:/Users/lopad/Documents/DocLore/Visual%20Basic/Ai/AskMyDocs/app/Http/Controllers/Api/MessageStreamController.php).

**Cosa riusiamo:**
- L'idea di persistere il messaggio user *prima* dello stream;
- L'idea di persistere l'assistant *dopo* la chiusura dello stream, accumulando `text-delta` in un buffer;
- Headers SSE corretti (`Content-Type: text/event-stream; charset=UTF-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, `Connection: keep-alive`);
- `$request->session()->save()` *prima* del callback per liberare il session lock e non bloccare richieste concorrenti.

**Cosa scartiamo:**
- KbSearchService, RetrievalFilters, ConfidenceCalculator, ChatLogManager, FewShotService, refusal sentinels, citations, sentinel detection. **Niente di tutto questo.**

### 7.2 Versione "easy mode" raccomandata per la demo

Dato che `padosoft/laravel-ai-regolo` espone già `Agent::stream()->usingVercelDataProtocol()`, **possiamo evitare totalmente di ricostruire l'envelope SDK v6 a mano**. Il framework lo fa per noi.

Crea `app/Http/Controllers/Api/ChatStreamController.php`:

```php
namespace App\Http\Controllers\Api;

use App\Ai\Tools\CodeSnippetTool;
use App\Ai\Tools\DataTableTool;
use App\Ai\Tools\ListLinksTool;
use App\Ai\Tools\ShowDocTool;
use App\Ai\Tools\ShowImageTool;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Laravel\Ai\Agent;
use Symfony\Component\HttpFoundation\Response;

class ChatStreamController extends Controller
{
    public function store(Request $request): Response
    {
        $validated = $request->validate([
            'content'         => ['required', 'string', 'max:4000'],
            'conversation_id' => ['nullable', 'integer', 'exists:conversations,id'],
        ]);

        $sessionId = $request->session()->getId();

        $conversation = $validated['conversation_id']
            ? Conversation::where('session_id', $sessionId)->findOrFail($validated['conversation_id'])
            : Conversation::create([
                'session_id' => $sessionId,
                'title'      => Str::limit($validated['content'], 60, '…'),
            ]);

        // Persist user message PRIMA dello stream
        $conversation->messages()->create([
            'role'    => 'user',
            'content' => $validated['content'],
        ]);

        $history = $conversation->messages()
            ->get(['role', 'content'])
            ->map(fn (Message $m) => ['role' => $m->role, 'content' => $m->content])
            ->all();

        $systemPrompt = view('prompts.system')->render();

        // Libera il session lock prima dello stream long-lived
        $request->session()->save();

        return Agent::for(end($history)['content'])
            ->withSystemPrompt($systemPrompt)
            ->withMessages(array_slice($history, 0, -1))   // history senza l'ultimo turn
            ->using('regolo')
            ->withTool(new ShowImageTool())
            ->withTool(new ShowDocTool())
            ->withTool(new ListLinksTool())
            ->withTool(new CodeSnippetTool())
            ->withTool(new DataTableTool())
            ->stream()
            ->usingVercelDataProtocol()
            ->onFinish(function ($result) use ($conversation) {
                // $result è il VercelStreamResult — espone ->text e i tool-results
                // (riferimento README laravel-ai-regolo: "usingVercelDataProtocol()")
                $artifacts = collect($result->toolResults ?? [])
                    ->map(fn ($r) => json_decode($r->output, true))
                    ->filter()
                    ->values()
                    ->all();

                $conversation->messages()->create([
                    'role'      => 'assistant',
                    'content'   => $result->text ?? '',
                    'artifacts' => $artifacts ?: null,
                ]);
                $conversation->touch();
            });
    }

    public function index(Request $request)
    {
        $sessionId = $request->session()->getId();
        return Conversation::where('session_id', $sessionId)
            ->orderByDesc('updated_at')
            ->with(['messages' => fn ($q) => $q->select('id', 'conversation_id', 'role', 'content', 'artifacts', 'created_at')])
            ->get();
    }
}
```

> **VERIFICA — firma esatta `onFinish`/`toolResults`.** Prima di scrivere il codice, l'AI esecutrice DEVE confermare la firma esatta delle API streaming consultando:
> 1. Context7: `mcp__context7__query-docs` con query "laravel/ai stream usingVercelDataProtocol onFinish toolResults".
> 2. La docs ufficiale: https://laravel.com/docs/ai-sdk (sezione streaming).
> 3. Il sorgente vendor in [`laravel-ai-regolo/vendor/laravel/ai/src/`](file:///C:/Users/lopad/Documents/DocLore/Visual%20Basic/Ai/padosoft-laravel-ai-regolo/vendor/laravel/ai/src/).
>
> Se la firma differisce, **adatta lo snippet** (ad es. `onFinish(function ($result) ...)` potrebbe essere `->finish()` o richiedere un callback diverso). Il principio resta: persisti il messaggio assistant *dopo* la chiusura dello stream, includendo i tool-results raccolti.
>
> Se per qualunque ragione `usingVercelDataProtocol()` non espone i tool-results lato server, il fallback è iterare manualmente lo stream come fa AskMyDocs (`MessageStreamController.php:421-434`) accumulando `text-delta` e `tool-call`/`tool-result` chunks. Per la demo questa è una via meno preferita ma funzionale.

### 7.3 System prompt

`resources/views/prompts/system.blade.php` (testo, niente Blade variables):

```
You are a friendly demo assistant for the "Laravel AI Chat" example app.
You are powered by Regolo (Italian sovereign AI cloud) via the official `laravel/ai` SDK.

When the user asks for any of the following, CALL the matching tool instead of describing in prose:
  • show/display a picture/image/photo of X        → call ShowImage
  • give/show me a document/PDF/contract about X   → call ShowDoc
  • list links/resources/references about X        → call ListLinks
  • give me a code example/snippet in <lang>       → call CodeSnippet
  • show a table/comparison/list of X              → call DataTable

Otherwise answer concisely in plain text (markdown allowed). Italian or English depending on the user.
Never invent tool names. Never describe an artifact in prose if a tool can produce it.
```

### 7.4 Routes

`routes/api.php`:

```php
use App\Http\Controllers\Api\ChatStreamController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web'])->group(function () {
    Route::get('/conversations', [ChatStreamController::class, 'index']);
    Route::post('/chat/stream', [ChatStreamController::class, 'store']);
});
```

> **DECISIONE — `web` middleware sulle route API.** SPA same-origin, useChat() manda cookie session via `credentials: 'same-origin'`. Niente API tokens.

---

## 8. Frontend — entry point + layout

### 8.1 `resources/views/app.blade.php`

```blade
<!doctype html>
<html lang="it" class="h-full">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Laravel AI Chat — Demo</title>
  <meta name="csrf-token" content="{{ csrf_token() }}">
  @vite(['resources/css/app.css', 'resources/js/app.tsx'])
</head>
<body class="h-full bg-zinc-50 text-zinc-900 antialiased">
  <div id="app" class="h-full"></div>
</body>
</html>
```

### 8.2 `routes/web.php`

```php
Route::get('/{any?}', fn () => view('app'))->where('any', '.*');
```

### 8.3 `resources/js/app.tsx`

```tsx
import { createRoot } from 'react-dom/client';
import { ChatApp } from './ChatApp';

const el = document.getElementById('app');
if (el) createRoot(el).render(<ChatApp />);
```

### 8.4 `resources/css/app.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bubble-user: #2563eb;
  --bubble-assistant: #ffffff;
}
```

---

## 9. Frontend — `useChatStream` hook

Crea `resources/js/lib/use-chat-stream.ts`. È una versione *snella* di [`AskMyDocs/frontend/src/features/chat/use-chat-stream.ts`](file:///C:/Users/lopad/Documents/DocLore/Visual%20Basic/Ai/AskMyDocs/frontend/src/features/chat/use-chat-stream.ts).

```ts
import { useEffect, useMemo } from 'react';
import { useChat as sdkUseChat, type UseChatHelpers } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';

function readXsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split(';').map(r => r.trim()).find(r => r.startsWith('XSRF-TOKEN='));
  return match ? decodeURIComponent(match.slice('XSRF-TOKEN='.length)) : null;
}

let csrfPrimed: Promise<void> | null = null;
function ensureCsrf(): Promise<void> {
  if (csrfPrimed) return csrfPrimed;
  csrfPrimed = fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' }).then(() => undefined);
  return csrfPrimed;
}

export function useChatStream(conversationId: number | null): UseChatHelpers<UIMessage> {
  useEffect(() => { void ensureCsrf(); }, []);

  const transport = useMemo(() => new DefaultChatTransport<UIMessage>({
    api: '/api/chat/stream',
    credentials: 'same-origin',
    prepareSendMessagesRequest: ({ messages }) => {
      const last = messages[messages.length - 1];
      const content = last?.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map(p => p.text).join('') ?? '';
      const headers: Record<string, string> = {
        Accept: 'text/event-stream, application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      const xsrf = readXsrfCookie();
      if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
      return {
        body: { content, conversation_id: conversationId },
        headers,
      };
    },
  }), [conversationId]);

  return sdkUseChat<UIMessage>({
    id: conversationId ? `conv-${conversationId}` : 'new',
    transport,
  });
}
```

**Differenze rispetto ad AskMyDocs:**
- Nessun `filters` ref (non abbiamo retrieval filters);
- Endpoint fisso `/api/chat/stream` (non per-conversation URL);
- `conversation_id` viaggia nel body, non nell'URL;
- Niente `initialMessages` mapping (per la demo serializziamo da `/api/conversations` con un piccolo `useEffect` se vogliamo ripristinare la cronologia, ma è opzionale).

---

## 10. Frontend — Chat layout

### 10.1 Componente root `resources/js/ChatApp.tsx`

Struttura:

```tsx
import { useState } from 'react';
import { useChatStream } from './lib/use-chat-stream';
import { MessageThread } from './components/MessageThread';
import { Composer } from './components/Composer';
import { SuggestedPrompts } from './components/SuggestedPrompts';

export function ChatApp() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const chat = useChatStream(conversationId);
  const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';
  const isEmpty = chat.messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500">🇮🇹 powered by Regolo · Llama-3.3-70B-Instruct</span>
        </div>
      </header>

      {/* Thread (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-6">
            <h1 className="text-2xl font-semibold">Cosa vuoi vedere oggi?</h1>
            <SuggestedPrompts onPick={(text) => chat.sendMessage({ text })} />
          </div>
        ) : (
          <MessageThread messages={chat.messages} isStreaming={isStreaming} />
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200 bg-white px-6 py-4">
        <Composer
          onSend={(text) => chat.sendMessage({ text })}
          onStop={chat.stop}
          isStreaming={isStreaming}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
```

### 10.2 `components/SuggestedPrompts.tsx`

Pills cliccabili che invocano `onPick(text)`. Lista hardcoded di 5 prompt che mappano 1-to-1 sui 5 tool:

```ts
const PROMPTS = [
  '🖼️ Mostrami una foto del Colosseo al tramonto',
  '📄 Dammi un documento di esempio su un contratto NDA',
  '🔗 Linkami le risorse principali di Regolo.ai',
  '💻 Mostrami uno snippet PHP che chiama laravel/ai',
  '📊 Tabella dei top 5 modelli del catalogo Regolo',
];
```

### 10.3 `components/MessageThread.tsx` + `MessageBubble.tsx`

`MessageThread` mappa `messages: UIMessage[]` su `<MessageBubble>`. `MessageBubble`:

- Layout: user a destra (bubble blu), assistant a sinistra (bubble bianca con bordo);
- Per ogni `part` in `message.parts`:
  - `type === 'text'` → render con `<ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>`;
  - `type === 'tool-ShowImage'` (oppure il pattern che `laravel/ai` usa per i tool — verifica con context7) e `state === 'output-available'` → parsa `JSON.parse(part.output)` e renderizza `<ImageArtifact />`;
  - Stesso per `tool-ShowDoc`, `tool-ListLinks`, `tool-CodeSnippet`, `tool-DataTable`.

> **DECISIONE — naming dei tool parts.** La SDK Vercel v6 espone tool parts con `type: 'tool-<name>'` dove `<name>` matcha il nome del tool registrato. Verifica il naming esatto che `laravel/ai` emette (potrebbe lowercase / kebab-case). In caso di mismatch, normalizza nel componente: `if (part.type.startsWith('tool-')) { ... }`.

### 10.4 `components/Composer.tsx`

Textarea autoresize + submit on Enter (Shift+Enter newline). Stop button quando `isStreaming === true`. Niente upload file (demo).

---

## 11. Frontend — Artifact components

Cartella: `resources/js/components/artifacts/`.

### 11.1 `ImageArtifact.tsx`

```tsx
type Props = { url: string; alt: string; caption?: string };
export function ImageArtifact({ url, alt, caption }: Props) {
  return (
    <figure className="my-2 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
      <img src={url} alt={alt} className="h-auto w-full" loading="lazy" />
      {caption && <figcaption className="px-3 py-2 text-xs text-zinc-600">{caption}</figcaption>}
    </figure>
  );
}
```

### 11.2 `DocArtifact.tsx`

Card con icona doc, titolo, mime, "X pages", snippet, bottone fake "Open document" (href `#demo-doc`).

### 11.3 `LinkArtifact.tsx`

Lista verticale di card link (titolo + url + descrizione + favicon via `https://www.google.com/s2/favicons?domain=...`).

### 11.4 `CodeArtifact.tsx`

Code block con `<pre><code>`, header con language label + bottone "Copy" che chiama `navigator.clipboard.writeText(code)`.

> **DECISIONE — niente highlighter per la demo.** `react-syntax-highlighter` aggiunge ~200KB. Lasciamo `<pre>` plain con classe Tailwind `font-mono`. Se vuoi syntax highlighting, aggiungi `shiki` o `prism-react-renderer` come optional follow-up.

### 11.5 `TableArtifact.tsx`

`<table>` con `<thead>` + `<tbody>` + Tailwind classes (`text-sm`, bordi orizzontali leggeri).

### 11.6 Dispatcher

`components/artifacts/index.tsx` esporta una funzione `renderArtifact(payload: any)` che switcha su `payload.__artifact` e ritorna il componente giusto. Il `MessageBubble` la chiama dopo `JSON.parse(part.output)`.

---

## 12. Stile visivo — bersaglio "ChatGPT-like"

Riferimento estetico: ChatGPT desktop. Caratteristiche minime:

- Background neutro chiaro (`bg-zinc-50`); thread max-width `768px` centered;
- User bubble: blu primario, testo bianco, allineata a destra, padding `px-4 py-3`, radius `rounded-2xl rounded-br-sm`;
- Assistant bubble: bianca, bordo `border-zinc-200`, allineata a sinistra, stesso padding/radius (mirrored);
- Nessuna avatar — basta un piccolo "AI" / "You" label in `text-xs text-zinc-500` sopra la bubble;
- Markdown renderizzato con stile pulito: `prose prose-zinc max-w-none` (richiede `@tailwindcss/typography`, vedi sotto);
- Composer: card sticky in fondo con shadow `shadow-sm`, textarea trasparente, button send circolare blu;
- Suggested prompts pills: `rounded-full border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 transition`.

Aggiungi plugin Tailwind typography:

```bash
npm install -D @tailwindcss/typography
```

E in `tailwind.config.js` `plugins: [require('@tailwindcss/typography')]`.

> **DECISIONE — niente dark mode nella demo.** Aggiunge complessità e variabili CSS, e questo è uno scope "5-minuti dimostrativo". Il README può menzionare "PR welcome".

---

## 13. Test minimi

> **DECISIONE — test necessari, non sufficienti.** Una demo non ha bisogno di una test suite enterprise, ma due test sono utili per confermare il wiring chiave.

### 13.1 PHPUnit feature test

`tests/Feature/Api/ChatStreamControllerTest.php`:

```php
public function test_post_chat_stream_creates_conversation_and_persists_user_message(): void
{
    Http::fake([
        'api.regolo.ai/*' => Http::response([
            'choices' => [['message' => ['role' => 'assistant', 'content' => 'Hi from Regolo.']]],
            'usage'   => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
        ]),
    ]);

    $response = $this->withSession([])
        ->post('/api/chat/stream', ['content' => 'Ciao']);

    $response->assertStatus(200)
        ->assertHeader('Content-Type', 'text/event-stream; charset=UTF-8');

    $this->assertDatabaseHas('conversations', ['title' => 'Ciao']);
    $this->assertDatabaseHas('messages', ['role' => 'user', 'content' => 'Ciao']);
}
```

> Per testare lo stream completo (text-delta + finish) servono i fixture `Http::fakeSequence()` con SSE chunks. Per la demo basta confermare endpoint + persistence; il flow real-stream lo si verifica a mano.

### 13.2 Vitest test

`resources/js/lib/use-chat-stream.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// … mock fetch, instanzia DefaultChatTransport via prepareSendMessagesRequest,
// asserisci che il body abbia { content, conversation_id } e l'header X-XSRF-TOKEN
// quando il cookie è settato.
```

Setup: `vitest.config.ts` con `environment: 'jsdom'`.

---

## 14. Run flow (per il README quickstart)

```bash
# 1. Backend
cp .env.example .env
php artisan key:generate
# Imposta REGOLO_API_KEY nel .env
php artisan migrate

# 2. Frontend
npm install
npm run build      # o `npm run dev` per HMR

# 3. Server
php artisan serve  # http://localhost:8000

# 4. Browser
open http://localhost:8000
# → cliccare un suggested prompt o digitare "Mostrami una foto del Colosseo"
```

---

## 15. Acceptance criteria (Definition of Done)

L'AI esecutrice considera il task completo SE E SOLO SE:

- [ ] `composer install` + `npm install` + `php artisan migrate` + `npm run build` + `php artisan serve` partono senza errori da clean clone.
- [ ] Aprendo `http://localhost:8000` su un Chrome qualsiasi appare la home con titolo "Cosa vuoi vedere oggi?" e 5 suggested prompts pills.
- [ ] Cliccando su "🖼️ Mostrami una foto del Colosseo al tramonto", appare la bubble user, poi la bubble assistant si popola progressivamente in streaming, e quando il modello chiama `ShowImage`, sotto il testo appare la `ImageArtifact` card con un'immagine Picsum.
- [ ] Stesso per gli altri 4 prompts (doc, links, code, table).
- [ ] Refresh della pagina: la conversazione precedente è ancora visibile (caricata da `/api/conversations` filtrate per `session_id`).
- [ ] Aprendo DevTools → Network: `/api/chat/stream` ha `Content-Type: text/event-stream; charset=UTF-8`, body è una sequenza di SSE frames `data: ...\n\n`.
- [ ] Niente errore in console JS, niente warning React, niente N+1 (le query DB sono < 10 per turn).
- [ ] `vendor/bin/phpunit` passa (almeno il test del §13.1).
- [ ] `npm run test` passa (almeno il test del §13.2).
- [ ] `vendor/bin/pint --test` clean. `npx tsc --noEmit` clean.
- [ ] Senza `REGOLO_API_KEY`: la chat mostra un errore comprensibile (es. "Regolo API key not configured") senza crashare il backend.
- [ ] README finale conforme al §17 (badge + TOC + screenshot + sections complete).

---

## 16. Layout finale del repo (dopo l'implementazione)

```
laravel-ai-chat/
├── app/
│   ├── Ai/Tools/
│   │   ├── CodeSnippetTool.php
│   │   ├── DataTableTool.php
│   │   ├── ListLinksTool.php
│   │   ├── ShowDocTool.php
│   │   └── ShowImageTool.php
│   ├── Http/Controllers/Api/ChatStreamController.php
│   └── Models/{Conversation.php,Message.php}
├── config/ai.php           # con providers.regolo + defaults
├── database/migrations/    # conversations + messages
├── docs/IMPLEMENTATION_PLAN.md   # questo file
├── resources/
│   ├── css/app.css
│   ├── js/
│   │   ├── ChatApp.tsx
│   │   ├── app.tsx
│   │   ├── components/
│   │   │   ├── Composer.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageThread.tsx
│   │   │   ├── SuggestedPrompts.tsx
│   │   │   └── artifacts/{Image,Doc,Link,Code,Table}Artifact.tsx + index.tsx
│   │   └── lib/use-chat-stream.ts
│   └── views/{app.blade.php,prompts/system.blade.php}
├── routes/{api.php,web.php}
├── tests/{Feature,Unit}/   # i 2 test minimi
├── README.md               # WOW (§17)
├── LICENSE                 # MIT
├── package.json
├── composer.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.js
└── postcss.config.js
```

---

## 17. README "WOW" — specifica del file finale

> **NON è negoziabile.** Bersaglio: stesso bar di [`padosoft/laravel-ai-regolo` README](https://github.com/padosoft/laravel-ai-regolo#readme).

### 17.1 Sezioni obbligatorie (ordine)

1. **Hero** — `<h1 align="center">laravel-ai-chat</h1>` + tagline ("The fastest way to ship a ChatGPT-like demo on the official Laravel AI SDK with Italian sovereign cloud").
2. **Badges row** — CI status (anche se è solo lint), Packagist (n/a se non pubblicato — usare GitHub stars), license MIT, PHP version, Laravel version, Node version.
3. **Hero screenshot / GIF** — `resources/banner.png` o GIF 800px con la chat in streaming + un artifact visibile. **Obbligatoria** (la community valuta in primis l'estetica).
4. **Table of contents.**
5. **Why this demo** — 3-5 punti: showcase di `laravel/ai` v0.6, Regolo come default sovereign provider, Vercel AI SDK UI, artifacts inline, copia-incolla starter.
6. **Architecture** — mermaid diagram (browser → React + `@ai-sdk/react` `useChat()` → POST `/api/chat/stream` → `ChatStreamController` → `Agent::stream()->usingVercelDataProtocol()` → `padosoft/laravel-ai-regolo` → `api.regolo.ai/v1`). Stesso stile mermaid del README laravel-ai-regolo.
7. **Tech stack table** — colonne `Layer | Tech | Version | Why`.
8. **What you get out of the box** — bullet list: streaming token-by-token, 5 artifact types, conversation persistence per session, dark-mode-ready (anche se non incluso), TypeScript strict, Tailwind, Vite HMR.
9. **Demo prompts to try** — i 5 prompts con screenshot dell'output di ognuno (o ASCII mock se gli screenshot non sono ancora pronti).
10. **Quick start (5 minutes)** — esattamente i comandi del §14.
11. **Configuration** — tabella env vars (key, default, note). Riprende il pattern di laravel-ai-regolo.
12. **How streaming works** — sezione tecnica con il diagramma del flow SSE + tool-result parts. Crediti espliciti a `padosoft/laravel-ai-regolo`'s `usingVercelDataProtocol()`.
13. **Customizing the artifacts** — istruzioni per aggiungere un sesto tool/artifact (esempio: "MapArtifact").
14. **Switching to OpenAI / Anthropic / etc.** — un blocco di 5 righe `composer require` + env var swap. Punto-chiave del valore di `laravel/ai`: stesso codice, provider intercambiabile.
15. **Testing** — `vendor/bin/phpunit`, `npm run test`. Una riga sull'opt-in live test contro Regolo (riprende il pattern di laravel-ai-regolo).
16. **Roadmap** — tabella con `v0.1 (this) | v0.2 (auth multi-user) | v0.3 (RAG via AskMyDocs) | v1.0`.
17. **Contributing** — fork → branch `feature/*` → PR. Link al CONTRIBUTING.md (ne crei uno minimo da copiare da laravel-ai-regolo).
18. **Security** — email security@padosoft.com, no public issues for vulns.
19. **License & credits** — MIT, "Made with ☕ in Italy by [Padosoft](https://padosoft.com)".
20. **Sister packages** — bullet list dei repo Padosoft (laravel-ai-regolo, laravel-flow, eval-harness, laravel-pii-redactor, AskMyDocs).

### 17.2 Tono di voce

- Concreto, opinionated, frasi corte;
- Ogni feature paga il suo posto in pagina spiegando *perché esiste*, non solo *cosa fa*;
- Quando esiste una "decisione di design", esplicitarla (es. "We chose Tailwind v3 over v4 because…");
- Niente "AI buzzword soup". Linguaggio da engineer per engineer.

### 17.3 Link e riferimenti obbligatori

- https://github.com/padosoft/laravel-ai-regolo
- https://packagist.org/packages/padosoft/laravel-ai-regolo
- https://laravel.com/docs/ai-sdk
- https://regolo.ai
- https://ai-sdk.dev (Vercel AI SDK)
- https://padosoft.com

### 17.4 Asset da preparare prima del merge

- `resources/banner.png` (1200×600) — screenshot della home con suggested prompts visibili e una bubble con artifact.
- `resources/demo-streaming.gif` (800×450, max 8 MB) — recording 10s di un turn con streaming + artifact.
- `resources/architecture.svg` — opzionale, può restare mermaid inline.

---

## 18. Operazioni post-merge consigliate

- Tag `v0.1.0` e GitHub release con changelog.
- Pubblica su Packagist (`composer create-project lopadova/laravel-ai-chat`) — opzionale, è un'app, non un package.
- Aggiungi GitHub Actions CI minima: matrix PHP 8.3/8.4 × Laravel 13, run `phpunit` + `pint --test` + `npm run test` + `tsc --noEmit`.
- Aggiungi Dependabot per `composer` + `npm`.
- Linka il repo dalla README di `padosoft/laravel-ai-regolo` come "Quickstart demo".

---

## 19. Note per l'AI esecutrice

1. **Non rebuildare se non serve.** `Agent::stream()->usingVercelDataProtocol()` esiste già — usalo. Non reimplementare l'envelope SSE chunk-by-chunk a mano (a meno che lo step di verifica del §7.2 dimostri che non funziona per i tool-results).
2. **Verifica le firme API prima di scrivere.** Step §7.2 contiene un blocco *VERIFICA* esplicito. Salta a tuo rischio.
3. **Tieni i tool stub.** Niente chiamate a Unsplash/OpenAI/etc. dai Tool — rompono offline e aggiungono dipendenze.
4. **Leggi il README di `padosoft/laravel-ai-regolo` da cima a fondo** prima di scrivere il README della demo. È il template.
5. **Quando in dubbio sullo scope: NON aggiungere.** Vedi §0.1.
6. **Commits piccoli e nominati.** Stile gitmoji (`✨ feat:`, `🐛 fix:`, `📝 docs:`, `✅ test:`).
7. **Apri PR con descrizione completa**: che si vede a video, screenshot, comandi per testarla.

Fine documento.
