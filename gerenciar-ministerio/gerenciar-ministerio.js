document.addEventListener('DOMContentLoaded', async () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    const proximasEscalasList = document.getElementById('proximas-escalas-list');
    const voluntariosList = document.getElementById('voluntarios-list');
    const dashboardContent = document.getElementById('dashboard-content');
    const loader = document.getElementById('main-loader');

    // Contadores
    const countEscalas = document.getElementById('count-escalas');
    const countVoluntarios = document.getElementById('count-voluntarios');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');

    if (!token || !ministerioId) {
        window.location.href = '../home/home.html';
        return;
    }

    // --- FUNÇÃO MODAL CUSTOMIZADO ---
    function showConfirmModal(title, text, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal">
                <div style="font-size: 2.5rem; margin-bottom: 10px; color: #ef4444;">🗑️</div>
                <h3 style="margin:0 0 8px 0; font-size:1.2rem; color:#1f2937;">${title}</h3>
                <p style="margin:0; color:#6b7280; font-size:0.9rem;">${text}</p>
                <div class="modal-actions">
                    <button class="btn-modal btn-cancel">Cancelar</button>
                    <button class="btn-modal btn-confirm-delete">Excluir</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        overlay.querySelector('.btn-cancel').onclick = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.querySelector('.btn-confirm-delete').onclick = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
            onConfirm();
        };
    }

    try {
        const response = await fetch(`${API_URL}/api/lider/dashboard/${ministerioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Falha ao carregar dados. Verifique permissões.');
        const data = await response.json();

        // Header e Links
        ministryHeader.textContent = data.ministerio.nome;
        document.getElementById('link-criar-escala').href = `../criar-escalas/criar-escala.html?ministerioId=${ministerioId}`;
        document.getElementById('link-aprovar').href = `../gerenciar/pendentes.html?ministerioId=${ministerioId}`;

        // Contadores
        countEscalas.textContent = data.proximasEscalas.length;
        countVoluntarios.textContent = data.todosVoluntarios.length;

        // Renderizar Escalas
        proximasEscalasList.innerHTML = '';
        if (data.proximasEscalas.length > 0) {
            data.proximasEscalas.forEach(escala => {
                const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                
                const item = document.createElement('div');
                item.className = 'schedule-item';
                item.innerHTML = `
                    <div class="schedule-info">
                        <strong>${dataFormatada} · ${escala.turno}</strong>
                        <span><i class="ph ph-users"></i> ${escala.voluntarios.length} voluntários</span>
                    </div>
                    <div class="schedule-actions">
                        <a href="../criar-escalas/editar-escala.html?id=${escala._id}" class="btn-icon btn-edit-schedule" aria-label="Editar">
                            <i class="ph ph-pencil-simple"></i>
                        </a>
                        <button class="btn-icon btn-delete-schedule" data-escala-id="${escala._id}" aria-label="Excluir">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                `;
                proximasEscalasList.appendChild(item);
            });
        } else {
            proximasEscalasList.innerHTML = '<p style="color:#94a3b8; padding:10px; font-style:italic;">Nenhuma escala futura.</p>';
        }

        // Renderizar Voluntários
        voluntariosList.innerHTML = '';
        data.todosVoluntarios.forEach(vol => {
            const initial = vol.nome.charAt(0).toUpperCase();
            const item = document.createElement('li');
            item.innerHTML = `
                <div class="v-avatar">${initial}</div>
                <div class="v-name">${vol.nome} ${vol.sobrenome || ''}</div>
            `;
            voluntariosList.appendChild(item);
        });

        loader.style.display = 'none';
        dashboardContent.style.display = 'grid'; // Grid display para ativar layout

    } catch (error) {
        console.error("Erro:", error);
        loader.style.display = 'none';
        dashboardContent.innerHTML = `<div style="text-align:center; padding:20px; color:white;"><p>${error.message}</p></div>`;
        dashboardContent.style.display = 'block';
    }
    
    // --- LÓGICA DE DELEÇÃO COM MODAL ---
    proximasEscalasList.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete-schedule');
        if (deleteButton) {
            const escalaId = deleteButton.dataset.escalaId;
            
            showConfirmModal(
                'Excluir Escala',
                'Tem certeza? Esta ação removerá a escala para todos os voluntários escalados.',
                async () => {
                    try {
                        const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.msg || 'Falha ao excluir.');
                        }
                        
                        // Remove item da lista com animação
                        const item = deleteButton.closest('.schedule-item');
                        item.style.opacity = '0';
                        setTimeout(() => item.remove(), 300);
                        
                        // Atualiza contador
                        const currentCount = parseInt(countEscalas.textContent);
                        if (currentCount > 0) countEscalas.textContent = currentCount - 1;

                    } catch (err) {
                        alert(err.message);
                    }
                }
            );
        }
    });
});