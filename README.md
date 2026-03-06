# apicat

`apicat` is a tiny API sidekick with one short command: `ac`.

Keep your API definitions in one `.apicat` file, then list them, inspect them, and fire them off from the CLI or from JavaScript. It is built for quick experiments, repeatable calls, and "what was that curl again?" moments.

## ⚡ Quick Start

The shortest way to think about it is:

```bash
npx apicat <ls | service.name> KEY=VALUE
```

Examples:

```bash
npx apicat ls
npx apicat httpbin.get
npx apicat openrouter.chat API_KEY=$OPENROUTER_API_KEY MODEL=openai/gpt-4o-mini PROMPT="hello"
```

Want the short command too? Install it:

```bash
npm install -g apicat
# or
bun add -g apicat
```

Then you can use either form:

```bash
ac ls
ac httpbin.get
npx apicat ls
npx apicat httpbin.get
```

`npx apicat` and `ac` hit the exact same CLI.

API IDs use `<service>.<name>` form, like `httpbin.get`, `openai.chat`, or `echo.ws`.

## 🎉 Why It’s Fun

- One command: `ac`
- One config file: `.apicat`
- HTTP and WebSocket support
- Variables with `$VAR` and required variables with `$!VAR`
- Works as both a CLI and a library

## 🧠 How It Thinks

`ac` looks for config in this order:

1. `-config <path>`
2. `~/.apicat`
3. the bundled `.apicat`

On first interactive run, it can copy the bundled `.apicat` to `~/.apicat` so you have your own editable version instead of poking at the packaged one.

## 🧰 CLI Cheatsheet

```bash
# show the menu
ac

# list the toy box
ac ls
ac list openai
ac ls httpbin

# grep, but friendlier
ac help httpbin

# bring your own config
ac -config ./custom.yaml ls
ac -config ./custom.yaml httpbin.get

# call something
ac httpbin.get foo=bar
ac -time httpbin.get
ac -debug httpbin.get

# steal one definition into local ./.apicat
ac fetch echo.ws
ac fetch openai.chat

# refresh ~/.apicat from the published config
ac update
```

## 🪄 A Few Good Tricks

```bash
# OpenAI-compatible chat
ac openai.chat \
  OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1 \
  OPENAI_COMPATIBLE_API_KEY=$OPENAI_API_KEY \
  MODEL=gpt-4o-mini \
  PROMPT="Write a haiku about logs"

# OpenRouter
ac openrouter.chat \
  API_KEY=$OPENROUTER_API_KEY \
  MODEL=openai/gpt-4o-mini \
  PROVIDER=openai \
  PROMPT="Say hello"

# plain old GET
ac httpbin.get
```

Parameters automatically fall back to matching environment variables when possible.

## 💻 Use It From Code

Install it locally if you want to import it:

```bash
npm install apicat
# or
bun add apicat
```

Then:

```javascript
import { fetchApi, getApis, getRequest } from 'apicat';

const apis = getApis();
console.log(apis.map((api) => api.id));

const req = getRequest('httpbin', 'get');
console.log(req.url);

const res = await fetchApi('httpbin', 'get');
console.log(await res.json());

const chat = await fetchApi('openai', 'chat', {
  vars: {
    OPENAI_COMPATIBLE_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_API_KEY,
    MODEL: 'gpt-4o-mini',
    PROMPT: 'Hello world'
  }
});

console.log(await chat.json());
```

`fetchApi` returns a normal Fetch `Response`, so you can use `status`, `ok`, `headers`, `text()`, `json()`, and the rest of the usual response methods.

## 📜 The `.apicat` Spellbook

Top-level keys are `service.name`.

```yaml
httpbin.get:
  url: https://httpbin.org/get
  method: GET
  headers: {}

openai.chat:
  url: https://api.openai.com/v1/chat/completions
  method: POST
  headers:
    Authorization: "Bearer $!API_KEY"
    Content-Type: application/json
  body: |
    {"model":"$!MODEL","messages":[{"role":"user","content":"$!PROMPT"}]}

echo.ws:
  url: wss://echo-websocket.fly.dev/.ws
  body: $!PROMPT
```

`fetch <name>` merges a definition into local `./.apicat`, creating it if needed.

## 🤖 For LLM Prompts

If you want a model to learn your API definitions, point it at:

`https://raw.githubusercontent.com/beachdevs/apicat/refs/heads/master/.apicat`

## 🔎 Small Print

- `update` overwrites `~/.apicat` with the latest published `.apicat`
- `-config <path>` can point at any YAML file
- `apis.txt` is still supported for compatibility
