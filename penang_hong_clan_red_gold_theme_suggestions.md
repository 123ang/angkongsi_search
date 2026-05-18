# UI Theme & Design Suggestions  
# Penang 洪氏宗祠燉煌堂 — 神主牌资料搜寻系统

## 1. Recommended Theme Direction

After reviewing the current system screenshots and the actual building photo, the recommended theme should follow the real visual identity of **Penang 洪氏宗祠燉煌堂 / 北马洪氏宗祠**.

The building uses a strong traditional Chinese clan hall style:

- Red signboard
- Gold / yellow Chinese characters
- Cream building colour
- Red pillars
- Formal ancestral hall appearance

Therefore, the system should use a:

## **宗祠红金典藏主题**  
English: **Clan Hall Red & Gold Heritage Theme**

This theme feels more suitable than a green-gold theme because red and gold are more familiar, traditional, and visually connected to the actual clan association building.

---

## 2. Suggested Colour Palette

| Purpose | Suggested Colour | Usage |
|---|---:|---|
| Main header | Deep temple red `#8B1E1E` | Main top bar / title area |
| Dark red | `#5C1212` | Header gradient / footer / strong contrast |
| Gold text | `#F2D27A` | Main Chinese title and important labels |
| Antique gold | `#D6A63A` | Buttons, borders, highlights |
| Warm cream background | `#FFF7E8` | Main page background |
| Card background | `#FFFCF4` | Search result cards and forms |
| Soft gold border | `#D8B76A` | Card border and section divider |
| Danger red | `#A33A2B` | Delete/archive button only |

The overall feeling should be:

```text
Traditional Chinese clan hall
Respectful
Warm
Official
Readable
Old-staff friendly
```

---

## 3. Header Design Suggestion

The header should look like a traditional red clan signboard with gold wording.

Suggested Chinese title:

```text
槟城洪氏宗祠燉煌堂
神主牌资料搜寻系统
```

Suggested English title:

```text
Penang Toon Hong Tong Ang Clan Association
Ancestral Tablet Search System
```

Header layout suggestion:

```text
[ Seal / Logo ]  槟城洪氏宗祠燉煌堂
                 神主牌资料搜寻系统
                 Penang Toon Hong Tong Ang Clan Association

                                      中文 | English   管理资料
```

If there is no official logo yet, create a simple circular seal style using:

```text
洪
```

or

```text
燉煌堂
```

The seal can use gold text on a deep red background.

---

## 4. Main Search Page Suggestion

The search page should be very simple because the main users may include older staff and elderly visitors.

### Search Box Text

Chinese placeholder:

```text
请输入姓名、配偶、籍贯或神主牌位置
```

English placeholder:

```text
Enter name, spouse, origin, or tablet location
```

### Helper Text

Add a small helper line below the search box:

```text
可输入：中文姓名、英文名、配偶、籍贯、位置
```

English:

```text
You may search by Chinese name, English name, spouse, origin, or location.
```

This helps users understand what they can search.

---

## 5. Search Result Card Design

Your current result card is already clean, but it can be made more balanced and easier to read.

Suggested layout:

```text
[Photo]  张德成       A0003
         Cheong Tak Seng

         配偶：李玉珍、王月娥
         位置：中殿甲区第一层 03号
         籍贯：海南文昌

                                      [查看详情]
```

### Design Notes

- Use larger Chinese name.
- Put location clearly because this is the most important information.
- Avoid too much empty space in the middle of the card.
- Use gold border and cream background.
- Use dark red or gold button for “查看详情”.

---

## 6. Detail Modal / Detail Page Suggestion

The detail modal should focus on helping users quickly find the tablet location.

### Recommended information order:

```text
张德成
Cheong Tak Seng

[Large Photo]

神主牌位置
中殿甲区第一层 03号

记录编号：A0003
配偶：李玉珍、王月娥
籍贯：海南文昌
生年：民国时期
卒年：1976
备注：旧档案转录
最后更新：2026/05/17
```

### Important Suggestion

The **tablet location** should be highlighted near the top.

Use a gold-highlight box:

```text
神主牌位置
中殿甲区第一层 03号
```

This is because visitors usually search mainly to know where the ancestor tablet is located.

### Detail Modal Buttons

Suggested buttons:

```text
[打印 Print]   [关闭 Close]
```

Print can be added later, but the UI can reserve space for it.

---

## 7. Admin Screen Suggestion for Old Staff

Your admin screen is functional, but for old staff, I suggest avoiding too many small input fields in one row.

Use bigger sections instead of showing everything as one long form.

Recommended form sections:

```text
基本资料
- 记录编号
- 中文姓名
- 英文名
- 配偶

神主牌位置
- 位置
- 区域
- 排 / 层 / 号

其他资料
- 籍贯
- 生年
- 卒年
- 备注

照片
- 上传照片
```

This makes the admin page less scary and easier for older staff to understand.

---

## 8. Admin Page Layout Suggestion

Instead of a dense layout, use two clear panels:

```text
左边：记录列表
右边：资料表格
```

Example:

```text
[管理记录]

左边：
- 张德成 A0003
- 林秀英 A0002
- 洪文杰 A0001

右边：
基本资料
神主牌位置
其他资料
照片
[保存] [取消]
```

### Important UI Rules for Admin Page

- Use large labels.
- Use wide input boxes.
- Avoid too many columns.
- Use section titles.
- Keep “保存” and “取消” always visible.
- Use confirmation before delete/archive.
- Prefer “Archive / 封存” instead of permanent delete.

---

## 9. Button Style Suggestion

Primary button:

```text
Background: Deep temple red
Text: Gold / white
```

Example:

```text
[搜寻]
[查看详情]
[保存]
```

Secondary button:

```text
Background: Light gold
Text: Dark red
```

Example:

```text
[清除]
[取消]
[返回]
```

Danger button:

```text
Background: Muted red
Text: White
```

Example:

```text
[删除]
```

However, for safety, I recommend using:

```text
[封存]
```

instead of:

```text
[删除]
```

This prevents accidental permanent deletion.

---

## 10. Typography Suggestion

For older users, font size should be bigger than normal websites.

| Element | Suggested Size |
|---|---:|
| Main title | 32px–40px |
| Search input | 22px–26px |
| Main buttons | 20px–22px |
| Result name | 24px–28px |
| Result details | 18px–22px |
| Form labels | 18px–20px |
| Form inputs | 20px–22px |

Suggested fonts:

- Chinese: `Noto Serif TC`, `Noto Sans TC`, `Microsoft JhengHei`
- English: `Inter`, `Arial`, `Noto Sans`

For the title, a serif-style Chinese font can look more traditional.  
For normal text, use a clean sans-serif font for readability.

---

## 11. Background and Pattern Suggestion

Use a warm cream background, not pure white.

Suggested:

```text
#FFF7E8
```

Optional subtle patterns:

- Cloud pattern
- Chinese lattice pattern
- Soft wave pattern
- Very light gold floral pattern

Important: The pattern should be very light and should not affect readability.

---

## 12. Footer Suggestion

Add a simple footer to make the system feel official.

Example:

```text
慎终追远 · 饮水思源
Honor Our Ancestors, Cherish Our Roots
```

Optional:

```text
槟城洪氏宗祠燉煌堂 © 2026
```

---

## 13. Recommended Final Visual Direction

The final design should feel like:

```text
A respectful traditional Chinese clan hall archive system,
with red and gold identity,
warm cream background,
large readable text,
and a simple interface for older staff.
```

Avoid making it look too modern, too dark, or too complicated.

---

## 14. Final Design Summary for Developer

Use this as the design instruction:

```text
Please redesign the Electron + SQLite ancestor tablet search system using a “Clan Hall Red & Gold Heritage Theme” for Penang 洪氏宗祠燉煌堂.

The design should use a deep temple red header, gold Chinese title text, warm cream background, cream cards, gold borders, and large readable fonts.

The system is mainly used by old staff and visitors, so the interface must be simple, clear, and easy to operate.

For the search page, use a large search input with bilingual placeholder text, clear search and reset buttons, and result cards that highlight the ancestor name, spouse, origin, and especially tablet location.

For the detail modal, make the photo large and highlight the tablet location at the top using a gold box.

For the admin page, avoid too many small input fields in one row. Organize the form into bigger sections:
1. Basic Information
2. Tablet Location
3. Other Information
4. Photo

Use large buttons, large labels, clear confirmation messages, and avoid permanent delete where possible. Use archive/seal records instead.
```

---

## 15. Recommended MVP UI Screens

The first version should include these screens:

1. Search page
2. Search result card
3. Detail modal / detail page
4. Admin PIN page
5. Admin record management page
6. Add/edit record form
7. Import/export/backup page
8. Settings page

The most important screen is the search page because it is what visitors and old staff will use most often.
