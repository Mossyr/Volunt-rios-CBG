document.addEventListener('DOMContentLoaded', async () => {
    const escalasListDiv = document.getElementById('public-escalas-list');
    const filtersDiv = document.getElementById('ministry-filters');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    let allEscalas = []; // Guarda todas as escalas para filtrar no front-end
    let userMinistries = []; // Guarda os ministérios do usuário

    try {
        // Busca os dados do usuário para pegar os ministérios
        const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!userResponse.ok) throw new Error('Erro ao buscar dados do usuário.');
        const user = await userResponse.json();
        userMinistries = user.ministerios.map(m => m.ministerio);
        
        // **NOVA ROTA NECESSÁRIA NO BACK-END**
        // Esta rota deve retornar todas as escalas futuras dos ministérios do usuário
        const response = await fetch(`${API_URL}/api/escalas/publicas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar as escalas.');
        }

        allEscalas = await response.json();
        setupFilters(userMinistries);
        displayEscalas(allEscalas);

    } catch (error) {
        console.error("Erro:", error);
        escalasListDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
    }

    function setupFilters(ministries) {
        if (ministries.length <= 1) return; // Não mostra filtros se só participa de 1 ministério

        filtersDiv.innerHTML = '<button class="filter-btn active" data-id="all">Todos</button>';
        ministries.forEach(min => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.id = min._id;
            btn.textContent = min.nome;
            filtersDiv.appendChild(btn);
        });

        filtersDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                // Desmarca o botão antigo e marca o novo
                filtersDiv.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');

                const filterId = e.target.dataset.id;
                if (filterId === 'all') {
                    displayEscalas(allEscalas);
                } else {
                    const filteredEscalas = allEscalas.filter(escala => escala.ministerio._id === filterId);
                    displayEscalas(filteredEscalas);
                }
            }
        });
    }

    function displayEscalas(escalas) {
        const loader = escalasListDiv.querySelector('.loader');
        if (loader) loader.remove();

        escalasListDiv.innerHTML = '';

        if (escalas.length === 0) {
            escalasListDiv.innerHTML = '<div class="card"><p>Nenhuma escala encontrada para os seus ministérios.</p></div>';
            return;
        }

        escalas.forEach(escala => {
            const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', {
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                timeZone: 'UTC'
            });

            // Mapeia os voluntários para mostrar os nomes
            const volunteersHtml = escala.voluntarios.map(vol => `<li>${vol.nome}</li>`).join('');

            const card = document.createElement('div');
            card.className = 'escala-card';
            card.innerHTML = `
                <div class="card-header">
                    <h2>${dataFormatada}</h2>
                    <span class="ministry-tag">${escala.ministerio.nome}</span>
                </div>
                <div class="escala-details">
                    <p><strong>Turno:</strong> ${escala.turno}</p>
                    <div class="volunteers-list">
                        <strong>Escalados:</strong>
                        <ul>${volunteersHtml || '<li>Ninguém escalado.</li>'}</ul>
                    </div>
                </div>
            `;
            escalasListDiv.appendChild(card);
        });
    }
});