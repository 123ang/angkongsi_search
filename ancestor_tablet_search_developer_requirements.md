# Developer Requirements Document

# Offline Ancestor Tablet Search System

## 1. Project Overview

This project is an offline desktop application for searching ancestral/spirit tablet records in a temple, clan association, or ancestral hall.

The system should allow old staff and visitors to easily search for ancestor records using Chinese or English keywords. Staff should also be able to add new records, edit existing records, upload photos, and manage the local data without needing internet access.

The recommended technology stack is:

- **Frontend:** React + TypeScript
- **Desktop App:** Electron
- **Database:** SQLite
- **Local Photo Storage:** Local folder inside the app data directory
- **Language Support:** Chinese and English
- **Target Users:** Elderly staff, association administrators, and visiting family members

The system must be simple, clear, and easy to operate for non-technical users.

---

## 2. Main Objective

The main objective is to build a fully offline desktop search system where users can:

1. Search ancestor/spirit tablet records.
2. View ancestor details clearly.
3. Upload and view related photos.
4. Add, edit, and manage records locally.
5. Use the system in Chinese or English.
6. Backup and restore data safely.

---

## 3. Target Users

## 3.1 Visitor User

Visitor users are relatives or members of the public who visit the association/temple and want to find an ancestor tablet location.

Visitor users can:

- Search records.
- View ancestor information.
- View photo of the ancestor tablet.
- Switch language between Chinese and English.

Visitor users cannot:

- Add records.
- Edit records.
- Delete records.
- Upload photos.
- Export or restore data.

## 3.2 Staff/Admin User

Staff/Admin users are association staff who manage ancestor records.

Admin users can:

- Add new ancestor records.
- Edit existing records.
- Upload or replace photos.
- Import data from Excel/CSV.
- Export data for backup.
- Restore data from backup.
- Manage system settings.

---

## 4. Platform Requirements

## 4.1 Desktop Application

The system should be packaged as a desktop application using Electron.

Expected output:

- Windows version: `.exe` installer or portable app.
- Optional future version: macOS `.dmg`.

For the first version, Windows should be prioritized because old staff are more likely to use a normal Windows computer.

## 4.2 Offline Requirement

The system must work fully offline.

The app should not require:

- Internet connection.
- Cloud database.
- External server.
- Login to online account.

All data should be stored locally on the computer.

---

## 5. Recommended Folder Structure

The installed app should use a simple and understandable local data structure.

Example:

```text
AncestorSearchApp/
├── AncestorSearch.exe
├── data/
│   └── ancestors.db
├── photos/
│   ├── A0001.jpg
│   ├── A0002.jpg
│   └── A0003.jpg
├── backups/
│   ├── backup_2026-05-16.zip
│   └── backup_2026-06-01.zip
└── logs/
    └── app.log
```

Actual Electron user data path may be used, but the app should provide an easy way for admin to open the data folder from the settings page.

---

## 6. Core Features

## 6.1 Search Records

The search function is the most important feature.

Users should be able to search using:

- Chinese name.
- English name.
- Pinyin name.
- Ancestor ID.
- Spouse name.
- Origin/place.
- Tablet location.
- Any partial keyword.

Examples:

```text
洪
洪文杰
文杰
Hong Wen Jie
Wen Jie
福建
南安
左排
A0001
```

The system should support partial search. Users should not need to type the exact full name.

## 6.2 Search Results

Search results should appear in a large, readable table/card format.

Recommended fields shown in search results:

- Ancestor ID
- Chinese Name
- English/Pinyin Name
- Spouse Name
- Tablet Location
- Origin
- Photo thumbnail
- View Detail button

For old staff, the result should not be too crowded. Important information should be large and easy to read.

## 6.3 Record Detail Page / Popup

When the user clicks a record, show full details.

Fields:

- Ancestor ID
- Chinese Name
- English Name / Pinyin
- Spouse 1
- Spouse 2
- Spouse 3
- Tablet Location
- Row / Area / Level / Number
- Birth Year
- Death Year
- Origin / Ancestral Place
- Remarks
- Photo
- Last Updated Date

The photo should be large enough for users to identify the tablet.

## 6.4 Add New Record

Admin users should be able to add a new record.

Required fields:

- Chinese Name
- Tablet Location

Optional fields:

- English Name
- Pinyin Name
- Spouse 1
- Spouse 2
- Spouse 3
- Birth Year
- Death Year
- Origin
- Remarks
- Photo

The system should auto-generate an internal record ID if the admin does not enter one.

Example ID format:

```text
A0001
A0002
A0003
```

## 6.5 Edit Existing Record

Admin users should be able to edit all record information.

The system should show a clear confirmation before saving changes.

Example message:

```text
Are you sure you want to save changes to this record?
确定要保存此记录的更改吗？
```

## 6.6 Delete / Archive Record

Recommended: Do not permanently delete records in the first version.

Instead, use archive status.

Status options:

- Active
- Archived

Archived records should not appear in normal visitor search, but admin can still view them.

## 6.7 Photo Upload

Admin should be able to upload photo for each record.

Photo upload requirements:

- Accept `.jpg`, `.jpeg`, `.png`, `.webp`.
- Maximum file size can be limited, for example 5MB or 10MB.
- The system should copy the uploaded photo into the local `photos` folder.
- The database should store only the photo filename/path, not the image binary.

Example:

```text
photos/A0001.jpg
```

When replacing photo:

- Keep old photo as backup, or
- Rename old photo with timestamp before replacing.

Example:

```text
A0001_old_20260516.jpg
```

## 6.8 Excel / CSV Import

Admin should be able to import existing sample data from Excel or CSV.

Supported file formats:

- `.xlsx`
- `.csv`

Import process:

1. Admin selects file.
2. System previews imported rows.
3. System validates important fields.
4. Admin confirms import.
5. System inserts or updates SQLite data.

Important: The import should not immediately overwrite existing data without confirmation.

Import modes:

- Add new records only.
- Update matching records by ID.
- Replace all records after backup.

For safety, before replacing all data, the system must create an automatic backup.

## 6.9 Export / Backup

Admin should be able to export all records.

Export options:

- Export to Excel.
- Export to CSV.
- Export full backup ZIP.

Full backup ZIP should include:

- SQLite database file.
- Photos folder.
- Optional app settings.

Backup filename format:

```text
backup_YYYY-MM-DD_HH-mm.zip
```

Example:

```text
backup_2026-05-16_14-30.zip
```

## 6.10 Restore Backup

Admin should be able to restore from previous backup.

Restore flow:

1. Admin selects backup ZIP.
2. System warns that current data will be replaced.
3. System creates another backup of current data first.
4. System restores selected backup.
5. System restarts or reloads data.

Warning message:

```text
Restoring backup will replace current data. A safety backup will be created before restore.
恢复备份将会替换当前资料。系统会先建立安全备份。
```

---

## 7. Bilingual Requirement

The system must support:

- English
- Simplified Chinese or Traditional Chinese, depending on association preference

For Malaysia Chinese association use, Traditional Chinese may feel more formal, but Simplified Chinese may be easier for some users. The system should be designed so language files can be changed later.

## 7.1 Language Switch

There should be a clear language switch button:

```text
中文 | English
```

The selected language should be remembered locally.

## 7.2 Suggested UI Text

| English | Chinese |
|---|---|
| Ancestor Tablet Search | 神主牌搜寻 |
| Search | 搜寻 |
| Enter name, origin, or location | 输入姓名、籍贯或位置 |
| Search Results | 搜寻结果 |
| View Details | 查看详情 |
| Add Record | 新增记录 |
| Edit Record | 编辑记录 |
| Upload Photo | 上传照片 |
| Export Backup | 导出备份 |
| Restore Backup | 恢复备份 |
| Settings | 设置 |
| No records found | 没有找到相关记录 |
| Save | 保存 |
| Cancel | 取消 |
| Confirm | 确认 |
| Back | 返回 |

---

## 8. Database Design

Use SQLite as a local database.

Database file:

```text
ancestors.db
```

## 8.1 Table: ancestor_records

```sql
CREATE TABLE ancestor_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_code TEXT UNIQUE,
    chinese_name TEXT NOT NULL,
    english_name TEXT,
    pinyin_name TEXT,
    spouse_1 TEXT,
    spouse_2 TEXT,
    spouse_3 TEXT,
    tablet_location TEXT NOT NULL,
    tablet_area TEXT,
    tablet_row TEXT,
    tablet_level TEXT,
    tablet_number TEXT,
    birth_year TEXT,
    death_year TEXT,
    origin_place TEXT,
    photo_path TEXT,
    remarks TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 8.2 Field Explanation

| Field | Description |
|---|---|
| id | Internal database ID |
| record_code | Human-readable ID, e.g. A0001 |
| chinese_name | Chinese ancestor name |
| english_name | English/romanized name |
| pinyin_name | Pinyin name for search |
| spouse_1 | Main spouse name |
| spouse_2 | Additional spouse name |
| spouse_3 | Additional spouse name |
| tablet_location | Full tablet location text |
| tablet_area | Area/section of tablet placement |
| tablet_row | Row information |
| tablet_level | Level/floor information |
| tablet_number | Number information |
| birth_year | Birth year, allow text due to uncertain records |
| death_year | Death year, allow text due to uncertain records |
| origin_place | Ancestral origin/place |
| photo_path | Local photo file path |
| remarks | Extra notes |
| status | active or archived |
| created_at | Created timestamp |
| updated_at | Updated timestamp |

## 8.3 Why birth_year and death_year should be TEXT

Some old records may not have exact years. They may contain uncertain values such as:

```text
不详
约1930
民国时期
- 
```

Therefore, using TEXT is safer than INTEGER.

## 8.4 Search Index

For better search performance, create indexes:

```sql
CREATE INDEX idx_chinese_name ON ancestor_records(chinese_name);
CREATE INDEX idx_english_name ON ancestor_records(english_name);
CREATE INDEX idx_pinyin_name ON ancestor_records(pinyin_name);
CREATE INDEX idx_tablet_location ON ancestor_records(tablet_location);
CREATE INDEX idx_origin_place ON ancestor_records(origin_place);
CREATE INDEX idx_status ON ancestor_records(status);
```

Optional: Use SQLite FTS5 for more advanced search later.

---

## 9. Search Logic

## 9.1 Basic Search

When user enters a keyword, search across multiple fields:

- record_code
- chinese_name
- english_name
- pinyin_name
- spouse_1
- spouse_2
- spouse_3
- tablet_location
- tablet_area
- tablet_row
- tablet_level
- tablet_number
- origin_place
- remarks

Example SQL idea:

```sql
SELECT * FROM ancestor_records
WHERE status = 'active'
AND (
    record_code LIKE ? OR
    chinese_name LIKE ? OR
    english_name LIKE ? OR
    pinyin_name LIKE ? OR
    spouse_1 LIKE ? OR
    spouse_2 LIKE ? OR
    spouse_3 LIKE ? OR
    tablet_location LIKE ? OR
    origin_place LIKE ? OR
    remarks LIKE ?
)
ORDER BY chinese_name ASC;
```

Use `%keyword%` for partial matching.

## 9.2 Empty Search

If the search box is empty, do not show all records by default for visitor mode unless the admin wants it.

Recommended behavior:

- Show message: “Please enter a name, origin, or location.”
- Or show recent/popular instructions.

This avoids overwhelming old users.

## 9.3 Search Result Ranking

Recommended ranking order:

1. Exact match on record code.
2. Exact match on Chinese name.
3. Chinese name contains keyword.
4. English/Pinyin name contains keyword.
5. Spouse name contains keyword.
6. Tablet location contains keyword.
7. Origin contains keyword.
8. Remarks contains keyword.

---

## 10. User Interface Requirements

## 10.1 Design Direction

The UI should be designed for old staff.

Important principles:

- Large font size.
- Clear buttons.
- High contrast.
- Minimal unnecessary elements.
- Avoid complicated menus.
- Use both icon and text where possible.
- Important actions should have confirmation.

## 10.2 Font Size

Recommended minimum font sizes:

| UI Element | Font Size |
|---|---|
| Main title | 32px |
| Search input | 24px |
| Main buttons | 22px |
| Table text | 20px |
| Detail text | 22px |
| Small helper text | 16px |

## 10.3 Main Search Page Layout

Suggested layout:

```text
--------------------------------------------------
| Logo / Association Name                         |
| 神主牌搜寻 / Ancestor Tablet Search              |
| 中文 | English                                  |
--------------------------------------------------
| [ Large Search Input Box                      ] |
| [ Search Button ] [ Clear Button ]              |
--------------------------------------------------
| Search Results                                  |
| Record cards / table                            |
--------------------------------------------------
```

## 10.4 Search Result Card Design

For old staff, card layout may be better than a dense table.

Each result card:

```text
[Photo Thumbnail]
Name: 洪文杰 / Hong Wen Jie
Spouse: 陈美兰
Location: 左排第三层 12号
Origin: 福建南安
[View Details]
```

## 10.5 Admin Dashboard

Admin page should include large buttons:

```text
[Add New Record]
[Manage Records]
[Import Excel/CSV]
[Export Backup]
[Restore Backup]
[Open Photo Folder]
[Settings]
```

---

## 11. Admin Access Requirement

For MVP, use a simple local admin PIN.

Example:

```text
Admin PIN: 123456
```

Admin PIN should be changeable in settings.

Important:

- Do not overcomplicate authentication for offline MVP.
- Visitor mode should be default.
- Admin mode should require PIN before editing data.

---

## 12. Data Validation

When adding or editing records:

Required:

- Chinese Name
- Tablet Location

Validation:

- Record code must be unique.
- Photo file must be valid image type.
- Status must be active or archived.
- Empty optional fields are allowed.

Before saving, show clear error messages.

Example:

```text
Chinese name is required.
请输入中文姓名。
```

---

## 13. Photo Management

## 13.1 Storage

Photos should be stored locally in the photos folder.

Recommended naming:

```text
record_code_timestamp.ext
```

Example:

```text
A0001_20260516.jpg
```

## 13.2 Photo Display

If photo exists:

- Show photo thumbnail in search results.
- Show large photo in detail page.

If photo does not exist:

- Show placeholder image.
- Text: “No photo available / 暂无照片”.

## 13.3 Photo Backup

Photos must be included in full backup.

---

## 14. Import Mapping Requirement

When importing Excel/CSV, column names may be different. The app should support mapping.

Example:

| Uploaded Column | System Field |
|---|---|
| 姓名 | chinese_name |
| 配偶 | spouse_1 |
| 位置 | tablet_location |
| 生年 | birth_year |
| 卒年 | death_year |
| 籍贯 | origin_place |
| 照片 | photo_path |

For MVP, developer can define a standard template first.

## 14.1 Standard Excel Template

Recommended columns:

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

---

## 15. Settings Page

Settings should include:

- Language default.
- Association name.
- Admin PIN change.
- Data folder location display.
- Open data folder button.
- Open photos folder button.
- Backup location.
- Auto-backup on/off.

---

## 16. Backup Safety Requirement

The system should protect against accidental data loss.

Required backup rules:

1. Create automatic backup before import replace-all.
2. Create automatic backup before restore.
3. Allow manual backup anytime.
4. Backup should include both database and photos.

Recommended auto-backup:

- Once per day when app opens.
- Keep last 30 backups.

---

## 17. Error Handling

The app should show simple, non-technical error messages.

Examples:

| Situation | Message |
|---|---|
| Database cannot open | The system cannot open the local data file. Please contact admin. |
| Photo missing | Photo file cannot be found. |
| Import failed | Import failed. Please check the Excel/CSV format. |
| Backup failed | Backup failed. Please check storage space. |
| No search result | No matching record found. Please try another keyword. |

For developers, detailed errors should be written into log file.

---

## 18. Logging Requirement

Create a local log file for troubleshooting.

Log folder:

```text
logs/app.log
```

Log important actions:

- App started.
- Database opened.
- Record added.
- Record edited.
- Record archived.
- Photo uploaded.
- Import completed.
- Backup completed.
- Restore completed.
- Errors.

Do not show technical logs to normal users.

---

## 19. Suggested App Pages

## 19.1 Visitor Search Page

Main public page for searching records.

Features:

- Search box.
- Search button.
- Clear button.
- Result list.
- Detail popup.
- Language switch.

## 19.2 Admin Login Page

Simple PIN input page.

Features:

- Enter PIN.
- Login.
- Back to search page.

## 19.3 Admin Dashboard

Main admin function menu.

Features:

- Add new record.
- Manage records.
- Import.
- Export backup.
- Restore backup.
- Settings.

## 19.4 Add/Edit Record Page

Form page for record management.

Features:

- Input fields.
- Photo upload.
- Save button.
- Cancel button.

## 19.5 Import Page

Features:

- Select Excel/CSV.
- Preview data.
- Show validation errors.
- Confirm import.

## 19.6 Settings Page

Features:

- Language.
- Association name.
- Admin PIN.
- Open folders.
- Backup settings.

---

## 20. Suggested Technical Stack

## 20.1 Frontend

- React
- TypeScript
- Tailwind CSS or normal CSS
- React Router
- i18next for language handling

## 20.2 Electron

- Electron
- Electron Builder for packaging
- IPC communication between renderer and main process

## 20.3 SQLite

Recommended package:

- better-sqlite3

Reason:

- Simple synchronous SQLite usage.
- Good performance for local desktop apps.
- Easy to manage for small to medium records.

## 20.4 Excel/CSV Import

Recommended packages:

- xlsx for Excel import/export
- papaparse for CSV parsing

## 20.5 File Handling

Use Electron main process for:

- Photo copy.
- Backup creation.
- Restore backup.
- Open folders.
- File dialog.

Do not let the browser renderer directly access sensitive file operations.

---

## 21. Security Requirement

Since the app is offline, security can be simple but still safe.

Requirements:

- Admin PIN required for edit/import/backup/restore.
- Visitor mode cannot modify data.
- Confirm before archive/delete.
- Confirm before restore backup.
- Do not store unnecessary personal sensitive data.
- Keep local data folder protected from accidental deletion.

---

## 22. Accessibility and Old Staff Usability

This is very important.

Requirements:

- Large buttons.
- Large text.
- Simple Chinese wording.
- Avoid too many steps.
- Search box should be very obvious.
- Main functions should be visible without scrolling.
- Use confirmation messages for dangerous actions.
- Allow keyboard Enter key to search.
- Use clear empty-state messages.
- Avoid hidden menus.

Suggested main page wording:

```text
请输入祖先姓名、籍贯或神主牌位置
Enter ancestor name, origin, or tablet location
```

Button:

```text
搜寻 Search
清除 Clear
```

---

## 23. MVP Scope

## 23.1 Must Have

- Electron desktop app.
- SQLite local database.
- Visitor search page.
- Chinese and English language switch.
- Search by partial keyword.
- View record details.
- Admin PIN login.
- Add record.
- Edit record.
- Archive record.
- Upload photo.
- Export backup.
- Import CSV/Excel.

## 23.2 Should Have

- Restore backup.
- Export Excel.
- Auto backup.
- Open photo folder.
- Search result ranking.
- Photo placeholder.

## 23.3 Future Features

- QR code for each ancestor record.
- Print record details.
- Advanced location map of tablet wall.
- Multiple halls/branches.
- Cloud sync option.
- Web version for online search.
- User activity report.
- OCR scan from tablet photo.
- Pinyin auto-generation.

---

## 24. Suggested Development Phases

## Phase 1: Basic Offline Search

- Setup Electron + React + SQLite.
- Create database.
- Import sample records.
- Build search page.
- Build detail popup.
- Add language switch.

## Phase 2: Admin Record Management

- Admin PIN login.
- Add record.
- Edit record.
- Archive record.
- Photo upload.

## Phase 3: Import, Export, and Backup

- Import CSV/Excel.
- Export CSV/Excel.
- Full backup ZIP.
- Restore backup.

## Phase 4: UI Improvement for Old Staff

- Bigger UI.
- Better Chinese wording.
- Card-based results.
- Error messages.
- Testing with actual staff.

---

## 25. Acceptance Criteria

The MVP is considered successful when:

1. The app can be opened without internet.
2. Users can search ancestor records using partial Chinese or English keywords.
3. Users can view full details and photos.
4. Admin can add and edit records.
5. Admin can upload photos.
6. Admin can import sample Excel/CSV data.
7. Admin can backup the database and photos.
8. The UI is readable and easy for old staff.
9. No database server installation is required.
10. The app can be packaged and opened as a normal desktop application.

---

## 26. Final Recommendation

For this project, Electron + SQLite is a good choice because it provides a website-like interface while still behaving like normal desktop software.

It is more suitable than a pure browser CSV version because old staff can simply double-click the app, search records, upload photos, and manage data without understanding folders, servers, or databases.

The most important design principle is simplicity. The app should feel like a search counter system, not a complicated admin system.

Recommended first version focus:

```text
Search → View Details → Admin Add/Edit → Photo Upload → Backup
```

Once this works well, additional features can be added later.
