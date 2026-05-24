const ProjectStorage = (function () {
    const DB_NAME = 'school15_projects_db';
    const STORE = 'files';
    const META_KEY = 'school15_projects';

    // Открываем базу
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 2);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'key' });
                }
            };
        });
    }

    function key(id, name) {
        return `${id}|${name}`;
    }

    // Получить все проекты (метаданные)
    function getProjects() {
        try {
            return JSON.parse(localStorage.getItem(META_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    // Сохранить метаданные
    function saveProjects(list) {
        localStorage.setItem(META_KEY, JSON.stringify(list));
    }

    // Удалить все файлы проекта
    async function deleteProjectFiles(projectId) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        
        return new Promise((resolve, reject) => {
            req.onsuccess = () => {
                const all = req.result || [];
                const toDelete = all.filter(r => r.projectId === projectId);
                toDelete.forEach(r => store.delete(r.key));
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            };
            req.onerror = () => reject(req.error);
        });
    }

    // Сохранить файлы проекта (папка или одиночный файл)
    async function saveProjectFolder(projectId, fileList) {
        const files = Array.from(fileList);
        if (!files.length) throw new Error('Нет файлов');

        // Удаляем старые файлы этого проекта
        await deleteProjectFiles(projectId);
        
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        
        // Сохраняем каждый файл
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
        
        // Ждём завершения
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        
        return { fileCount: files.length };
    }

    // Получить список файлов проекта
    async function listProjectFiles(projectId) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        
        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => {
                const all = req.result || [];
                const filtered = all.filter(r => r.projectId === projectId);
                resolve(filtered);
            };
            req.onerror = () => reject(req.error);
        });
    }

    // Получить конкретный файл
    async function getFileRecord(projectId, fileName) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        
        return new Promise((resolve, reject) => {
            const req = store.get(key(projectId, fileName));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    // Скачать файл
    function downloadRecord(record) {
        const blob = new Blob([record.data], { type: record.mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = record.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    // Форматировать размер
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
