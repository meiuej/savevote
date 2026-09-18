# Новости и редактор

## Что готово

- `scripts/build-news.py` собирает сайт в `_site`, без сторонних Python-пакетов.
- `/news/` — список новостей, `/news/<имя-файла>/` — отдельная новость.
- `/admin/` — Decap CMS на русском. Подключается GitHub OAuth через Cloudflare Worker `savevote-cms-auth.lobodatim.workers.dev`. В деморежиме данные исчезают после перезагрузки и не публикуются.
- Новости хранятся в `content/news/*.json`, изображения — `uploads/news/`.
- Текст в первой версии — обычные абзацы, без HTML и форматирования. Разделяйте абзацы пустой строкой.
- Workflow `.github/workflows/pages.yml` пересобирает сайт при изменениях в main. Сам по себе локальный файл workflow ничего не публикует.

## Локальная проверка

```sh
python3 scripts/build-news.py
python3 -m http.server 8000 --bind 127.0.0.1 --directory _site
```

Открыть http://127.0.0.1:8000/news/ или http://127.0.0.1:8000/admin/.
Для редактора требуется доступ к unpkg.com. Публичных демонстрационных новостей нет.

## Подключение настоящей публикации (один раз)

1. В GitHub `meiuej/savevote` проверить Settings → Pages. Для подготовленной сборки выбрать Source → GitHub Actions. До переключения убедиться, что файлы этой реализации уже доступны в репозитории.
2. Подключить GitHub OAuth-провайдер для Decap. Можно использовать Netlify OAuth или собственный OAuth proxy. Следовать https://decapcms.org/docs/github-backend/ и https://decapcms.org/docs/backends-overview/.
3. При собственном proxy зарегистрировать GitHub OAuth App: Homepage URL — https://vote.chenterce.info, callback — URL сервиса авторизации с путём `/callback`. Сервис должен реализовывать `/auth` и `/callback`, проверку OAuth state и точного origin сайта. Client secret хранится только в секретах сервиса, не в репозитории/браузере.
4. Указать HTTPS-адрес подключённого сервиса в `authBaseUrl` файла `admin/editor.js`. Это публичный URL, не секрет. После этого панель предлагает настоящий вход вместо деморежима. Для стандартного GitHub backend редактор должен иметь write-доступ к репозиторию.
5. Загрузить подготовленные изменения в main и дождаться успешного workflow Publish site. Проверить главную страницу, `/news/`, `/admin/`.
6. Войти, создать тестовый черновик, проверить фото и текст, опубликовать. Убедиться, что сборка завершилась и новость открывается. Проверить редактирование и удаление.

## Как публиковать

`/admin/` → Войти через GitHub → Новости → Создать новость → заполнить поля → Сохранить черновик → перевести в готовые → Опубликовать. Подождать окончания сборки GitHub Actions и открыть `/news/`.

Черновики при настоящем подключении используют editorial workflow и сохраняются в отдельных ветках GitHub. В публичном репозитории такие ветки не являются приватными. Дата — отображаемая дата новости, а не автоматическое расписание публикации.

## Технические детали

Сборка экранирует пользовательский текст; HTML в новости не исполняется. Для обложек разрешены пути `/uploads/news/` и HTTPS. Обновление/удаление новости обновляет генерируемые страницы при следующей сборке. Папка content и инструкции не копируются на сайт.

## Cloudflare Worker для входа

Подготовлен `auth/worker.mjs` (без зависимостей) и конфигурация `auth/wrangler.jsonc`.

1. Создать Worker `savevote-cms-auth` и развернуть содержимое `auth/worker.mjs`.
2. Записать полученный адрес `https://savevote-cms-auth.<поддомен>.workers.dev`.
3. В GitHub → Settings → Developer settings → OAuth Apps → New OAuth App создать приложение «Сохранить Голос — редактор». Homepage: `https://vote.chenterce.info`, callback: `<адрес Worker>/callback`.
4. В Worker → Settings → Variables and Secrets задать `GITHUB_CLIENT_ID` и секрет `GITHUB_CLIENT_SECRET`. Client secret вводит владелец аккаунта напрямую в Cloudflare. В чат и git его не помещать.
5. Проверить `<адрес Worker>/health`: `ready` должен быть `true`.
6. В `admin/editor.js` задать этот адрес в `authBaseUrl` и опубликовать сайт.

Worker запрашивает GitHub OAuth scope `public_repo`, который распространяется на публичные репозитории аккаунта, а не только на этот сайт. При первом входе GitHub покажет запрос доступа; решение принимает владелец. Worker дополнительно проверяет право записи именно в `meiuej/savevote`. Он не хранит токены, не пишет журналы приложения и передаёт токен только окну `https://vote.chenterce.info`.

Проверка: `node --test auth/worker.test.mjs`. Настоящий вход требует проверки после развёртывания; локальные тесты используют подставные ответы GitHub.

## Настроенные адреса

- Сайт: https://vote.chenterce.info
- Новости: https://vote.chenterce.info/news/
- Редактор: https://vote.chenterce.info/admin/
- OAuth Worker: https://savevote-cms-auth.lobodatim.workers.dev
- GitHub OAuth App: https://github.com/settings/applications/3866640
- GitHub Pages переключён на GitHub Actions; первая сборка прошла успешно.
- GITHUB_CLIENT_ID указан в конфигурации Worker. Секрет задаётся владельцем в Cloudflare как Secret.
- При истечении GitHub-токена может потребоваться выйти из редактора и войти снова.
