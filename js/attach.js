const AttachManager = {
    openModal() {
        const modal = document.getElementById('attachModal');
        if (modal) modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('attachModal');
        if (modal) modal.classList.remove('active');
    },

    handleAction(type) {
        this.closeModal();
        switch(type) {
            case 'photo':
                alert('📸 Отправка фото — в разработке');
                break;
            case 'video':
                alert('🎥 Отправка видео — в разработке');
                break;
            case 'file':
                alert('📄 Отправка файла — в разработке');
                break;
            case 'poll':
                alert('📊 Создание опроса — в разработке');
                break;
            case 'voice':
                alert('🎤 Голосовое сообщение — в разработке');
                break;
            case 'link':
                const url = prompt('🔗 Вставьте ссылку:');
                if (url) alert(`Ссылка отправлена: ${url}`);
                break;
            default:
                break;
        }
    },

    init() {
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.onclick = () => this.openModal();
        }

        // Закрытие по клику вне модалки
        const modal = document.getElementById('attachModal');
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) this.closeModal();
            };
        }
    }
};
