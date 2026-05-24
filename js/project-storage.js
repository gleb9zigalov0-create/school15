const ProjectStorage = (function () {
    const DB_NAME = 'school15_projects_db';
    const STORE = 'files';
    const META_KEY = 'school15_projects';
    const DB_VERSION = 3;

    async function openDB() {
        // Если старая база с меньшей версией — удаляем её
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            return new Promise((resolve, reject) => {
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve(req.result);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (db.objectStoreNames.contains(STORE)) {
                        db.deleteObjectStore(STORE);
                    }
                    db.createObjectStore(STORE, { keyPath: 'key' });
                };
            });
        } catch (err) {
            // Если ошибка версии — удаляем базу и пробуем снова
            return new Promise((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(DB_NAME);
                deleteReq.onsuccess = () => {
                    const newReq = indexedDB.open(DB_NAME, DB_VERSION);
                    newReq.onerror = () => reject(newReq.error);
                    newReq.onsuccess = () => resolve(newReq.result);
                    newReq.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        db.createObjectStore(STORE, { keyPath: 'key' });
                    };
                };
                deleteReq.onerror = () => reject(deleteReq.error);
            });
        }
    }

    function key(id, name) {
        return `${id}|${name}`;
    }

    function getProjects() {
        try {
            return JSON.parse(localStorage.getItem(META_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveProjects(list) {
        localStorage.setItem(META_KEY, JSON.stringify(list));
    }

    async function deleteProjectFiles(projectId) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const request = store.getAll();
        
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const all = request.result || [];
                const toDelete = all.filter(r => r.projectId === projectId);
                toDelete.forEach(r => store.delete(r.key));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function saveProjectFolder(projectId, fileList) {
        const files = Array.from(fileList);
        if (!files.length) throw new Error('Нет файлов');
        
        await deleteProjectFiles(projectId);
        
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        
        for (const file of files) {
            const buffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            });
            
            store.put({
                key: key(projectId, file.name),
                projectId: projectId,
                name: file.name,
                mime: file.type || 'application/octet-stream',
                size: file.size,
                data: buffer
            });
        }
        
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        
        return { fileCount: files.length };
    }

    async function listProjectFiles(projectId) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result || [];
                const filtered = all.filter(r => r.projectId === projectId);
                resolve(filtered);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async function getFileRecord(projectId, fileName) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key(projectId, fileName));
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    function downloadRecord(record) {
        if (!record || !record.data) {
            alert('Файл не найден');
            return;
        }
        const blob = new Blob([record.data], { type: record.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    }

    return {
        getProjects,
        saveProjects,
        saveProjectFolder,
        deleteProjectFiles,
        listProjectFiles,
        getFileRecord,
        downloadRecord,
        formatSize
    };
})();
