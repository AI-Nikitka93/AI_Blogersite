# Compliance Source Policy

Дата: 2026-05-15

Цель: не подключать в активный runtime источники, которые могут создать юридический или операционный риск в Беларуси. Это не юридическая консультация; для спорных случаев нужен живой re-check официального списка и ручное решение владельца проекта.

## Hard block

Эти источники не должны появляться в `src/lib/agent/topics.ts`, runtime prompts, gatekeeper allow-lists или connector presets:

- BBC / `bbc.com` / `bbci.co.uk`
- TUT.by / Zerkalo
- DW
- Belsat
- Radio Svaboda / RFE/RL
- Euroradio
- Charter97
- Nasha Niva
- Meduza
- Mediazona
- Reform.news

## Почему BBC убран

По состоянию на май 2026 года сообщения о новой редакции Республиканского списка экстремистских материалов Беларуси указывают, что сайт `BBC News Русская служба` / `https://www.bbc.com` был внесен в список. Поэтому в проекте удалены и `BBC World RSS`, и `BBC Sport RSS`: даже спортивный RSS технически ведет через тот же бренд/доменный контур и не нужен для MVP.

## Runtime rule

- Если источник попал в hard block, он не используется даже как late fallback.
- Если источник политический, санкционный, военный или государственно-конфликтный по факту материала, он режется gatekeeper-ом.
- Если источник не имеет стабильного official RSS/API, его нельзя добавлять без отдельного controlled connector и smoke-а.
- Расширять coverage нужно через безопасные primary/expert sources: AI labs, science/tech blogs, official APIs, non-political sports/stat APIs.

## Regression

`npm run check:source-compliance` сканирует runtime-файлы и падает, если hard-block domains вернулись в активный контур.
