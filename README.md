# apicli

⚡ A fast CLI + code library for calling API definitions from a single YAML file.

## 🚀 Quick Start

```bash
npx beachdevs/apicli catfact.getFact
```

`apicli` API IDs use `<service>.<name>` (for example `httpbin.get`, `openai.chat`, `echo.ws`).

- Supports HTTP(S) and WebSocket endpoints.
- Pass runtime params as `KEY=value`.
- Use `$VAR` for optional variables and `$!VAR` for required variables in templates.
- Works from CLI and from code.

## 🤖 Use From LLMs

Prompt:

`Learn api definitions from https://raw.githubusercontent.com/beachdevs/apicli/refs/heads/master/apicli.yaml`

## 🧭 CLI Usage

```bash
# Show help/options
npx beachdevs/apicli

# List APIs
npx beachdevs/apicli ls
npx beachdevs/apicli list openai
npx beachdevs/apicli ls httpbin

# Copy one API definition into local ./apicli.yaml
npx beachdevs/apicli fetch echo.ws
npx beachdevs/apicli fetch openai.chat

# Use a custom config file
npx beachdevs/apicli -config ./custom.yaml ls
npx beachdevs/apicli -config ./custom.yaml httpbin.get

# Show matching config lines
npx beachdevs/apicli help httpbin

# Call an API with params
npx beachdevs/apicli httpbin.get foo=bar

# Time + debug
npx beachdevs/apicli -time httpbin.get
npx beachdevs/apicli -debug httpbin.get
```

## 🔑 Auth + Params Examples

Parameters with matching environment variables are populated automatically if you don't pass them explicitly.

```bash
# OpenAI-compatible
npx beachdevs/apicli openai.chat \
  OPENAI_COMPATIBLE_BASE_URL=https://api.openai.com/v1 \
  OPENAI_COMPATIBLE_API_KEY=$OPENAI_API_KEY \
  MODEL=gpt-4o-mini \
  PROMPT="Hello"

# OpenRouter with optional provider
npx beachdevs/apicli openrouter.chat \
  API_KEY=$OPENROUTER_API_KEY \
  MODEL=openai/gpt-4o-mini \
  PROVIDER=openai \
  PROMPT="Hello"
```

## 🧩 Use In Code

Install with Bun or npm:

```bash
bun add -g beachdevs/apicli
npm install beachdevs/apicli
```

Then call from JavaScript:

```javascript
import { fetchApi, getRequest, getApis } from 'apicli';

// List loaded API definitions
const apis = getApis();

// Build request without sending
const req = getRequest('httpbin', 'get');
console.log(req.url);

// Send request
const res = await fetchApi('httpbin', 'get');
const data = await res.json();
console.log(data.url);

// With variables
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

`fetchApi` returns a standard `Response` object, so you can also use `status`, `ok`, `headers`, `text()`, `arrayBuffer()`, and other Fetch response APIs.

## 🗂️ Config Format (`apicli.yaml`)

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

## ✅ Notes

- `fetch <name>` merges into local `./apicli.yaml` (creates it if missing).
- `-config <path>` lets you point to any YAML file.
- `apis.txt` format is still supported for compatibility.
