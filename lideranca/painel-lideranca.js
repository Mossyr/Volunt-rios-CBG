// painel-lideranca.js

document.addEventListener('DOMContentLoaded', () => {
    const ministryGridEl = document.getElementById('leader-ministry-grid');
    const loadingStatusEl = document.getElementById('loading-status');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';

    async function loadLeaderPanel() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '../login/login.html';
            return;
        }

        try {
            const userResponse = await fetch(`${API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!userResponse.ok) throw new Error("Erro de autenticação");
            
            const user = await userResponse.json();
            const leadershipRoles = user.ministerios.filter(m => m.funcao === 'Líder' && m.status === 'Aprovado');

            loadingStatusEl.style.display = 'none';

            if (leadershipRoles.length === 0) {
                ministryGridEl.innerHTML = `
                    <div class="empty-state">
                        <i class="ph ph-mask-sad" style="font-size: 3rem; color: #cbd5e1;"></i>
                        <p>Você não lidera nenhum ministério no momento.</p>
                    </div>
                `;
                return;
            }
            
            renderLeaderCards(leadershipRoles);

        } catch (error) {
            console.error('Erro:', error);
            loadingStatusEl.innerHTML = '<p style="color: white;">Erro ao carregar dados.</p>';
        }
    }
    
    function renderLeaderCards(roles) {
        ministryGridEl.innerHTML = '';
        
        roles.forEach(role => {
            // Criação do elemento 'A' principal (o Card inteiro é o link)
            const card = document.createElement('a');
            card.className = 'ministry-leader-card'; 
            card.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${role.ministerio._id}`;

            // Seleção de ícone baseado no nome (opcional, ou usa um genérico)
            const iconClass = getIconForMinistry(role.ministerio.nome);

            card.innerHTML = `
                <i class="ph ${iconClass} bg-icon"></i>
                
                <div class="card-top">
                    <span class="role-badge">
                        <i class="ph ph-crown-simple"></i> Líder
                    </span>
                    <h2 class="ministry-title">${role.ministerio.nome}</h2>
                    <p class="ministry-desc">Gerencie escalas e voluntários.</p>
                </div>

                <div class="action-row">
                    <span>Acessar Painel</span>
                    <div class="arrow-circle">
                        <i class="ph ph-caret-right"></i>
                    </div>
                </div>
            `;
            ministryGridEl.appendChild(card);
        });
    }

    // Função auxiliar simples para dar variedade visual (opcional)
    function getIconForMinistry(name) {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('music') || lowerName.includes('louvor')) return 'ph-music-notes';
        if (lowerName.includes('infantil') || lowerName.includes('kids')) return 'ph-baby';
        if (lowerName.includes('recepção') || lowerName.includes('acolhimento')) return 'ph-hand-waving';
        if (lowerName.includes('mídia') || lowerName.includes('tec')) return 'ph-monitor-play';
        return 'ph-users-three'; // Ícone padrão
    }

    loadLeaderPanel();
});