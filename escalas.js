document.addEventListener('DOMContentLoaded', async () => {
    const escalasListDiv = document.getElementById('escalas-list');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
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
        escalasListDiv.innerHTML = `<p>${error.message}</p>`;
    }

    function displayEscalas(escalas) {
        escalasListDiv.innerHTML = '';

        if (escalas.length === 0) {
            escalasListDiv.innerHTML = '<div class="card"><p>Você não tem nenhuma escala futura agendada. Aproveite o descanso! 😊</p></div>';
            return;
        }

        escalas.forEach(escala => {
            const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', {
                weekday: 'long', 
                day: 'numeric', 
                month: 'long',
                timeZone: 'UTC'
            });

            // Transforma o card inteiro em um link
            const cardLink = document.createElement('a');
            cardLink.href = `detalhe-escala.html?id=${escala._id}`;
            cardLink.className = 'escala-card-link';
            
            cardLink.innerHTML = `
                <div class="escala-card">
                    <div class="card-header">
                        <h2>${dataFormatada}</h2>
                        <span class="ministry-tag">${escala.ministerio.nome}</span>
                    </div>
                    <div class="escala-details">
                        <p><strong>Turno:</strong> ${escala.turno}</p>
                    </div>
                </div>
            `;
            escalasListDiv.appendChild(cardLink);
        });
    }
});