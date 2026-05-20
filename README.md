# Kvant Server

[![О проекте Kvant](https://img.shields.io/badge/Kvant-About%20project-2ea44f?style=for-the-badge&logo=github)](https://github.com/nisonya/kvant)
[![Скачать релизы](https://img.shields.io/badge/Releases-Download-blue?style=for-the-badge&logo=github)](https://github.com/nisonya/kvant-server/releases)
[![Документация API](https://img.shields.io/badge/API-Documentation-red?style=for-the-badge&logo=read-the-docs)](https://github.com/nisonya/kvant-server/blob/main/API_DOCUMENTATION.pdf)

Инструкции по установке desktop и headless версий.


## Где скачать установщик

- Откройте релизы проекта на GitHub: [https://github.com/nisonya/kvant-server/releases](https://github.com/nisonya/kvant-server/releases)
- Скачайте нужный файл:
  - Windows: `Kvant Server Setup <version>.exe`
  - Linux с GUI (desktop): `Kvant.Server-<version>.AppImage`
  - Headless (beta): `api-deployer-headless-<version>.tar.gz`

## Что подготовить до запуска

- Установить MySQL.
- Иметь данные для входа в MySQL (существующий пользователь или новый; можно `root`).
- Открыть и пробросить наружу порт API (если нужен доступ из другой сети).

## 1) Установка MySQL

### Windows

- Установите MySQL Server через MySQL Installer.
- Используйте существующего пользователя MySQL или создайте нового (можно `root`).
- Запомните:
  - host (обычно `127.0.0.1`)
  - port (обычно `3306`)
  - user/password
- Включите автозапуск службы MySQL:
  - `Win + R` -> `services.msc` -> `MySQL80` (или ваш сервис MySQL) -> `Startup type: Automatic`.

### Debian/Ubuntu

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
```

Проверка автозапуска:

```bash
sudo systemctl is-enabled mysql
```

Создание нового пользователя (опционально, если не используете существующего):

```sql
CREATE USER 'db_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON *.* TO 'db_user'@'%';
FLUSH PRIVILEGES;
```

## 2) Установка desktop-версии

### Windows

- Запустите `Kvant Server Setup <version>.exe` из релиза.
- Установите приложение.
- Запустите приложение.

### Linux с GUI (desktop)

Скачайте `Kvant.Server-<version>.AppImage` из [релиза](https://github.com/nisonya/kvant-server/releases) и запустите:

```bash
chmod +x Kvant.Server-<version>.AppImage
./Kvant.Server-<version>.AppImage
```

Установка не требуется — это portable-файл. При первом запуске откроется окно настройки (см. раздел 3).


## 3) Первая настройка в приложении

После запуска откройте окно настройки и заполните:

- Подключение к БД:
  - Host
  - Port
  - User
  - Password
- Порт API:
  - укажите порт, который вы пробросили на
- Папки для файлов:
  - каталог документов мероприятий организации
  - каталог документов мероприятий участия

Важно: здесь вы создаёте именно подключение в приложении к уже существующему (или созданному ранее) MySQL-пользователю.

Сохраните настройки и перезапустите приложение, если оно попросит.

## 4) Доступ из другой сети (обязательно)

Чтобы к API можно было подключаться извне:

- Откройте порт API в фаерволе ОС.
- Сделайте порт-форвардинг на роутере:
  - внешний порт -> IP сервера в локальной сети -> порт API
- Проверьте, что провайдер не блокирует входящие подключения.

Без порт-форвардинга API будет доступен только в локальной сети.

## 5) Headless версия (beta)

Headless версия не проходила полный цикл тестирования в прод-сценариях. Используйте как beta.

Файл: `api-deployer-headless-<version>.tar.gz`

### Linux (headless)

```bash
tar -xzf api-deployer-headless-<version>.tar.gz
cd api-deployer-headless-<version>
npm ci --production
node scripts/setup-cli.js
node server.js
```

В `setup-cli` задаются те же параметры: БД, порт API, каталоги для файлов.

## 6) Проверка запуска API

- Убедитесь, что API поднят на заданном порту.
- Проверьте доступ локально и с внешней стороны (если нужен внешний доступ).

