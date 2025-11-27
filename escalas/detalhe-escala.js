document.addEventListener('DOMContentLoaded', async () => {
    const escalaDetailsContent = document.getElementById('escala-details-content');
    const API_URL = 'https://back-end-volunt-rios.onrender.com'; // Ajustado para local ou sua URL de prod
    const token = localStorage.getItem('authToken');
    
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
    } catch (e) {
        console.error("Erro ao ler userData", e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const turnoId = urlParams.get('id');

    if (!token || !turnoId) {
        window.location.href = '../home/home.html';
        return;
    }

    // --- FUNÇÃO MODAL CUSTOMIZADO ---
    function showConfirmModal(title, text, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🗑️</div>
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
        const response = await fetch(`${API_URL}/api/escalas/turno/${turnoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Escala não encontrada.');

        const turno = await response.json();
        displayEscalaDetails(turno);

    } catch (error) {
        console.error(error);
        escalaDetailsContent.innerHTML = `
            <div style="text-align: center; color: white; padding: 40px;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; margin-bottom: 10px;"></i>
                <p>Não foi possível carregar os detalhes.</p>
                <a href="../home/home.html" style="color: white; margin-top: 20px; display: block;">Voltar ao início</a>
            </div>`;
    }

    function displayEscalaDetails(turno) {
        const dataFormatada = new Date(turno.data).toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
        });
        const dataCap = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

        // --- CORREÇÃO AQUI: EXTRAÇÃO SEGURA DO NOME E FUNÇÃO ---
        let voluntariosHtml = turno.voluntarios.map(vol => {
            // Tenta achar o nome (pode estar em 'vol.nome' ou 'vol.usuario.nome')
            let nome = 'Voluntário';
            
            if (vol.nome) { 
                nome = vol.nome; // Formato "achatado" pelo controller
            } else if (vol.usuario && vol.usuario.nome) {
                nome = vol.usuario.nome; // Formato aninhado original
            }
            
            const sobrenome = vol.sobrenome || (vol.usuario ? vol.usuario.sobrenome : '') || '';
            const role = vol.role || 'Voluntário';
            
            const initial = nome.charAt(0).toUpperCase();
            
            // Mostra a função se não for padrão
            const roleBadge = (role !== 'Voluntário') 
                ? `<span style="font-size:0.75rem; background:#e0e7ff; color:#4f46e5; padding:2px 8px; border-radius:10px; margin-left:6px;">${role}</span>` 
                : '';

            return `
                <div class="voluntario-item">
                    <div class="avatar">${initial}</div>
                    <div class="v-info">
                        <div class="v-name">
                            ${nome} ${sobrenome}
                            ${roleBadge}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Botões de Ação
        let actionButtonsHtml = '';
        if (userData && userData.id === turno.criado_por) {
            actionButtonsHtml = `
                <div class="actions-section">
                    <button id="edit-btn" class="btn btn-edit">
                        <i class="ph ph-pencil-simple"></i> Editar
                    </button>
                    <button id="delete-btn" class="btn btn-delete">
                        <i class="ph ph-trash"></i> Excluir
                    </button>
                </div>
            `;
        }

        escalaDetailsContent.innerHTML = `
            <div class="detail-card">
                <div class="card-header-hero">
                    <div class="ministry-badge">
                        <i class="ph ph-users-three"></i> ${turno.ministerio.nome}
                    </div>
                    <h2 class="escala-date">${dataCap}</h2>
                    <div class="escala-shift">
                        <i class="ph ph-clock"></i> ${turno.turno}
                    </div>
                </div>
                
                <div class="card-body">
                    <span class="section-label">Equipe Escalada</span>
                    <div class="voluntarios-list">
                        ${voluntariosHtml || '<p style="color:#94a3b8; font-size:0.9rem;">Ninguém escalado ainda.</p>'}
                    </div>

                    ${actionButtonsHtml}
                </div>
            </div>
        `;
        
        // Listeners
        if (userData && userData.id === turno.criado_por) {
            document.getElementById('edit-btn').addEventListener('click', () => {
                 window.location.href = `../criar-escalas/editar-escala.html?id=${turnoId}`;
            });
            document.getElementById('delete-btn').addEventListener('click', handleDelete);
        }
    }
    
    async function handleDelete() {
        showConfirmModal(
            'Excluir Escala',
            'Tem certeza? Essa ação apagará a escala para todos os voluntários e não pode ser desfeita.',
            async () => {
                try {
                    const response = await fetch(`${API_URL}/api/escalas/turno/${turnoId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.msg || 'Erro ao excluir.');
                    }
                    
                    escalaDetailsContent.innerHTML = `
                        <div style="text-align: center; color: white; padding: 40px;">
                            <i class="ph ph-check-circle" style="font-size: 3rem; margin-bottom: 10px;"></i>
                            <p>Escala excluída com sucesso!</p>
                        </div>
                    `;
                    setTimeout(() => window.location.href = '../home/home.html', 1500);
                    
                } catch (error) {
                    alert(error.message);
                }
            }
        );
    }
});