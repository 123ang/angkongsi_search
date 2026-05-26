import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import type { AncestorInput, AncestorRecord, AppSettings } from './types';

type Page = 'search' | 'manage';
type ManageTab = 'records' | 'settings';

const emptyRecord: AncestorInput = {
  record_code: '',
  chinese_name: '',
  english_name: '',
  spouses: [],
  tablet_location: '',
  birth_year: '',
  death_year: '',
  origin_place: '',
  photo_path: '',
  remarks: ''
};

const fallbackSettings: AppSettings = {
  language: 'zh',
  associationName: '宗亲会神主牌资料',
  adminPin: '123456',
  autoBackup: false
};

function App() {
  const [settings, setSettings] = useState<AppSettings>(fallbackSettings);
  const [page, setPage] = useState<Page>('search');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<AncestorRecord[]>([]);
  const [selected, setSelected] = useState<AncestorRecord | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState(dictionary.zh.enterKeyword);

  const t = useMemo(() => dictionary[settings.language], [settings.language]);

  useEffect(() => {
    void window.ancestorApi.settings.get().then((savedSettings) => {
      setSettings(savedSettings);
      setMessage(dictionary[savedSettings.language].enterKeyword);
    });
  }, []);

  useEffect(() => {
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const record of [...results, ...(selected ? [selected] : [])]) {
        if (record.photo_path) urls[record.photo_path] = await window.ancestorApi.photos.url(record.photo_path);
      }
      setPhotoUrls(urls);
    };
    void loadUrls();
  }, [results, selected]);

  const runSearch = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      const rows = await window.ancestorApi.records.list();
      setResults(rows);
      setMessage(rows.length ? `${t.found} ${rows.length} ${t.records}` : t.noRecords);
      return;
    }
    const rows = await window.ancestorApi.records.search({ keyword: trimmed });
    setResults(rows);
    setMessage(rows.length ? `${t.found} ${rows.length} ${t.records}` : t.noRecords);
  };

  const switchLanguage = async () => {
    const next = { ...settings, language: settings.language === 'zh' ? 'en' : 'zh' } as AppSettings;
    const saved = await window.ancestorApi.settings.set(next);
    setSettings(saved);
    setMessage(dictionary[saved.language].enterKeyword);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="clan-seal">洪</div>
          <div>
            <p className="association">{t.association}</p>
            <h1>{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost-button" onClick={switchLanguage}>中文 | English</button>
          <button className="ghost-button" onClick={() => setPage(page === 'search' ? 'manage' : 'search')}>
            {page === 'search' ? t.manageData : t.backSearch}
          </button>
        </div>
      </header>

      {page === 'search' && (
        <main className="search-page">
          <section className="search-panel">
            <label htmlFor="searchBox">{t.searchLabel}</label>
            <div className="search-row">
              <input
                id="searchBox"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void runSearch();
                }}
                placeholder={t.placeholder}
                autoFocus
              />
              <button className="primary-button" onClick={() => void runSearch()}>{t.search}</button>
              <button
                className="secondary-button"
                onClick={() => {
                  setKeyword('');
                  setResults([]);
                  setMessage(t.enterKeyword);
                }}
              >
                {t.clear}
              </button>
            </div>
            <p className="helper">{message}</p>
            <p className="helper search-hint">{t.searchHint}</p>
          </section>

          <section className="results-grid" aria-label={t.results}>
            {results.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                photoUrl={record.photo_path ? photoUrls[record.photo_path] : ''}
                onOpen={() => setSelected(record)}
                t={t}
              />
            ))}
          </section>
        </main>
      )}

      {page === 'manage' && <ManageArea t={t} />}
      {selected && (
        <DetailModal
          record={selected}
          photoUrl={selected.photo_path ? photoUrls[selected.photo_path] : ''}
          t={t}
          onClose={() => setSelected(null)}
        />
      )}
      <footer className="footer-motto">{t.footerMotto}</footer>
    </div>
  );
}

function RecordCard({ record, photoUrl, onOpen, t }: { record: AncestorRecord; photoUrl: string; onOpen: () => void; t: typeof dictionary.zh }) {
  return (
    <article className="record-card">
      <PhotoBox photoUrl={photoUrl} small t={t} />
      <div className="record-main">
        <div className="record-title">
          <strong>{record.chinese_name}</strong>
          <span>{record.record_code}</span>
        </div>
        <p className="secondary-name">{record.english_name || t.noEnglish}</p>
        <div className="record-lines">
          <p><b>{t.spouse}</b>{displaySpouses(record.spouses, t.none)}</p>
          <p><b>{t.location}</b>{record.tablet_location}</p>
          <p><b>{t.origin}</b>{record.origin_place || t.none}</p>
        </div>
      </div>
      <button className="primary-button detail-button" onClick={onOpen}>{t.viewDetails}</button>
    </article>
  );
}

function DetailModal({ record, photoUrl, t, onClose }: { record: AncestorRecord; photoUrl: string; t: typeof dictionary.zh; onClose: () => void }) {
  const details = [
    [t.recordCode, record.record_code],
    [t.chineseName, record.chinese_name],
    [t.englishName, record.english_name],
    [t.spouses, displaySpouses(record.spouses, t.none)],
    [t.location, record.tablet_location],
    [t.birthYear, record.birth_year],
    [t.deathYear, record.death_year],
    [t.origin, record.origin_place],
    [t.remarks, record.remarks],
    [t.updatedAt, new Date(record.updated_at).toLocaleString()]
  ];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="detail-modal">
        <div className="modal-header">
          <div>
            <h2>{record.chinese_name}</h2>
            {record.english_name && <p className="modal-subtitle">{record.english_name}</p>}
          </div>
          <button className="icon-button" onClick={onClose}>X</button>
        </div>
        <div className="detail-body">
          <PhotoBox photoUrl={photoUrl} t={t} />
          <div>
            <div className="location-highlight">
              <span>{t.tabletLocation}</span>
              <strong>{record.tablet_location}</strong>
            </div>
          <div className="detail-list">
            {details.map(([label, value]) => (
              <div className="detail-row" key={label}>
                <span>{label}</span>
                <strong>{value || t.none}</strong>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoBox({ photoUrl, small = false, t }: { photoUrl: string; small?: boolean; t: typeof dictionary.zh }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <div
        className={small ? 'photo-box small' : 'photo-box'}
        role={photoUrl ? 'button' : undefined}
        tabIndex={photoUrl ? 0 : undefined}
        onClick={() => photoUrl && setPreviewOpen(true)}
        onKeyDown={(event) => {
          if (photoUrl && (event.key === 'Enter' || event.key === ' ')) setPreviewOpen(true);
        }}
      >
        {photoUrl ? <img src={photoUrl} alt="tablet" /> : <span>{t.noPhoto}</span>}
      </div>
      {previewOpen && <PhotoPreview photoUrl={photoUrl} onClose={() => setPreviewOpen(false)} />}
    </>
  );
}

function PhotoPreview({ photoUrl, onClose }: { photoUrl: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop photo-preview-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="photo-preview-modal" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button photo-preview-close" onClick={onClose}>X</button>
        <img src={photoUrl} alt="tablet preview" />
      </div>
    </div>
  );
}

function ManageArea({ t }: { t: typeof dictionary.zh }) {
  const [tab, setTab] = useState<ManageTab>('records');
  const [records, setRecords] = useState<AncestorRecord[]>([]);
  const [editing, setEditing] = useState<AncestorRecord | null>(null);
  const [form, setForm] = useState<AncestorInput>(emptyRecord);
  const [notice, setNotice] = useState('');
  const [paths, setPaths] = useState<{ backups: string } | null>(null);

  const refresh = async () => setRecords(await window.ancestorApi.records.list());

  useEffect(() => {
    void refresh();
    void window.ancestorApi.paths.get().then((appPaths) => setPaths({ backups: appPaths.backupsDir }));
  }, []);

  const startAdd = async () => {
    setEditing(null);
    setForm({ ...emptyRecord, record_code: await window.ancestorApi.records.nextCode() });
    setTab('records');
  };

  const startEdit = (record: AncestorRecord) => {
    setEditing(record);
    setForm({ ...record, spouses: normalizeSpouses(record.spouses) });
    setTab('records');
  };

  const save = async () => {
    try {
      if (!window.confirm(t.confirmSave)) return;
      const cleanedForm = { ...form, spouses: normalizeSpouses(form.spouses) };
      if (editing) await window.ancestorApi.records.update(editing.id, cleanedForm);
      else await window.ancestorApi.records.create(cleanedForm);
      setNotice(t.saved);
      setEditing(null);
      setForm(emptyRecord);
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const choosePhoto = async () => {
    const filename = await window.ancestorApi.photos.choose(form.record_code || 'record');
    if (!filename) return;

    const nextForm = { ...form, spouses: normalizeSpouses(form.spouses), photo_path: filename };
    setForm(nextForm);

    if (editing) {
      const updated = await window.ancestorApi.records.update(editing.id, nextForm);
      setEditing(updated);
      setForm({ ...updated, spouses: normalizeSpouses(updated.spouses) });
      setNotice(t.photoUploaded);
      await refresh();
    }
  };

  const removePhoto = async () => {
    if (!form.photo_path || !window.confirm(t.confirmDeletePhoto)) return;
    await window.ancestorApi.photos.delete(form.photo_path);

    const nextForm = { ...form, photo_path: '' };
    setForm(nextForm);

    if (editing) {
      const updated = await window.ancestorApi.records.update(editing.id, { ...nextForm, spouses: normalizeSpouses(nextForm.spouses) });
      setEditing(updated);
      setForm({ ...updated, spouses: normalizeSpouses(updated.spouses) });
      await refresh();
    }

    setNotice(t.photoDeleted);
  };

  const remove = async (record: AncestorRecord) => {
    if (!window.confirm(t.confirmDelete)) return;
    await window.ancestorApi.records.delete(record.id);
    setNotice(t.deleted);
    if (editing?.id === record.id) {
      setEditing(null);
      setForm(emptyRecord);
    }
    await refresh();
  };

  const backup = async () => {
    const result = await window.ancestorApi.createBackup();
    setNotice(`${t.backupDone}: ${result.backupPath}`);
  };

  const restore = async () => {
    if (!window.confirm(t.confirmRestore)) return;
    const result = await window.ancestorApi.restoreBackup();
    if (result) {
      setNotice(`${t.restoreDone}: ${result.backupPath} (${result.restoredPhotos} ${t.photos})`);
      await refresh();
    }
  };

  const importData = async () => {
    if (!window.confirm(t.confirmImport)) return;
    try {
      const result = await window.ancestorApi.data.importRecords();
      if (result) {
        setNotice(`${t.importDone}: ${result.inserted} ${t.importInserted}, ${result.updated} ${t.importUpdated}. ${t.importBackup}: ${result.backupPath}`);
        setTab('records');
        await refresh();
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const exportCsv = async () => {
    try {
      const result = await window.ancestorApi.data.exportCsv();
      if (result) setNotice(`${t.exportDone}: ${result.filePath} (${result.recordCount} ${t.records})`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const exportExcel = async () => {
    try {
      const result = await window.ancestorApi.data.exportExcel();
      if (result) setNotice(`${t.exportDone}: ${result.filePath} (${result.recordCount} ${t.records})`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const downloadTemplate = async () => {
    try {
      const result = await window.ancestorApi.data.downloadTemplate();
      if (result) setNotice(`${t.templateDone}: ${result.filePath}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <main className="admin-area">
      <section className="admin-toolbar manage-header">
        <div className="button-row">
          <button className={tab === 'records' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('records')}>{t.recordsTab}</button>
          <button className={tab === 'settings' ? 'primary-button' : 'secondary-button'} onClick={() => setTab('settings')}>{t.settings}</button>
        </div>
        <button className="primary-button" onClick={() => void startAdd()}>{t.addRecord}</button>
      </section>

      {notice && <p className="notice">{notice}</p>}

      {tab === 'records' && (
        <>
          <section className="admin-layout">
            <div className="record-list-panel">
              <h2>{t.manageRecords}</h2>
              <div className="admin-records">
                {records.map((record) => (
                  <article className="admin-record" key={record.id}>
                    <div>
                      <strong>{record.chinese_name}</strong>
                      <span>{record.record_code} · {record.tablet_location}</span>
                    </div>
                    <div className="admin-row-actions">
                      <button className="secondary-button" onClick={() => startEdit(record)}>{t.edit}</button>
                      <button className="danger-button" onClick={() => void remove(record)}>{t.delete}</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="form-panel">
              <div className="form-header">
                <h2>{editing ? t.editRecord : t.addRecord}</h2>
                <div className="button-row">
                  <button className="primary-button" onClick={() => void save()}>{t.save}</button>
                  <button className="secondary-button" onClick={() => { setEditing(null); setForm(emptyRecord); }}>{t.cancel}</button>
                </div>
              </div>
              <RecordForm t={t} form={form} setForm={setForm} onChoosePhoto={() => void choosePhoto()} onDeletePhoto={() => void removePhoto()} />
            </div>
          </section>
        </>
      )}

      {tab === 'settings' && (
        <section className="settings-panel standalone-settings">
          <h2>{t.settings}</h2>

          <div className="settings-section">
            <h3>{t.dataExchange}</h3>
            <p className="helper">{t.importHelp}</p>
            <div className="button-row">
              <button className="secondary-button" onClick={() => void downloadTemplate()}>{t.downloadTemplate}</button>
              <button className="primary-button" onClick={() => void importData()}>{t.importData}</button>
              <button className="secondary-button" onClick={() => void exportExcel()}>{t.exportExcel}</button>
              <button className="secondary-button" onClick={() => void exportCsv()}>{t.exportCsv}</button>
            </div>
          </div>

          <div className="settings-section">
            <h3>{t.backupSettings}</h3>
            <p className="helper">{t.backupsFolder}: {paths?.backups || ''}</p>
            <div className="button-row">
              <button className="secondary-button" onClick={() => void backup()}>{t.backup}</button>
              <button className="danger-button" onClick={() => void restore()}>{t.restoreBackup}</button>
            </div>
            <p className="helper">{t.restoreHelp}</p>
          </div>
        </section>
      )}
    </main>
  );
}

function RecordForm({
  t,
  form,
  setForm,
  onChoosePhoto,
  onDeletePhoto
}: {
  t: typeof dictionary.zh;
  form: AncestorInput;
  setForm: (record: AncestorInput) => void;
  onChoosePhoto: () => void;
  onDeletePhoto: () => void;
}) {
  const field = (key: keyof AncestorInput, label: string, required = false) => (
    <label className="field">
      <span>{label}{required ? ' *' : ''}</span>
      <input value={(form[key] as string) || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </label>
  );

  const spouses = formSpouses(form.spouses);

  return (
    <div className="record-form sectioned-form">
      <section className="form-section full">
        <h3>{t.basicInfo}</h3>
        <div className="section-grid">
          {field('record_code', t.recordCode)}
          {field('chinese_name', t.chineseName, true)}
          {field('english_name', t.englishName)}
        </div>
        <div className="field full spouse-field">
          <span>{t.spouses}</span>
          <div className="spouse-list">
            {spouses.map((spouse, index) => (
              <div className="search-row spouse-row" key={index}>
                <input
                  value={spouse}
                  onChange={(event) => {
                    const next = [...spouses];
                    next[index] = event.target.value;
                    setForm({ ...form, spouses: next });
                  }}
                  placeholder={t.spouseName}
                />
                <button
                  className="danger-button"
                  onClick={() => setForm({ ...form, spouses: spouses.filter((_, spouseIndex) => spouseIndex !== index) })}
                >
                  {t.remove}
                </button>
              </div>
            ))}
            <button className="secondary-button add-spouse-button" onClick={() => setForm({ ...form, spouses: [...spouses, ''] })}>{t.addSpouse}</button>
          </div>
        </div>
      </section>

      <section className="form-section full location-section">
        <h3>{t.tabletLocation}</h3>
        {field('tablet_location', t.location, true)}
      </section>

      <section className="form-section full">
        <h3>{t.otherInfo}</h3>
        <div className="section-grid">
          {field('origin_place', t.origin)}
          {field('birth_year', t.birthYear)}
          {field('death_year', t.deathYear)}
        </div>
        <label className="field full">
          <span>{t.remarks}</span>
          <textarea value={form.remarks || ''} onChange={(event) => setForm({ ...form, remarks: event.target.value })} />
        </label>
      </section>

      <section className="form-section full">
        <h3>{t.photo}</h3>
        <FormPhotoField t={t} photoPath={form.photo_path || ''} onChoosePhoto={onChoosePhoto} onDeletePhoto={onDeletePhoto} />
      </section>
    </div>
  );
}

function FormPhotoField({
  t,
  photoPath,
  onChoosePhoto,
  onDeletePhoto
}: {
  t: typeof dictionary.zh;
  photoPath: string;
  onChoosePhoto: () => void;
  onDeletePhoto: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!photoPath) {
      setPhotoUrl('');
      return;
    }
    void window.ancestorApi.photos.url(photoPath).then((url) => {
      if (!cancelled) setPhotoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  return (
    <div className="field full">
      <span>{t.photo}</span>
      <div className="form-photo-row">
        <PhotoBox photoUrl={photoUrl} small t={t} />
        <div className="photo-actions vertical">
          <button className="secondary-button" onClick={onChoosePhoto}>{t.uploadPhoto}</button>
          {photoPath && <button className="danger-button" onClick={onDeletePhoto}>{t.deletePhoto}</button>}
        </div>
      </div>
    </div>
  );
}

function formSpouses(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return value.split(/[、,，\n]/).map((item) => item.trim());
    }
  }
  return [];
}

function normalizeSpouses(value: unknown): string[] {
  return formSpouses(value).map((item) => item.trim()).filter(Boolean);
}

function displaySpouses(value: unknown, fallback: string): string {
  const spouses = normalizeSpouses(value);
  return spouses.length ? spouses.join('、') : fallback;
}

const dictionary = {
  zh: {
    association: '槟城洪氏宗祠燉煌堂',
    title: '神主牌资料搜寻系统',
    subtitle: 'Penang Toon Hong Tong Ang Clan Association',
    footerMotto: '饮水思源',
    manageData: '整理资料',
    backSearch: '返回搜寻',
    recordsTab: '记录资料',
    searchLabel: '请输入资料搜寻',
    placeholder: '请输入姓名、配偶、籍贯或神主牌位置',
    searchHint: '可输入：中文姓名、英文名、配偶、籍贯、位置',
    search: '搜寻',
    clear: '清除',
    enterKeyword: '请输入祖先姓名、籍贯或神主牌位置。',
    found: '找到',
    records: '笔记录',
    noRecords: '没有找到相关记录，请换一个关键词。',
    results: '搜寻结果',
    spouse: '配偶：',
    spouses: '配偶',
    spouseName: '配偶姓名',
    addSpouse: '新增配偶',
    remove: '移除',
    location: '位置',
    tabletLocation: '神主牌位置',
    origin: '籍贯',
    none: '无',
    noEnglish: '暂无英文名',
    viewDetails: '查看详情',
    recordCode: '记录编号',
    chineseName: '中文姓名',
    englishName: '英文名',
    birthYear: '生年',
    deathYear: '卒年',
    remarks: '备注',
    updatedAt: '最后更新',
    addRecord: '新增记录',
    editRecord: '编辑记录',
    manageRecords: '管理记录',
    dataExchange: 'Excel / CSV 导入导出',
    downloadTemplate: '下载导入模板',
    importData: '导入 Excel / CSV',
    exportExcel: '导出 Excel',
    exportCsv: '导出 CSV',
    importHelp: '导入会新增记录，并以记录编号更新已有记录。导入前会自动建立 ZIP 备份。模板第一行是可使用的栏目表头。',
    confirmImport: '确定要导入 Excel / CSV 吗？导入前会先建立一份 ZIP 备份；相同记录编号会被更新。',
    importDone: '导入完成',
    importInserted: '新增',
    importUpdated: '更新',
    importBackup: '导入前备份',
    exportDone: '导出完成',
    templateDone: '模板已下载',
    backupSettings: '备份与恢复',
    backup: '建立备份',
    edit: '编辑',
    delete: '删除',
    confirmSave: '确定要保存此记录的更改吗？',
    confirmDelete: '确定要删除此记录吗？此操作不能复原。',
    confirmDeletePhoto: '确定要删除这张照片吗？',
    saved: '已保存。',
    deleted: '已删除。',
    photoUploaded: '照片已上传。',
    photoDeleted: '照片已删除。',
    backupDone: '备份已建立',
    save: '保存',
    cancel: '取消',
    settings: '设置',
    backupsFolder: '备份 ZIP 位置',
    restoreBackup: '恢复备份 ZIP',
    restoreDone: '备份已恢复',
    photos: '张照片',
    confirmRestore: '确定要恢复备份吗？目前资料会先自动备份一份，然后用所选备份覆盖。',
    restoreHelp: '备份会存放在 app-data/backups，格式是 backup_时间.zip。恢复时请选择 ZIP 文件。',
    basicInfo: '基本资料',
    otherInfo: '其他资料',
    photo: '照片',
    uploadPhoto: '上传照片',
    deletePhoto: '删除照片',
    noPhoto: '暂无照片'
  },
  en: {
    association: 'Penang Toon Hong Tong Ang Clan Association',
    title: 'Ancestral Tablet Search System',
    subtitle: '槟城洪氏宗祠燉煌堂',
    footerMotto: 'Honor Our Ancestors, Cherish Our Roots',
    manageData: 'Edit Records',
    backSearch: 'Back to Search',
    recordsTab: 'Records',
    searchLabel: 'Search records',
    placeholder: 'Enter name, spouse, origin, or tablet location',
    searchHint: 'You may search by Chinese name, English name, spouse, origin, or location.',
    search: 'Search',
    clear: 'Clear',
    enterKeyword: 'Enter an ancestor name, origin, or tablet location.',
    found: 'Found',
    records: 'records',
    noRecords: 'No matching record found. Try another keyword.',
    results: 'Search Results',
    spouse: 'Spouse: ',
    spouses: 'Spouses',
    spouseName: 'Spouse name',
    addSpouse: 'Add spouse',
    remove: 'Remove',
    location: 'Location',
    tabletLocation: 'Tablet Location',
    origin: 'Origin',
    none: 'None',
    noEnglish: 'No English name',
    viewDetails: 'View Details',
    recordCode: 'Record Code',
    chineseName: 'Chinese Name',
    englishName: 'English Name',
    birthYear: 'Birth Year',
    deathYear: 'Death Year',
    remarks: 'Remarks',
    updatedAt: 'Last Updated',
    addRecord: 'Add Record',
    editRecord: 'Edit Record',
    manageRecords: 'Manage Records',
    dataExchange: 'Excel / CSV Import and Export',
    downloadTemplate: 'Download Template',
    importData: 'Import Excel / CSV',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    importHelp: 'Import adds new records and updates existing records with the same record code. A ZIP backup is created before import. The template first row contains the supported column headers.',
    confirmImport: 'Import this Excel / CSV file? A ZIP backup will be created first; matching record codes will be updated.',
    importDone: 'Import complete',
    importInserted: 'inserted',
    importUpdated: 'updated',
    importBackup: 'pre-import backup',
    exportDone: 'Export complete',
    templateDone: 'Template downloaded',
    backupSettings: 'Backup and Restore',
    backup: 'Create Backup',
    edit: 'Edit',
    delete: 'Delete',
    confirmSave: 'Are you sure you want to save changes to this record?',
    confirmDelete: 'Delete this record? This cannot be undone.',
    confirmDeletePhoto: 'Delete this photo?',
    saved: 'Saved.',
    deleted: 'Deleted.',
    photoUploaded: 'Photo uploaded.',
    photoDeleted: 'Photo deleted.',
    backupDone: 'Backup created',
    save: 'Save',
    cancel: 'Cancel',
    settings: 'Settings',
    backupsFolder: 'Backup ZIP Location',
    restoreBackup: 'Restore Backup ZIP',
    restoreDone: 'Backup restored',
    photos: 'photos',
    confirmRestore: 'Restore this backup? The current data will be backed up first, then replaced by the selected backup.',
    restoreHelp: 'Backups are stored in app-data/backups as backup_timestamp.zip. To restore, select the ZIP file.',
    basicInfo: 'Basic Information',
    otherInfo: 'Other Information',
    photo: 'Photo',
    uploadPhoto: 'Upload Photo',
    deletePhoto: 'Delete Photo',
    noPhoto: 'No photo'
  }
};

async function bootstrap(): Promise<void> {
  if (__BROWSER_BUILD__) {
    await import('./browser/api');
  }
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
