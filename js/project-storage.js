const ProjectStorage = (function () {
    const META_KEY = 'school15_projects';
    let storage = null;

    function init() {
        if (firebase && firebase.storage && !storage) {
            storage = firebase.storage();
        }
    }

    function getProjects() {
        try { return JSON.parse(localStorage.getItem(META_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveProjects(list) {
        localStorage.setItem(META_KEY, JSON.stringify(list));
    }

    async function uploadProjectFile(projectId, file) {
        if (!storage) init();
        const fileRef = storage.ref().child(`projects/${projectId}/${file.name}`);
        await fileRef.put(file);
        const downloadURL = await fileRef.getDownloadURL();
        return { name: file.name, url: downloadURL, size: file.size, mime: file.type };
    }

    async function saveProjectFolder(projectId, fileList) {
        const files = Array.from(fileList);
        if (!files.length) throw new Error('Нет файлов');

        const uploaded = [];
        for (const file of files) {
            const result = await uploadProjectFile(projectId, file);
            uploaded.push(result);
        }
        return { fileCount: uploaded.length, files: uploaded };
    }

    async function deleteProjectFiles(projectId) {
        if (!storage) init();
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        if (project && project.files) {
            for (const file of project.files) {
                try {
                    const fileRef = storage.refFromURL(file.url);
                    await fileRef.delete();
                } catch (e) { console.warn('Не удалось удалить файл:', file.name); }
            }
        }
    }

    function listProjectFiles(projectId) {
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        return Promise.resolve(project?.files || []);
    }

    function getFileRecord(projectId, fileName) {
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        const file = project?.files?.find(f => f.name === fileName);
        return Promise.resolve(file || null);
    }

    function downloadRecord(fileRecord) {
        if (fileRecord?.url) window.open(fileRecord.url, '_blank');
        else alert('Ссылка на файл не найдена');
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
