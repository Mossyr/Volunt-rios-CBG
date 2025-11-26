// todas-escalas.js
document.addEventListener('DOMContentLoaded', async () => {
    const escalasListDiv = document.getElementById('public-escalas-list');
    const filtersDiv = document.getElementById('ministry-filters');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    let allEscalas = []; 
    let userMinistries = [];

    try {
        // 1. Pega os ministérios do usuário para montar os filtros
        const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userResponse.ok) throw new Error('Erro ao buscar dados.');
        const user = await userResponse.json();
        userMinistries = user.ministerios.map(m => m.ministerio);
        
        // 2. Pega todas as escalas públicas
        const response = await fetch(`${API_URL}/api/escalas/publicas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Erro ao buscar escalas.');

        allEscalas = await response.json();
        
        setupFilters(userMinistries);
        displayEscalas(allEscalas);

    } catch (error) {
        console.error("Erro:", error);
        escalasListDiv.innerHTML = `
            <div class="empty-card">
                <i class="ph ph-warning-circle" style="font-size: 2rem; margin-bottom: 10px; color: #ef4444;"></i>
                <p>Não foi possível carregar as escalas.</p>
            </div>`;
    }

    function setupFilters(ministries) {
        filtersDiv.innerHTML = '';

        // Botão "Todos"
        const btnAll = document.createElement('button');
        btnAll.className = 'filter-btn active';
        btnAll.dataset.id = 'all';
        btnAll.textContent = 'Todos';
        filtersDiv.appendChild(btnAll);

        // Botões dos Ministérios
        ministries.forEach(min => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.id = min._id;
            btn.textContent = min.nome;
            filtersDiv.appendChild(btn);
        });

        filtersDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                filtersDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const filterId = e.target.dataset.id;
                
                // Efeito visual de troca
                escalasListDiv.style.opacity = '0.5';
                setTimeout(() => {
                    if (filterId === 'all') {
                        displayEscalas(allEscalas);
                    } else {
                        const filteredEscalas = allEscalas.filter(escala => escala.ministerio._id === filterId);
                        displayEscalas(filteredEscalas);
                    }
                    escalasListDiv.style.opacity = '1';
                }, 200);
            }
        });
    }

    function displayEscalas(escalas) {
        escalasListDiv.innerHTML = '';

        if (escalas.length === 0) {
            escalasListDiv.innerHTML = `
                <div class="empty-card">
                    <i class="ph ph-calendar-x" style="font-size: 3rem; margin-bottom: 15px; color: #cbd5e1;"></i>
                    <p>Nenhuma escala encontrada para este filtro.</p>
                </div>`;
            return;
        }

        // Ordenar por data
        escalas.sort((a, b) => new Date(a.data) - new Date(b.data));

        escalas.forEach(escala => {
            const dataObj = new Date(escala.data);
            const dia = dataObj.getUTCDate();
            const mes = dataObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
            const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
            const diaSemanaCapitalized = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

            // --- AQUI ESTAVA O ERRO ---
            // Agora tratamos a estrutura nova e velha
            const volunteersHtml = escala.voluntarios.map(vol => {
                // Tenta pegar o nome de várias formas possíveis
                let nome = 'Voluntário';
                
                // Caso 1: Novo formato (Objeto com 'usuario' populado ou direto no root se o backend "achatou")
                if (vol.nome) {
                    nome = vol.nome;
                } else if (vol.usuario && vol.usuario.nome) {
                    nome = vol.usuario.nome;
                }
                
                const primeiroNome = nome.split(' ')[0];
                
                return `
                <div class="volunteer-chip">
                    <i class="ph ph-user chip-icon"></i> ${primeiroNome}
                </div>
            `}).join('');

            const card = document.createElement('div');
            card.className = 'escala-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="date-badge">
                        <span class="date-day">${dia}</span>
                        <span class="date-month">${mes}</span>
                    </div>
                    <div class="header-info">
                        <span class="ministry-tag">
                            <i class="ph ph-users-three"></i> ${escala.ministerio.nome}
                        </span>
                        <h2 class="escala-weekday">${diaSemanaCapitalized}</h2>
                        <div class="escala-shift">
                            <i class="ph ph-clock"></i>
                            ${escala.turno}
                        </div>
                    </div>
                </div>

                <div class="volunteers-section">
                    <span class="volunteers-label">Time Escalado:</span>
                    <div class="volunteers-chips">
                        ${volunteersHtml || '<span style="font-size:0.85rem; color:#94a3b8;">Ainda sem voluntários.</span>'}
                    </div>
                </div>
            `;
            escalasListDiv.appendChild(card);
        });
    }
});