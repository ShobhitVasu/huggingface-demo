# Hugging Face Inference API

A small TypeScript HTTP API that calls a model through Hugging Face Inference Providers. The model runs on a Hugging Face provider; this app is the authenticated API layer and does not host model weights itself.

## Setup

1. Create a fine-grained token at [Hugging Face token settings](https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained) with **Make calls to Inference Providers** permission.
2. Copy `.env.example` to `.env` and set `HF_TOKEN` and a long random `API_ACCESS_KEY`.
3. Install dependencies and start the development server:

```sh
npm install
npm run dev
```

The API listens on `http://localhost:3000`. `HF_MODEL` defaults to `openai/gpt-oss-120b:fastest`; set it to another model available through Inference Providers as needed. `PORT` changes the listening port.

## Chat API

`POST /api/chat` requires the application key as a bearer token. The model is selected by the server's `HF_MODEL` setting and is not accepted from callers.

```sh
curl http://localhost:3000/api/chat \
  -H "Authorization: Bearer $API_ACCESS_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explain inference providers in one sentence."}
    ],
    "max_tokens": 256,
    "temperature": 0.7
  }'
```

The response contains `id`, `model`, `message`, and `usage`. Supported message roles are `system`, `user`, and `assistant`. Requests allow 1 to 50 messages; each message is limited to 20,000 characters. `max_tokens` and `temperature` are optional.

`GET /health` returns `{ "status": "ok" }` and does not require authentication.

## Production

Build and start the compiled server with:

```sh
npm run build
npm start
```

Configure `HF_TOKEN`, `API_ACCESS_KEY`, `HF_MODEL` (optional), and `PORT` as deployment environment variables. Never commit `.env` or expose `HF_TOKEN` to browser clients. For a public deployment, also put the service behind HTTPS and apply provider-appropriate rate limits.# huggingface-demo
