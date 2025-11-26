document.addEventListener('DOMContentLoaded', async () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearHeader = document.getElementById('month-year-header');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    
    // Modal Elements
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
    
    // Armazena os dados completos de indisponibilidade (não só datas)
    // Chave: 'YYYY-MM-DD', Valor: Objeto de dados
    let unavailableDataMap = new Map();
    let userMinistries = [];
    let currentSelectedDate = null; // 'YYYY-MM-DD'

    // --- FUNÇÕES AUXILIARES UI ---
    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        const icon = type === 'success' ? '<i class="ph ph-check-circle"></i>' : '<i class="ph ph-warning-circle"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
    }

    // --- CARREGAMENTO DE DADOS ---
    async function initData() {
        try {
            // 1. Pega Ministérios do Usuário
            const userRes = await fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            const user = await userRes.json();
            userMinistries = user.ministerios.map(m => ({ id: m.ministerio._id, nome: m.ministerio.nome }));

            // 2. Pega Indisponibilidades
            await fetchUnavailableDates();
            
            renderCalendar();
        } catch (error) {
            console.error(error);
            showToast('Erro ao iniciar.', 'error');
        }
    }

    async function fetchUnavailableDates() {
        try {
            // Rota atualizada no backend deve retornar array de objetos
            const response = await fetch(`${API_URL}/api/disponibilidade/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            
            unavailableDataMap.clear();
            data.forEach(item => {
                const dateStr = new Date(item.data).toISOString().split('T')[0];
                unavailableDataMap.set(dateStr, item);
            });
        } catch (error) {
            console.error("Erro ao buscar indisponibilidades");
        }
    }

    // --- RENDERIZAR CALENDÁRIO ---
    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        
        const monthName = new Date(year, month).toLocaleDateString('pt-BR', { month: 'long' });
        monthYearHeader.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date(); today.setHours(0,0,0,0);

        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyEl = document.createElement('div');
            calendarGrid.appendChild(emptyEl);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(year, month, day);
            dayEl.dataset.date = dateString;

            if (dateObj < today) dayEl.classList.add('past-day');
            if (dateObj.getTime() === today.getTime()) dayEl.classList.add('today');

            // Checa se tem dados
            if (unavailableDataMap.has(dateString)) {
                const info = unavailableDataMap.get(dateString);
                dayEl.classList.add('unavailable');
                
                // Se for parcial (ex: só manhã), podemos mudar o estilo futuramente
                if (info.turnosIndisponiveis && info.turnosIndisponiveis.length < 2) {
                    dayEl.style.border = "2px solid #ef4444";
                    dayEl.style.backgroundColor = "white";
                    dayEl.style.color = "#ef4444";
                }
            }

            calendarGrid.appendChild(dayEl);
        }
    }

    // --- LÓGICA DO MODAL ---
    function openModal(dateString) {
        currentSelectedDate = dateString;
        const dateObj = new Date(dateString + 'T00:00:00'); // Fix timezone
        
        // UI Header
        modalDayNum.textContent = dateObj.getDate();
        modalMonthYear.textContent = dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        // Renderiza Ministérios
        renderMinistriesChips();

        // Preenche dados se existirem
        const existingData = unavailableDataMap.get(dateString);
        
        if (existingData) {
            // Edição
            checkManha.checked = existingData.turnosIndisponiveis.includes('Manhã');
            checkNoite.checked = existingData.turnosIndisponiveis.includes('Noite');
            reasonInput.value = existingData.motivo || '';
            
            // Seleciona ministérios
            const affected = existingData.ministeriosAfetados || [];
            if (affected.length === 0) {
                selectMinistry('all');
            } else {
                document.querySelectorAll('.mini-chip').forEach(chip => {
                    chip.classList.remove('selected');
                    if (affected.includes(chip.dataset.id)) chip.classList.add('selected');
                });
            }
            btnRemove.style.display = 'flex';
        } else {
            // Novo
            checkManha.checked = true;
            checkNoite.checked = true;
            reasonInput.value = '';
            selectMinistry('all'); // Default todos
            btnRemove.style.display = 'none';
        }

        // Abre modal
        modalOverlay.style.display = 'flex';
        setTimeout(() => modalOverlay.style.opacity = '1', 10);
    }

    function closeModal() {
        modalOverlay.style.opacity = '0';
        setTimeout(() => modalOverlay.style.display = 'none', 300);
    }

    function renderMinistriesChips() {
        ministriesListContainer.innerHTML = '';
        
        // Chip "Todos"
        const allChip = document.createElement('span');
        allChip.className = 'mini-chip selected';
        allChip.dataset.id = 'all';
        allChip.textContent = 'Todos';
        allChip.onclick = () => selectMinistry('all');
        ministriesListContainer.appendChild(allChip);

        // Chips dos Ministérios do Usuário
        userMinistries.forEach(min => {
            const chip = document.createElement('span');
            chip.className = 'mini-chip';
            chip.dataset.id = min.id;
            chip.textContent = min.nome;
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
        
        allChip.classList.remove('selected'); // Desmarca todos ao clicar num especifico
        thisChip.classList.toggle('selected');

        // Se desmarcar tudo, volta pra Todos? Ou deixa vazio? Melhor forçar 1 seleção.
        const anySelected = document.querySelector('.mini-chip.selected');
        if (!anySelected) allChip.classList.add('selected');
    }

    // --- SALVAR / REMOVER ---
    btnSave.addEventListener('click', async () => {
        const turnos = [];
        if (checkManha.checked) turnos.push('Manhã');
        if (checkNoite.checked) turnos.push('Noite');

        if (turnos.length === 0) {
            alert("Selecione pelo menos um turno (Manhã ou Noite).");
            return;
        }

        let ministerios = [];
        const allSelected = document.querySelector('.mini-chip[data-id="all"]').classList.contains('selected');
        if (!allSelected) {
            document.querySelectorAll('.mini-chip.selected').forEach(c => {
                if (c.dataset.id !== 'all') ministerios.push(c.dataset.id);
            });
        }

        const payload = {
            data: currentSelectedDate,
            turnos: turnos,
            ministerios: ministerios, // Array vazio = Todos
            motivo: reasonInput.value
        };

        // Feedback Otimista
        btnSave.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i>';
        
        try {
            // Usando rota POST agora para salvar detalhes
            const res = await fetch(`${API_URL}/api/disponibilidade/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.status === 409) { // Conflito
                const err = await res.json();
                alert(err.msg); // Simples alert para conflito por enquanto
                btnSave.innerHTML = 'Confirmar';
                return;
            }

            if (!res.ok) throw new Error();

            // Sucesso
            await fetchUnavailableDates();
            renderCalendar();
            closeModal();
            showToast('Disponibilidade salva!');
            btnSave.innerHTML = 'Confirmar <i class="ph ph-check"></i>';

        } catch (error) {
            console.error(error);
            showToast('Erro ao salvar.', 'error');
            btnSave.innerHTML = 'Confirmar';
        }
    });

    btnRemove.addEventListener('click', async () => {
        if(!confirm('Deseja ficar disponível novamente neste dia?')) return;

        try {
            const res = await fetch(`${API_URL}/api/disponibilidade/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ data: currentSelectedDate })
            });
            
            if (!res.ok) throw new Error();

            unavailableDataMap.delete(currentSelectedDate);
            renderCalendar();
            closeModal();
            showToast('Você está disponível!');

        } catch (error) {
            showToast('Erro ao remover.', 'error');
        }
    });

    // Listeners Gerais
    calendarGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.calendar-day');
        if (dayEl && !dayEl.classList.contains('past-day') && dayEl.dataset.date) {
            openModal(dayEl.dataset.date);
        }
    });

    closeModalBtn.addEventListener('click', closeModal);
    prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

    // Start
    initData();
});