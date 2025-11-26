document.addEventListener('DOMContentLoaded', async () => {
    const escalasListDiv = document.getElementById('escalas-list');
    const API_URL = 'http://localhost:5000';
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/escalas/me/todas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar suas escalas.');
        }

        const escalas = await response.json();
        displayEscalas(escalas);

    } catch (error) {
        console.error("Erro:", error);
        escalasListDiv.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-warning-circle" style="font-size: 2.5rem; margin-bottom: 10px; color: #ef4444;"></i>
                <p>Não foi possível carregar sua agenda.</p>
            </div>`;
    }

    function displayEscalas(escalas) {
        escalasListDiv.innerHTML = '';

        if (escalas.length === 0) {
            escalasListDiv.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-confetti" style="font-size: 3rem; margin-bottom: 15px; color: #a5b4fc;"></i>
                    <h3>Tudo livre!</h3>
                    <p>Você não tem nenhuma escala agendada no momento. Aproveite o descanso!</p>
                </div>`;
            return;
        }

        // Ordenar por data (mais recente primeiro ou próxima primeiro)
        // Normalmente para "minhas escalas", queremos a mais próxima primeiro.
        escalas.sort((a, b) => new Date(a.data) - new Date(b.data));

        escalas.forEach(escala => {
            const dataObj = new Date(escala.data);
            
            // Formatando Data
            const dia = dataObj.getUTCDate();
            const mes = dataObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
            const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
            // Capitaliza dia da semana
            const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);

            // Cria Link Wrapper
            const cardLink = document.createElement('a');
            cardLink.href = `detalhe-escala.html?id=${escala._id}`;
            cardLink.className = 'escala-card-link';
            
            cardLink.innerHTML = `
                <div class="escala-card">
                    <div class="date-badge">
                        <span class="date-day">${dia}</span>
                        <span class="date-month">${mes}</span>
                    </div>
                    
                    <div class="card-content">
                        <span class="ministry-badge">
                            <i class="ph ph-users-three"></i> ${escala.ministerio.nome}
                        </span>
                        <h2 class="card-title">${diaSemanaCap}</h2>
                        <div class="card-details">
                            <i class="ph ph-clock"></i>
                            <span>${escala.turno}</span>
                        </div>
                    </div>

                    <i class="ph ph-caret-right arrow-icon"></i>
                </div>
            `;
            escalasListDiv.appendChild(cardLink);
        });
    }
});