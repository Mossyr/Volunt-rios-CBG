document.addEventListener('DOMContentLoaded', async () => {
    const escalaHeader = document.getElementById('escala-header');
    const escalaDetailsContent = document.getElementById('escala-details-content');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));

    const urlParams = new URLSearchParams(window.location.search);
    const turnoId = urlParams.get('id');

    if (!token || !turnoId) {
        window.location.href = '../home/home.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/escalas/turno/${turnoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Escala não encontrada.');

        const turno = await response.json();
        displayEscalaDetails(turno);

    } catch (error) {
        escalaDetailsContent.innerHTML = `<p>${error.message}</p>`;
    }

    function displayEscalaDetails(turno) {
        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
        });
        escalaHeader.textContent = `${turno.ministerio.nome} - ${dataFormatada}`;

        let voluntariosHtml = turno.voluntarios.map(vol => 
            `<div class="voluntario-item"><p>${vol.nome} ${vol.sobrenome}</p></div>`
        ).join('');

        let actionButtonsHtml = '';
        // --- LÓGICA DE PERMISSÃO CORRETA ---
        // Se o ID do usuário logado for o mesmo que criou o turno, mostra os botões de ação
        if (userData.id === turno.criado_por) {
            actionButtonsHtml = `
                <div class="actions-section">
                    <button id="edit-btn" class="btn btn-secondary">Editar Equipe</button>
                    <button id="delete-btn" class="btn btn-delete">Excluir Escala</button>
                </div>
            `;
        }

        escalaDetailsContent.innerHTML = `
            <div class="card">
                <div class="escala-info">
                    <p><strong>Ministério:</strong> ${turno.ministerio.nome}</p>
                    <p><strong>Data:</strong> ${dataFormatada}</p>
                    <p><strong>Turno:</strong> ${turno.turno}</p>
                </div>
                <div class="voluntarios-list">
                    <h2>Equipe escalada</h2>
                    ${voluntariosHtml}
                </div>
                ${actionButtonsHtml}
            </div>
        `;
        
        // Adiciona os event listeners apenas se os botões existirem
        if (userData.id === turno.criado_por) {
            document.getElementById('edit-btn').addEventListener('click', () => {
                 window.location.href = `../criar-escalas/editar-escala.html?id=${turnoId}`;
            });
            document.getElementById('delete-btn').addEventListener('click', handleDelete);
        }
    }
    
    async function handleDelete() {
        if (!confirm('Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            // A requisição de exclusão agora será validada pelo backend
            const response = await fetch(`${API_URL}/escalas/turno/${turnoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Não foi possível excluir a escala.');
            }
            alert('Escala excluída com sucesso!');
            window.location.href = '../home/home.html';
        } catch (error) {
            alert(error.message);
        }
    }
});