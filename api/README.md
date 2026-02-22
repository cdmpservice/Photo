# Прокси для генерации (Flux img2img)

Вкладка «Генерация» в `index.html` отправляет запросы на ваш прокси, чтобы не светить `REPLICATE_API_TOKEN` в браузере.

## Деплой на Vercel

1. Залейте проект в GitHub и подключите к [Vercel](https://vercel.com).
2. В настройках проекта → Environment Variables добавьте:
   - `REPLICATE_API_TOKEN` = ваш токен с [replicate.com/account](https://replicate.com/account).
   - `OPENAI_API_KEY` = ваш токен с [platform.openai.com](https://platform.openai.com/api-keys) — для анализа фото через GPT Vision.
   - `GEMINI_API_KEY` = ваш токен с [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — опционально, для анализа через Gemini Vision (переключатель в интерфейсе).
3. Деплой. URL будет вида `https://ваш-проект.vercel.app`.
4. Во вкладке «Генерация» укажите URL прокси: `https://ваш-проект.vercel.app/api/generate` (или просто `https://ваш-проект.vercel.app`).

## Локальный запуск

```bash
npm i -g vercel
cd "AI Vision"
vercel dev
```

В `.env` задайте `REPLICATE_API_TOKEN=r8_xxx`. В форме укажите `http://localhost:3000/api/generate`.

## Модель

Используются **Google Nano Banana** и **OpenAI GPT Image 1.5** на Replicate (img2img по референсному фото и промпту).
