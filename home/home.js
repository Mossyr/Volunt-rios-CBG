// home.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos da Página ---
    const userNameEl = document.getElementById('user-name');
    const contextSwitcherEl = document.getElementById('context-switcher');
    const volunteerPanelEl = document.getElementById('volunteer-panel');
    
    // --- Elementos de Notificação ---
    const notificationBell = document.getElementById('notification-bell');
    const notificationCounter = document.getElementById('notification-counter');
    const notificationsPanel = document.getElementById('notifications-panel');
    const notificationsList = document.getElementById('notifications-list');
    const closeNotificationBtn = document.querySelector('.close-notif'); // Novo botão de fechar

    const API_URL = 'http://localhost:5000';

    async function loadHomePage() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '../login/login.html';
            return;
        }
        try {
            // 1. Busca dados do usuário
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
            
            // Atualiza nome (apenas o primeiro nome para ficar mais clean)
            const primeiroNome = user.nome.split(' ')[0];
            userNameEl.textContent = primeiroNome;
            
            localStorage.setItem('userData', JSON.stringify(user));

            // 2. Busca Próxima Escala
            const scheduleResponse = await fetch(`${API_URL}/api/escalas/me/proximo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const proximoTurno = await scheduleResponse.json();
            updateNextCommitmentCard(proximoTurno);
            
            // 3. Lógica de Liderança (Exibir ou não o Switcher)
            const leadershipRoles = user.ministerios.filter(m => m.funcao === 'Líder' && m.status === 'Aprovado');
            if (leadershipRoles.length > 0) {
                contextSwitcherEl.style.display = 'flex'; 
            } else {
                volunteerPanelEl.style.display = 'flex'; // Mudado para flex por conta do CSS novo
            }

            setupVolunteerPanelSwitcher(); 
            await fetchNotifications(); 

        } catch (error) {
            console.error('Erro ao carregar dados da home:', error);
        }
    }

    function updateNextCommitmentCard(turno) {
        const commitmentCard = document.querySelector('.card-commitment');
        
        // Elementos internos do novo Card
        const ministryTag = document.getElementById('ministry-tag');
        const ministryText = ministryTag.querySelector('.tag-text');
        const dateDay = document.getElementById('date-day');
        const dateMonth = document.getElementById('date-month');
        const weekdayEl = document.getElementById('commitment-weekday');
        const shiftEl = document.getElementById('commitment-shift');
        
        // Botões
        const btnView = commitmentCard.querySelector('.btn-view-schedule');
        const btnSwap = commitmentCard.querySelector('.btn-request-swap');

        // --- Caso: Sem Compromisso ---
        if (!turno || !turno._id) {
            ministryTag.style.display = 'none'; // Esconde a tag do ministério
            
            // Atualiza textos para estado vazio
            commitmentCard.querySelector('.next-label').textContent = 'Agenda Livre';
            weekdayEl.textContent = 'Descanso merecido! 🏖️';
            shiftEl.textContent = 'Nenhuma escala agendada';
            
            // Zera a data
            dateDay.textContent = '--';
            dateMonth.textContent = '--';
            
            // Desabilita botões visualmente
            btnView.style.opacity = '0.5';
            btnView.style.pointerEvents = 'none';
            btnSwap.style.display = 'none';
            
            // Remove listeners antigos (cloneNode é um truque rápido para limpar listeners)
            const newBtnView = btnView.cloneNode(true);
            btnView.parentNode.replaceChild(newBtnView, btnView);
            
            return;
        }

        // --- Caso: Com Compromisso ---
        
        // Formatação da Data (Dia, Mês, Dia da Semana)
        const dataObj = new Date(turno.data);
        const dia = dataObj.getUTCDate();
        // Mês abreviado (ex: "nov")
        const mes = dataObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.','');
        // Dia da semana (ex: "Sábado")
        const diaSemanaRaw = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
        const diaSemanaCapitalized = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1);

        // Preenche o DOM
        ministryTag.style.display = 'inline-flex';
        ministryText.textContent = turno.ministerio.nome;
        
        dateDay.textContent = dia;
        dateMonth.textContent = mes;
        weekdayEl.textContent = diaSemanaCapitalized;
        shiftEl.textContent = `Turno: ${turno.turno}`;

        // Reativa botões
        btnView.style.opacity = '1';
        btnView.style.pointerEvents = 'auto';
        btnSwap.style.display = 'inline-flex';

        // Listeners dos botões
        // Removemos anteriores clonando o elemento para evitar duplicidade de cliques
        const newBtnView = btnView.cloneNode(true);
        const newBtnSwap = btnSwap.cloneNode(true);
        
        btnView.parentNode.replaceChild(newBtnView, btnView);
        btnSwap.parentNode.replaceChild(newBtnSwap, btnSwap);

        newBtnView.addEventListener('click', () => {
            window.location.href = `../escalas/detalhe-escala.html?id=${turno._id}`;
        });

        newBtnSwap.addEventListener('click', () => {
            window.location.href = `../escalas/solicitar-troca.html?escalaId=${turno._id}`;
        });
    }
    
    function setupVolunteerPanelSwitcher() {
        const volunteerBtn = document.querySelector('.context-btn[data-panel="volunteer-panel"]');
        const leaderLink = document.getElementById('btn-lideranca');
        
        if (volunteerBtn) {
            volunteerBtn.classList.add('active');
            if (leaderLink) leaderLink.classList.remove('active');
            volunteerPanelEl.classList.add('active');
            
            volunteerBtn.addEventListener('click', () => {
                // Apenas garante visual, já que o link de liderança recarrega a página
                volunteerPanelEl.classList.add('active');
                volunteerBtn.classList.add('active');
            });
        }
    }

    // --- LÓGICA DE NOTIFICAÇÕES ---
    async function fetchNotifications() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/api/notificacoes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) return;

            const notifications = await response.json();
            renderNotifications(notifications);

        } catch (error) {
            console.error("Erro ao buscar notificações:", error);
        }
    }
    
    async function deleteNotification(notificationId, listItemElement) {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Efeito visual imediato antes da requisição (UI otimista)
        listItemElement.style.opacity = '0.5';

        try {
            const response = await fetch(`${API_URL}/api/notificacoes/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                // Animação de saída
                listItemElement.style.transform = 'translateX(20px)';
                listItemElement.style.opacity = '0';
                setTimeout(() => {
                    listItemElement.remove();
                    checkEmptyNotifications(); // Verifica se a lista ficou vazia
                }, 300);

                // Atualiza contador
                const unreadCount = parseInt(notificationCounter.textContent || '0');
                if (listItemElement.classList.contains('unread') && unreadCount > 0) {
                    const newCount = unreadCount - 1;
                    notificationCounter.textContent = newCount;
                    if (newCount === 0) notificationCounter.style.display = 'none';
                }
            } else {
                listItemElement.style.opacity = '1'; // Reverte se falhar
                alert("Não foi possível excluir.");
            }
        } catch (error) {
            listItemElement.style.opacity = '1';
        }
    }
    
    function checkEmptyNotifications() {
        if (notificationsList.children.length === 0) {
            notificationsList.innerHTML = '<li class="notification-item-empty">Tudo limpo por aqui! ✨</li>';
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
            checkEmptyNotifications();
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement('li');
            item.className = 'notification-item';
            // Adicionamos estilo inline ou classe para não lidas se necessário
            if (!notification.read) item.style.backgroundColor = '#f8fafc'; 
            
            const fromUserName = notification.fromUser ? notification.fromUser.nome : 'Sistema';
            const timeAgo = new Date(notification.createdAt).toLocaleDateString('pt-BR');

            // Criando conteúdo HTML com ícones Phosphor
            let iconHTML = '';
            let titleHTML = '';
            
            switch (notification.type) {
                case 'SWAP_REQUEST':
                    iconHTML = `<i class="ph ph-arrows-left-right" style="color: #ef4444; font-size: 1.4rem;"></i>`;
                    titleHTML = `<strong>Troca:</strong> ${fromUserName}`;
                    
                    // Torna o item clicável para ir ao detalhe
                    item.style.cursor = 'pointer';
                    item.addEventListener('click', (e) => {
                        // Evita disparar se clicar no botão de excluir
                        if(!e.target.closest('.delete-notification-btn')) {
                            if (notification.relatedId) {
                                window.location.href = `../trocas/detalhe-troca.html?trocaId=${notification.relatedId}`;
                            }
                        }
                    });
                    break;
                case 'GENERAL':
                default:
                    iconHTML = `<i class="ph ph-info" style="color: #6366f1; font-size: 1.4rem;"></i>`;
                    titleHTML = `<strong>Aviso:</strong> Sistema`;
                    break;
            }

            // Estrutura Flexbox interna
            item.innerHTML = `
                <div style="display: flex; gap: 15px; align-items: flex-start; width: 100%;">
                    <div style="margin-top: 2px;">${iconHTML}</div>
                    <div style="flex-grow: 1;">
                        <p style="margin: 0; color: var(--text-main);">${titleHTML}</p>
                        <p style="margin: 4px 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">${notification.message}</p>
                        <span style="font-size: 0.75rem; color: #94a3b8;">${timeAgo}</span>
                    </div>
                    <button class="delete-notification-btn" style="background:none; border:none; cursor:pointer; color:#cbd5e1; padding: 5px;">
                        <i class="ph ph-trash" style="font-size: 1.1rem;"></i>
                    </button>
                </div>
            `;

            // Listener para o botão de excluir
            const deleteBtn = item.querySelector('.delete-notification-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNotification(notification._id, item);
            });
            
            notificationsList.appendChild(item);
        });
    }

    // --- INTERAÇÕES DO PAINEL DE NOTIFICAÇÃO ---

    // Abrir/Fechar painel
    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationsPanel.classList.toggle('open');
        if (notificationsPanel.classList.contains('open')) {
            markNotificationsAsRead();
        }
    });

    // Fechar pelo botão X
    if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsPanel.classList.remove('open');
        });
    }

    // Fechar clicando fora
    document.addEventListener('click', (e) => {
        if (!notificationsPanel.contains(e.target) && !notificationBell.contains(e.target)) {
            notificationsPanel.classList.remove('open');
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
        } catch (error) {
            console.error('Erro ao marcar notificações como lidas:', error);
        }
    }
    
    loadHomePage();
});