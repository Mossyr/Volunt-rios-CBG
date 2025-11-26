document.addEventListener('DOMContentLoaded', async () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    const proximasEscalasList = document.getElementById('proximas-escalas-list');
    const voluntariosList = document.getElementById('voluntarios-list');
    const dashboardContent = document.getElementById('dashboard-content');
    const loader = document.querySelector('.loader');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');

    if (!token || !ministerioId) {
        window.location.href = '../home/home.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/lider/dashboard/${ministerioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Falha ao carregar dados do ministério. Verifique se você é o líder.');
        const data = await response.json();

        ministryHeader.textContent = data.ministerio.nome;
        document.getElementById('link-criar-escala').href = `../criar-escalas/criar-escala.html?ministerioId=${ministerioId}`;
        document.getElementById('link-aprovar').href = `../gerenciar/pendentes.html?ministerioId=${ministerioId}`;

        proximasEscalasList.innerHTML = '';
        if (data.proximasEscalas.length > 0) {
            data.proximasEscalas.forEach(escala => {
                const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                const item = document.createElement('div');
                item.className = 'schedule-item';
                item.innerHTML = `
                    <div class="schedule-info">
                        <strong>${dataFormatada} - ${escala.turno}</strong>
                        <span>${escala.voluntarios.length} voluntário(s)</span>
                    </div>
                    <div class="schedule-actions">
                        <a href="../criar-escalas/editar-escala.html?id=${escala._id}" class="btn-icon btn-edit-schedule" aria-label="Editar">✏️</a>
                        <button class="btn-icon btn-delete-schedule" data-escala-id="${escala._id}" aria-label="Excluir">🗑️</button>
                    </div>
                `;
                proximasEscalasList.appendChild(item);
            });
        } else {
            proximasEscalasList.innerHTML = '<p>Nenhuma escala futura criada.</p>';
        }

        voluntariosList.innerHTML = '';
        data.todosVoluntarios.forEach(vol => {
            const item = document.createElement('li');
            item.textContent = `${vol.nome} ${vol.sobrenome}`;
            voluntariosList.appendChild(item);
        });

        loader.style.display = 'none';
        dashboardContent.style.display = 'block';

    } catch (error) {
        console.error("Erro:", error);
        loader.style.display = 'none';
        dashboardContent.innerHTML = `<p class="error-message">${error.message}</p>`;
        dashboardContent.style.display = 'block';
    }
    
    // --- LÓGICA DE DELEÇÃO (AGORA USANDO ROTA LIMPA) ---
    proximasEscalasList.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.btn-delete-schedule');
        if (deleteButton) {
            const escalaId = deleteButton.dataset.escalaId;
            if (confirm('Tem certeza que deseja excluir esta escala?')) {
                try {
                    // CORREÇÃO: Chamando a rota explícita /turno/:escalaId
                    const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.msg || `Falha ao excluir. Status: ${response.status}`);
                    }
                    
                    alert('Exclusão realizada com sucesso!');
                    deleteButton.closest('.schedule-item').remove();
                } catch (err) {
                    alert(err.message);
                }
            }
        }
    });
});