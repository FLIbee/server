# NETFETCH — Web Intelligence Terminal

HTTP-клиент и сервер для сбора информации из интернета.

---

## Возможности

- 🔍 **Ключевые слова → URL** — сервер хранит базу ключевых слов, клиент запрашивает список источников через `POST /api/urls`
- ⚡ **Стриминг в реальном времени** — контент передаётся клиенту через **Server-Sent Events (SSE)** с живым прогрессом (байты, процент)
- 💾 **Офлайн-кэш** — страницы сохраняются в **LocalStorage** и доступны без сети
- 🖥 **Два режима просмотра** — рендер HTML (iframe) и отображение исходного кода
- ⚠️ **Полная обработка ошибок** — таймауты, HTTP-ошибки, слишком большие страницы, обрывы сети, редиректы — всё поймано и показано пользователю

---

## Быстрый старт

### Требования

- [Node.js](https://nodejs.org/) v16 или выше
- npm

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/YOUR_USERNAME/netfetch.git
cd netfetch

# Установить зависимости
npm install
```

### Запуск

```bash
# Продакшн
npm start

# Разработка (автоперезапуск при изменениях)
npm run dev
```

Сервер запускается на **http://localhost:3000**

Откройте браузер и перейдите по адресу: **http://localhost:3000**

---

## Как пользоваться

1. **Введите ключевое слово** в поле слева (например, `javascript`, `python`, `http`)
2. Нажмите **RUN** — сервер вернёт список URL для этого слова
3. Нажмите на любой **источник** из списка — сервер начнёт стримить содержимое страницы
4. Наблюдайте за **прогресс-баром** — он обновляется в реальном времени по мере загрузки
5. Страница рендерится во вкладке **Preview** (iframe) — переключитесь в **Text** для текстового вида или в **Source** для сырого HTML
6. Нажмите **SAVE** — страница сохранится в LocalStorage для офлайн-чтения
7. Вкладка **Saved** — список всех сохранённых страниц, клик по любой восстанавливает её без сети

### Доступные ключевые слова

`javascript` · `nodejs` · `python` · `http` · `css` · `html` · `api` · `websocket` · `react` · `git`

---

## Справка по API

### `GET /api/keywords`

Возвращает список всех доступных ключевых слов.

**Ответ:**
```json
{
  "keywords": ["javascript", "nodejs", "python", ...]
}
```

---

### `POST /api/urls`

Возвращает список URL для переданного ключевого слова.

**Тело запроса:**
```json
{ "keyword": "javascript" }
```

**Ответ (200):**
```json
{
  "keyword": "javascript",
  "urls": [
    { "url": "https://developer.mozilla.org/...", "title": "MDN JavaScript Guide" },
    ...
  ]
}
```

**Ошибка (404):**
```json
{
  "error": "No URLs found for keyword \"xyz\"",
  "available": ["javascript", ...]
}
```

---

### `GET /api/fetch?url=<URL>`

Стримит содержимое страницы через **Server-Sent Events (SSE)**.

**События:**

| Событие    | Payload                                  | Описание                          |
|------------|------------------------------------------|-----------------------------------|
| `start`    | `{ url, timestamp }`                     | Соединение установлено            |
| `meta`     | `{ contentType, totalSize, statusCode }` | Заголовки ответа получены         |
| `progress` | `{ received, total, progress }`          | Прогресс в байтах / процентах     |
| `redirect` | `{ location, status }`                   | Сервер вернул редирект            |
| `complete` | `{ content, size, truncated }`           | Загрузка завершена                |
| `error`    | `{ message }`                            | Ошибка на любом этапе             |

> Страницы крупнее **512 КБ** усекаются. Событие `complete` в таком случае содержит `truncated: true`.

---

## Структура проекта

```
netfetch/
├── server/
│   └── server.js       # Express-сервер, SSE-стриминг, in-memory БД ключевых слов
├── public/
│   └── index.html      # Клиент — SPA на Vanilla JS
├── package.json
└── README.md
```

---

## Технологии

| Уровень           | Технология                        |
|-------------------|-----------------------------------|
| Сервер            | Node.js, Express                  |
| Передача данных   | Server-Sent Events (SSE), Fetch API |
| Клиент            | Vanilla JS (без фреймворков)      |
| Офлайн-хранилище  | LocalStorage                      |
| Шрифты            | Google Fonts (Space Mono, Inter)  |

---

## Публичный деплой

> Разверните на [Render](https://render.com), [Railway](https://railway.app) или [Glitch](https://glitch.com) для получения публичного URL.

**Render (рекомендуется):**
1. Запушьте репозиторий на GitHub
2. Создайте новый **Web Service** на render.com
3. Команда сборки: `npm install`
4. Команда запуска: `npm start`
5. После деплоя получите публичный URL вида `https://netfetch-xxxx.onrender.com`
