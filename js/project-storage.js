const ProjectStorage = (function () {
    const DB_NAME = 'school15_projects_db';
    const STORE = 'files';
    const META_KEY = 'school15_projects';
    const MAX_TOTAL = 300 * 1024 * 1024;   // 300 МБ
    const MAX_FILE = 100 * 1024 * 1024;    // 100 МБ на файл
    const IMG = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    const s = db.createObjectStore(STORE, { keyPath: 'key' });
                    s.createIndex('projectId', 'projectId', { unique: false });
                }
            };
        });
    }

    function key(id, path) { return id + '|' + path; }

    function getProjects() {
        try { return JSON.parse(localStorage.getItem(META_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveProjects(list) {
        localStorage.setItem(META_KEY, JSON.stringify(list));
    }

    function readBuffer(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsArrayBuffer(file);
        });
    }

    function readDataUrl(file) {
        return new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result);
            r.onerror = rej;
            r.readAsDataURL(file);
        });
    }

    async function deleteProjectFiles(projectId) {
        const db = await openDB();
        const rows = await new Promise((res, rej) => {
            const r = db.transaction(STORE, 'readonly').objectStore(STORE).index('projectId').getAll(projectId);
            r.onsuccess = () => res(r.result || []);
            r.onerror = () => rej(r.error);
        });
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        rows.forEach(row => store.delete(row.key));
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }

    async function saveProjectFolder(projectId, fileList) {
        const files = Array.from(fileList);
        if (!files.length) throw new Error('Папка пустая');

        let total = 0;
        for (const f of files) {
            if (f.size > MAX_FILE) throw new Error(`Файл слишком большой (макс. 100 МБ): ${f.name}`);
            total += f.size;
        }
        if (total > MAX_TOTAL) throw new Error('Папка слишком большая (макс. ~300 МБ)');

        await deleteProjectFiles(projectId);
        const db = await openDB();
        const folderName = (files[0].webkitRelativePath || '').split('/')[0] || 'Проект';
        let thumb = null;

        return new Promise(async (resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            
            let errorOccurred = false;
            
            tx.oncomplete = () => {
                if (!errorOccurred) {
                    resolve({ folderName, fileCount: files.length, totalSize: total, thumb });
                }
            };
            tx.onerror = (e) => {
                errorOccurred = true;
                reject(tx.error);
            };
            
            for (const file of files) {
                try {
                    const path = file.webkitRelativePath || file.name;
                    const buffer = await readBuffer(file);
                    store.put({
                        key: key(projectId, path),
                        projectId,
                        path,
                        name: file.name,
                        mime: file.type || 'application/octet-stream',
                        size: file.size,
                        data: buffer
                    });
                    
                    if (!thumb && IMG.test(file.name)) {
                        try { thumb = await readDataUrl(file); } catch (e) {}
                    }
                } catch (err) {
                    errorOccurred = true;
                    reject(err);
                    return;
                }
            }
            
            if (thumb) {
                store.put({
                    key: key(projectId, '__thumb__'),
                    projectId,
                    path: '__thumb__',
                    name: 'thumb',
                    mime: 'image/thumb',
                    size: 0,
                    dataUrl: thumb
                });
            }
            
            tx.commit();
        });
    }

    async function listProjectFiles(projectId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(STORE, 'readonly').objectStore(STORE).index('projectId').getAll(projectId);
            req.onsuccess = () => resolve((req.result || []).filter(r => r.path !== '__thumb__'));
            req.onerror = () => reject(req.error);
        });
    }

    async function getThumbDataUrl(projectId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key(projectId, '__thumb__'));
            req.onsuccess = () => resolve(req.result?.dataUrl || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function getFileRecord(projectId, path) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key(projectId, path));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    function downloadRecord(record) {
        const blob = new Blob([record.data], { type: record.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    async function downloadProjectAsZip(projectId) {
        const files = await listProjectFiles(projectId);
        if (!files.length) throw new Error('Нет файлов для скачивания');
        const record = await getFileRecord(projectId, files[0].path);
        if (record) downloadRecord(record);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    }

    return {
        getProjects, saveProjects, saveProjectFolder, deleteProjectFiles,
        listProjectFiles, getThumbDataUrl, getFileRecord, downloadRecord, downloadProjectAsZip,
        formatSize
    };
})();
