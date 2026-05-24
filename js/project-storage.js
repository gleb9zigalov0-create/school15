const ProjectStorage = (function () {
    const DB_NAME = 'school15_projects_db';
    const STORE = 'files';
    const META_KEY = 'school15_projects';

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
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

    async function saveProjectFiles(projectId, files) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        
        for (const file of files) {
            const data = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsArrayBuffer(file);
            });
            store.put({
                key: key(projectId, file.name),
                projectId,
                name: file.name,
                type: file.type,
                size: file.size,
                data
            });
        }
        
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    async function getProjectFiles(projectId) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        
        const all = await new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
        });
        
        return all.filter(r => r.projectId === projectId);
    }

    async function downloadProject(projectId) {
        const files = await getProjectFiles(projectId);
        if (!files.length) return alert('Файлы не найдены');
        
        const file = files[0];
        const blob = new Blob([file.data], { type: file.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function deleteProject(projectId) {
        const files = await getProjectFiles(projectId);
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        for (const file of files) {
            store.delete(key(projectId, file.name));
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        
        const projects = getProjects().filter(p => p.id !== projectId);
        saveProjects(projects);
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    }

    return {
        getProjects,
        saveProjects,
        saveProjectFiles,
        getProjectFiles,
        downloadProject,
        deleteProject,
        formatSize
    };
})();
