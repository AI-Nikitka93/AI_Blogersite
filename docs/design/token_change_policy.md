# Token Change Policy — Miro

1. Сначала меняются base tokens в `src/styles/tokens/*`.
2. Потом синхронно проверяются semantic aliases в `src/styles/semantic/*`.
3. Только после этого меняются component-level решения.

## Нельзя
- Переопределять raw color прямо внутри компонента, если роль уже есть в semantic layer.
- Менять шрифтовую роль без обновления `DESIGN.md` и `miro-design-system.md`.
- Добавлять новые радиусы и тени “по месту”.

## Обязательная проверка
- `npm run typecheck`
- `npm run build`
- визуальный осмотр home, archive, post page
