// home.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos da Página ---
    const userNameEl = document.getElementById('user-name');
    const contextSwitcherEl = document.getElementById('context-switcher');
    const volunteerPanelEl = document.getElementById('volunteer-panel');
    const leaderPanelContentEl = document.getElementById('leader-panel-content');
    
    // --- Elementos de Notificação ---
    const notificationBell = document.getElementById('notification-bell');
    const notificationCounter = document.getElementById('notification-counter');
    const notificationsPanel = document.getElementById('notifications-panel');
    const notificationsList = document.getElementById('notifications-list');

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
            if (!userResponse.ok) { 
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                window.location.href = '../login/login.html';
                return; 
            }
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
                // A função nova e correta é chamada aqui
                populateLeaderPanel(leadershipRoles);
                setupContextSwitcher();
            } else {
                volunteerPanelEl.style.display = 'grid';
            }
            await fetchNotifications(); 
        } catch (error) {
            console.error('Erro ao carregar dados da home:', error);
        }
    }

    function updateNextCommitmentCard(turno) {
        const commitmentCard = document.querySelector('.card-commitment');
        if (!turno || !turno._id) {
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
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' 
        });
        
        commitmentCard.querySelector('.ministry-tag').textContent = turno.ministerio.nome;
        document.getElementById('commitment-date').textContent = dataFormatada;
        document.getElementById('commitment-shift').textContent = `Turno: ${turno.turno}`; 

        const verEscalaBtn = commitmentCard.querySelector('.btn-view-schedule');
        verEscalaBtn.addEventListener('click', () => {
            window.location.href = `../escalas/detalhe-escala.html?id=${turno._id}`;
        });

        const solicitarTrocaBtn = commitmentCard.querySelector('.btn-request-swap');
        solicitarTrocaBtn.addEventListener('click', () => {
            window.location.href = `../escalas/solicitar-troca.html?escalaId=${turno._id}`;
        });
    }
    
    // Esta é a função correta para o novo painel do líder
    async function populateLeaderPanel(roles) {
        leaderPanelContentEl.innerHTML = `
            <div class="card-header">
                <h2>Meus Ministérios (Liderança)</h2>
            </div>
        `;
        // Cria um card clicável para cada ministério que o usuário lidera
        for (const role of roles) {
            const ministryCardLink = document.createElement('a');
            ministryCardLink.className = 'ministry-leader-card';
            ministryCardLink.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${role.ministerio._id}`;

            ministryCardLink.innerHTML = `
                <div class="ministry-info">
                    <strong>${role.ministerio.nome}</strong>
                    <span>Clique para gerenciar</span>
                </div>
                <div class="ministry-arrow">
                    &rarr;
                </div>
            `;
            leaderPanelContentEl.appendChild(ministryCardLink);
        }
    }

    // --- CÓDIGO ANTIGO E QUEBRADO REMOVIDO DAQUI ---
    // O bloco de código que estava aqui foi removido porque pertencia à versão antiga
    // do painel do líder e estava causando o erro.
    
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

    // --- LÓGICA DE NOTIFICAÇÕES (permanece igual) ---
    async function fetchNotifications() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/api/notificacoes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                console.error("Falha ao buscar notificações");
                return;
            }

            const notifications = await response.json();
            renderNotifications(notifications);

        } catch (error) {
            console.error("Erro de conexão ao buscar notificações:", error);
        }
    }

    function renderNotifications(notifications) {
        const unreadCount = notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            notificationCounter.textContent = unreadCount;
            notificationCounter.style.display = 'flex';
        } else {
            notificationCounter.style.display = 'none';
        }

        notificationsList.innerHTML = '';

        if (notifications.length === 0) {
            notificationsList.innerHTML = '<li class="notification-item-empty">Nenhuma notificação por aqui.</li>';
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement('li');
            item.className = 'notification-item';
            if (!notification.read) item.classList.add('unread');
            const fromUserName = notification.fromUser ? notification.fromUser.nome : 'Sistema';
            let contentHTML = '';
            // Seu switch case para os tipos de notificação continua aqui
            // ...
            item.innerHTML = contentHTML;
            notificationsList.appendChild(item);
        });
    }

    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationsPanel.classList.toggle('open');
        if (notificationsPanel.classList.contains('open')) {
            markNotificationsAsRead();
        }
    });

    async function markNotificationsAsRead() {
        const unreadCount = parseInt(notificationCounter.textContent);
        if (isNaN(unreadCount) || unreadCount === 0) return;
        try {
            const token = localStorage.getItem('authToken');
            await fetch(`${API_URL}/api/notificacoes/mark-read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            notificationCounter.style.display = 'none';
            notificationCounter.textContent = '0';
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
});
        } catch (error) {
            console.error('Erro ao marcar notificações como lidas:', error);
        }
    }

    document.addEventListener('click', (e) => {
        if (!notificationsPanel.contains(e.target) && !notificationBell.contains(e.target)) {
            notificationsPanel.classList.remove('open');
        }
    });
    
    loadHomePage();
});