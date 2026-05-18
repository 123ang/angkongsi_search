# 神主牌搜寻系统 MVP

Offline desktop MVP for searching and managing ancestor tablet records. The app is built with Electron, React, TypeScript, and SQLite, and stores all data locally on the computer.

## Current MVP Status

Implemented:

- Electron desktop app scaffold with React + TypeScript renderer.
- Local SQLite database at Electron user data path: `data/ancestors.db`.
- Automatic database initialization and sample Chinese records.
- Chinese-first visitor search with partial keyword search across name, pinyin, spouse, origin, location, code, and remarks.
- Search ranking for exact code/name and Chinese-first matches.
- Detail modal with large readable fields and tablet photo placeholder.
- Simple admin PIN gate. Default PIN: `123456`.
- Admin add, edit, and archive record workflows.
- Local photo upload through Electron file dialog. Photos are copied into the local `photos` folder and only the filename is stored in SQLite.
- CSV / Excel import using the standard MVP column names.
- CSV export.
- Folder backup that copies the SQLite database and photos into `backups/backup_YYYY-MM-DDTHH-mm-ss`.
- Settings for association name and admin PIN.
- Buttons to open local data and photo folders.
- Local log file at `logs/app.log`.

Deferred from full requirements:

- Full ZIP backup packaging.
- Restore backup replacement flow.
- Automatic daily backup rotation.
- Import preview and column mapping UI.
- Excel export formatting beyond CSV.
- QR code, print view, location map, multi-branch support, OCR, and pinyin auto-generation.

## Local Data Layout

Electron stores data in the app user data folder. The app creates:

```text
data/ancestors.db
photos/
backups/
logs/app.log
```

Use the admin Settings area to open the data folder or photo folder.

## Import Template

Excel or CSV imports should use these column names:

```text
record_code
chinese_name
english_name
pinyin_name
spouse_1
spouse_2
spouse_3
tablet_location
tablet_area
tablet_row
tablet_level
tablet_number
birth_year
death_year
origin_place
photo_path
remarks
status
```

Required fields:

- `chinese_name`
- `tablet_location`

`status` should be `active` or `archived`. Empty status defaults to `active`.

## Setup

Install dependencies:

```bash
npm install
```

Run in development:

```bash
npm run dev
```

Typecheck and build:

```bash
npm run build
```

Package for Windows:

```bash
npm run package
```

The Windows package output is written to `release/`.

## Notes for Staff Testing

- Visitor mode is the default screen.
- Try sample searches: `洪`, `文杰`, `福建`, `左排`, `A0001`, `Lim`.
- Admin mode requires PIN `123456` until changed in Settings.
- Archived records are hidden from visitor search but still visible in admin management.
- Photo uploads accept `.jpg`, `.jpeg`, `.png`, and `.webp`, up to 10MB.
