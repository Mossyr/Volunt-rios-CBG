document.addEventListener('DOMContentLoaded', async () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearHeader = document.getElementById('month-year-header');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const btnBulkMonth = document.getElementById('btn-bulk-month');
    const btnClearMonth = document.getElementById('btn-clear-month');
    
    const modalOverlay = document.getElementById('availability-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalDayNum = document.getElementById('modal-day-number');
    const modalMonthYear = document.getElementById('modal-month-year');
    const checkManha = document.getElementById('check-manha');
    const checkNoite = document.getElementById('check-noite');
    const ministriesListContainer = document.getElementById('modal-ministries-list');
    const reasonInput = document.getElementById('modal-reason');
    const btnSave = document.getElementById('btn-save-disp');
    const btnRemove = document.getElementById('btn-remove-disp');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');
    if (!token) { window.location.href = '../login/login.html'; return; }

    let currentDate = new Date();
    currentDate.setDate(1); 
    let unavailableDataMap = new Map();
    let userMinistries = [];
    let currentSelectedDate = null; 
    let isBulkMode = false;

    async function initData() {
        try {
            const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            const user = await userRes.json();
            userMinistries = user.ministerios.map(m => ({ id: m.ministerio._id, nome: m.ministerio.nome }));
            await fetchUnavailableDates();
            renderCalendar();
        } catch (error) { showToast('Erro ao iniciar.', 'error'); }
    }

    async function fetchUnavailableDates() {
        try {
            const response = await fetch(`${API_URL}/api/disponibilidade/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            unavailableDataMap.clear();
            data.forEach(item => {
                const dateStr = new Date(item.data).toISOString().split('T')[0];
                unavailableDataMap.set(dateStr, item);
            });
        } catch (error) { console.error("Erro busca"); }
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
        monthYearHeader.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(); today.setHours(0,0,0,0);

        for (let i = 0; i < firstDayOfMonth; i++) calendarGrid.appendChild(document.createElement('div'));

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month, day);
            dayEl.dataset.date = dateString;

            if (dateObj < today) dayEl.classList.add('past-day');
            if (dateObj.getTime() === today.getTime()) dayEl.classList.add('today');

            if (unavailableDataMap.has(dateString)) {
                const info = unavailableDataMap.get(dateString);
                dayEl.classList.add('unavailable');
                // Se for parcial (só um turno ou só alguns ministérios), muda o estilo
                const isTotal = info.turnosIndisponiveis.length === 2 && info.ministeriosAfetados.length === 0;
                if (!isTotal) {
                    dayEl.style.backgroundColor = "#e0e7ff";
                    dayEl.style.color = "#6366f1";
                    dayEl.style.border = "2px solid #6366f1";
                }
            }
            calendarGrid.appendChild(dayEl);
        }
    }

    function openModal(dateString, bulk = false) {
        isBulkMode = bulk;
        currentSelectedDate = dateString;
        renderMinistriesChips();
        if (bulk) {
            modalDayNum.textContent = "Mês"; modalMonthYear.textContent = "Inteiro";
            btnRemove.style.display = 'none'; checkManha.checked = true; checkNoite.checked = true;
            reasonInput.value = ''; selectMinistry('all');
        } else {
            const dateObj = new Date(dateString + 'T00:00:00');
            modalDayNum.textContent = dateObj.getDate();
            modalMonthYear.textContent = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const existingData = unavailableDataMap.get(dateString);
            if (existingData) {
                checkManha.checked = existingData.turnosIndisponiveis.includes('Manhã');
                checkNoite.checked = existingData.turnosIndisponiveis.includes('Noite');
                reasonInput.value = existingData.motivo || '';
                const affected = existingData.ministeriosAfetados || [];
                if (affected.length === 0) selectMinistry('all');
                else {
                    document.querySelectorAll('.mini-chip').forEach(chip => {
                        chip.classList.remove('selected');
                        if (affected.includes(chip.dataset.id)) chip.classList.add('selected');
                    });
                }
                btnRemove.style.display = 'flex';
            } else {
                checkManha.checked = true; checkNoite.checked = true;
                reasonInput.value = ''; selectMinistry('all'); btnRemove.style.display = 'none';
            }
        }
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.style.opacity = '1', 10);
    }

    function renderMinistriesChips() {
        ministriesListContainer.innerHTML = '';
        const allChip = document.createElement('span');
        allChip.className = 'mini-chip selected';
        allChip.dataset.id = 'all'; allChip.textContent = 'Todos';
        allChip.onclick = () => selectMinistry('all');
        ministriesListContainer.appendChild(allChip);
        userMinistries.forEach(min => {
            const chip = document.createElement('span');
            chip.className = 'mini-chip'; chip.dataset.id = min.id; chip.textContent = min.nome;
            chip.onclick = () => toggleMinistry(min.id);
            ministriesListContainer.appendChild(chip);
        });
    }

    function selectMinistry(id) {
        if (id === 'all') {
            document.querySelectorAll('.mini-chip').forEach(c => {
                c.dataset.id === 'all' ? c.classList.add('selected') : c.classList.remove('selected');
            });
        }
    }

    function toggleMinistry(id) {
        const allChip = document.querySelector('.mini-chip[data-id="all"]');
        const thisChip = document.querySelector(`.mini-chip[data-id="${id}"]`);
        allChip.classList.remove('selected');
        thisChip.classList.toggle('selected');
        if (!document.querySelector('.mini-chip.selected')) allChip.classList.add('selected');
    }

    btnSave.addEventListener('click', async () => {
        const turnos = [];
        if (checkManha.checked) turnos.push('Manhã');
        if (checkNoite.checked) turnos.push('Noite');
        if (turnos.length === 0) return alert("Selecione um turno.");

        let ministerios = [];
        const allSelected = document.querySelector('.mini-chip[data-id="all"]').classList.contains('selected');
        if (!allSelected) {
            document.querySelectorAll('.mini-chip.selected').forEach(c => { if (c.dataset.id !== 'all') ministerios.push(c.dataset.id); });
        }

        const endpoint = isBulkMode ? '/api/disponibilidade/mensal' : '/api/disponibilidade/save';
        const payload = isBulkMode ? {
            mes: currentDate.getMonth(), ano: currentDate.getFullYear(), turnos, ministerios, motivo: reasonInput.value
        } : { data: currentSelectedDate, turnos, ministerios, motivo: reasonInput.value };

        btnSave.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i>';
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.status === 409) { alert((await res.json()).msg); }
            else if (res.ok) { await fetchUnavailableDates(); renderCalendar(); closeModal(); showToast('Salvo!'); }
        } catch (e) { showToast('Erro.', 'error'); }
        btnSave.innerHTML = 'Confirmar <i class="ph ph-check"></i>';
    });

    btnClearMonth.addEventListener('click', async () => {
        const monthName = new Date(currentDate.getFullYear(), currentDate.getMonth()).toLocaleDateString('pt-BR', { month: 'long' });
        if (!confirm(`Remover TODAS as indisponibilidades de ${monthName}?`)) return;
        try {
            const res = await fetch(`${API_URL}/api/disponibilidade/delete-mensal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ mes: currentDate.getMonth(), ano: currentDate.getFullYear() })
            });
            if (res.ok) { await fetchUnavailableDates(); renderCalendar(); showToast('Mês limpo!'); }
        } catch (e) { showToast('Erro ao limpar.', 'error'); }
    });

    btnRemove.addEventListener('click', async () => {
        if(!confirm('Ficar disponível?')) return;
        try {
            await fetch(`${API_URL}/api/disponibilidade/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ data: currentSelectedDate })
            });
            unavailableDataMap.delete(currentSelectedDate);
            renderCalendar(); closeModal(); showToast('Livre!');
        } catch (e) { }
    });

    function closeModal() { modalOverlay.style.opacity = '0'; setTimeout(() => modalOverlay.style.display = 'none', 300); }
    calendarGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.calendar-day');
        if (dayEl && !dayEl.classList.contains('past-day')) openModal(dayEl.dataset.date);
    });
    btnBulkMonth.addEventListener('click', () => openModal(null, true));
    closeModalBtn.addEventListener('click', closeModal);
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    initData();
});

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}