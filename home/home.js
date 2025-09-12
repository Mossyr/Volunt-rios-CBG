// home.js

document.addEventListener('DOMContentLoaded', () => {
    const userNameEl = document.getElementById('user-name');
    const contextSwitcherEl = document.getElementById('context-switcher');
    const volunteerPanelEl = document.getElementById('volunteer-panel');
    const leaderPanelContentEl = document.getElementById('leader-panel-content');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';

    async function loadHomePage() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '../login/login.html';
            return;
        }
        try {
            const userResponse = await fetch(`${API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!userResponse.ok) { logout(); return; }
            const user = await userResponse.json();
            userNameEl.textContent = user.nome;
            localStorage.setItem('userData', JSON.stringify(user));
            const scheduleResponse = await fetch(`${API_URL}/api/escalas/me/proximo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const proximoTurno = await scheduleResponse.json();
            updateNextCommitmentCard(proximoTurno);
            const leadershipRoles = user.ministerios.filter(m => m.funcao === 'Líder' && m.status === 'Aprovado');
            if (leadershipRoles.length > 0) {
                contextSwitcherEl.style.display = 'flex';
                await populateLeaderPanel(leadershipRoles);
                setupContextSwitcher();
            } else {
                volunteerPanelEl.style.display = 'grid';
            }
        } catch (error) {
            console.error('Erro ao carregar dados da home:', error);
        }
    }

    // **** FUNÇÃO COM A LÓGICA ATUALIZADA ****
    function updateNextCommitmentCard(turno) {
        const commitmentCard = document.querySelector('.card-commitment');
        if (!turno || !turno._id) {
            // Remove elementos desnecessários e mostra mensagem de descanso
            const details = commitmentCard.querySelector('.commitment-details');
            const actions = commitmentCard.querySelector('.card-actions');
            if(details) details.remove();
            if(actions) actions.remove();
            commitmentCard.querySelector('.ministry-tag').style.display = 'none';
            commitmentCard.querySelector('h2').textContent = 'Nenhum Compromisso';
            const p = document.createElement('p');
            p.textContent = 'Você não tem nenhuma escala agendada. Aproveite o descanso! 😊';
            commitmentCard.appendChild(p);
            return;
        }

        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long',
            timeZone: 'UTC' 
        });
        
        commitmentCard.querySelector('.ministry-tag').textContent = turno.ministerio.nome;
        // Selecionando pelos IDs para maior segurança
        document.getElementById('commitment-date').textContent = dataFormatada;
        document.getElementById('commitment-shift').textContent = `Turno: ${turno.turno}`; 

        const verEscalaBtn = commitmentCard.querySelector('.btn-view-schedule');
        verEscalaBtn.addEventListener('click', () => {
            window.location.href = `../escalas/detalhe-escala.html?id=${turno._id}`;
        });

        const solicitarTrocaBtn = commitmentCard.querySelector('.btn-request-swap');
        solicitarTrocaBtn.addEventListener('click', () => {
            // Sugestão: Leve o ID da escala para a próxima tela para já carregar os dados
            window.location.href = `../escalas/solicitar-troca.html?escalaId=${turno._id}`;
        });
    }
    
    async function fetchAndDisplaySchedules(ministerioId, container, token) {
        try {
            const response = await fetch(`${API_URL}/api/escalas/ministerio/${ministerioId}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                container.innerHTML = '<p class="error-message">Não foi possível carregar as escalas.</p>';
                return;
            }
            const schedules = await response.json();
            container.innerHTML = ''; // Limpa o loader

            if (schedules.length === 0) {
                 container.innerHTML = '<p class="no-schedules-message">Nenhuma escala criada para este ministério.</p>';
                 return;
            }

            schedules.forEach(escala => {
                const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                const scheduleEl = document.createElement('div');
                scheduleEl.className = 'schedule-item';
                scheduleEl.innerHTML = `
                    <div class="schedule-info">
                        <strong>${escala.evento || 'Escala'} - ${escala.turno}</strong>
                        <span>${dataFormatada}</span>
                    </div>
                    <div class="schedule-actions">
                        <button class="btn btn-icon btn-edit-schedule" data-escala-id="${escala._id}" aria-label="Editar Escala">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button class="btn btn-icon btn-delete-schedule" data-escala-id="${escala._id}" aria-label="Excluir Escala">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                `;
                container.appendChild(scheduleEl);
            });

        } catch (error) {
            console.error(`Erro ao buscar escalas para o ministério ${ministerioId}:`, error);
            container.innerHTML = '<p class="error-message">Erro de conexão ao buscar escalas.</p>';
        }
    }
    
    async function populateLeaderPanel(roles) {
        leaderPanelContentEl.innerHTML = '';
        const token = localStorage.getItem('authToken');

        for (const role of roles) {
            const ministryCard = document.createElement('div');
            ministryCard.className = 'card';
            ministryCard.innerHTML = `
                <div class="card-header">
                    <h2>Liderança: ${role.ministerio.nome}</h2>
                    <span class="notification-badge" style="display: none;">0</span>
                </div>
                <p>Gerencie os voluntários e as escalas do seu ministério.</p>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-manage-pending" data-ministerio-id="${role.ministerio._id}">
                        Aprovar Voluntários
                    </button>
                    <button class="btn btn-primary btn-create-schedule" data-ministerio-id="${role.ministerio._id}">
                        Criar Escala
                    </button>
                </div>
                <div class="schedules-list-container">
                   <h3 class="schedules-list-title">Escalas Criadas</h3>
                   <div class="schedules-list" data-ministry-id="${role.ministerio._id}">
                        <div class="loader"></div>
                   </div>
                </div>
            `;
            leaderPanelContentEl.appendChild(ministryCard);
            
            const scheduleListEl = ministryCard.querySelector(`.schedules-list[data-ministry-id="${role.ministerio._id}"]`);
            await fetchAndDisplaySchedules(role.ministerio._id, scheduleListEl, token);
        }
        
        leaderPanelContentEl.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            if (button.classList.contains('btn-manage-pending')) {
                window.location.href = `../gerenciar/pendentes.html?ministerioId=${button.dataset.ministerioId}`;
            }
            if (button.classList.contains('btn-create-schedule')) {
                window.location.href = `../criar-escalas/criar-escala.html?ministerioId=${button.dataset.ministerioId}`;
            }
            if (button.classList.contains('btn-edit-schedule')) {
                window.location.href = `../criar-escalas/editar-escala.html?id=${button.dataset.escalaId}`;
            }
            if (button.classList.contains('btn-delete-schedule')) {
                const ministerioId = button.closest('.card').querySelector('.btn-create-schedule').dataset.ministerioId;
                handleDeleteSchedule(button.dataset.escalaId, ministerioId, button.closest('.schedule-item'));
            }
        });
    }
    
    async function handleDeleteSchedule(escalaId, ministerioId, scheduleElement) {
        if (!confirm('Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.')) {
            return;
        }

        if (!ministerioId) {
            alert('Erro Crítico: ID do Ministério não foi encontrado no frontend. A exclusão foi cancelada.');
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}?ministerioId=${ministerioId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                scheduleElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                scheduleElement.style.opacity = '0';
                scheduleElement.style.transform = 'translateX(-20px)';
                setTimeout(() => scheduleElement.remove(), 300);
            } else {
                const error = await response.json();
                alert(`Erro ao excluir escala: ${error.msg || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Falha na requisição para excluir escala:', error);
            alert('Não foi possível se conectar ao servidor para excluir a escala.');
        }
    }
    
    function setupContextSwitcher() {
        const contextBtns = document.querySelectorAll('.context-btn');
        const contentPanels = document.querySelectorAll('.content-panel');
        
        contextBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                contextBtns.forEach(b => b.classList.remove('active'));
                contentPanels.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panelId = btn.dataset.panel;
                document.getElementById(panelId).classList.add('active');
            });
        });
    }

    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '../login/login.html';
    }

    document.getElementById('logout-btn').addEventListener('click', logout);
    loadHomePage();
});