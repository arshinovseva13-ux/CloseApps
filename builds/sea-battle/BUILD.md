# Close Sea Battle — сборки

Исходный HTML игры берётся из `/sea-battle.html` в корне репозитория CloseApps.

## Автоматическая сборка

GitHub Actions собирает:
- Windows x64 — установщик EXE (NSIS).
- Android — APK (debug signing).

Публикация выполняется в GitHub Release с тегом `sea-battle-v1.0.0`. Страница `/builds/sea-battle.html` использует прямые URL файлов релиза, поэтому посетителю не требуется открывать страницу Releases.

## Иконка

`assets/sea-battle.svg` — исходная фирменная иконка. Скрипт подготовки генерирует PNG и ICO; Android-скрипт устанавливает PNG-иконки в mipmap-ресурсы.
