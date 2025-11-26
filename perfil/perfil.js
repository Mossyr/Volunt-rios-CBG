document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos da Página ---
    const userNameEl = document.getElementById('user-name');
    const userEmailEl = document.getElementById('user-email');
    const userInitialEl = document.getElementById('user-initial');
    const ministriesListEl = document.getElementById('ministries-list');
    const logoutBtn = document.getElementById('logout-btn');
    
    // --- Elementos do Modal ---
    const appBlurContainer = document.getElementById('app-blur-container');
    const modal = document.getElementById('logout-confirm-modal');
    const cancelModalBtn = document.getElementById('modal-cancel-btn');
    const confirmLogoutBtn = document.getElementById('modal-confirm-logout-btn');

    const API_URL = 'http://localhost:5000';

    // --- Funções Principais ---
    async function loadProfileData() {
        const token = localStorage.getItem('authToken');
        if (!token) {
            logout();
            return;
        }

        const cachedUserData = localStorage.getItem('userData');
        if (cachedUserData) {
            populateProfile(JSON.parse(cachedUserData));
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                   logout();
                }
                return;
            }

            const user = await response.json();
            localStorage.setItem('userData', JSON.stringify(user));
            populateProfile(user);

        } catch (error) {
            console.error('Erro ao buscar dados do perfil:', error);
        }
    }

    function populateProfile(user) {
        if (!user) return;

        // Atualiza cabeçalho
        userNameEl.textContent = user.nome;
        userEmailEl.textContent = user.email;
        if (user.nome) {
            userInitialEl.textContent = user.nome.charAt(0).toUpperCase();
        }

        // Renderiza Ministérios com novo visual
        ministriesListEl.innerHTML = '';
        
        if (user.ministerios && user.ministerios.length > 0) {
            user.ministerios.forEach(m => {
                const ministryItem = document.createElement('div');
                ministryItem.className = 'ministry-card'; // Nova classe CSS
                
                // Define classe da badge baseada no status ou função
                let badgeClass = 'pendente';
                let badgeText = m.status;

                if (m.status === 'Aprovado') {
                    if (m.funcao === 'Líder') {
                        badgeClass = 'lider';
                        badgeText = 'Líder';
                    } else {
                        badgeClass = 'aprovado';
                        badgeText = 'Voluntário';
                    }
                }

                ministryItem.innerHTML = `
                    <div class="ministry-info">
                        <strong>${m.ministerio.nome}</strong>
                        <span>${m.funcao}</span>
                    </div>
                    <div class="status-badge ${badgeClass}">${badgeText}</div>
                `;
                ministriesListEl.appendChild(ministryItem);
            });
        } else {
            ministriesListEl.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #94a3b8;">
                    <p>Você ainda não participa de nenhum ministério.</p>
                </div>`;
        }
    }
    
    function logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '../login/login.html'; 
    }

    // --- Funções do Modal ---
    function showLogoutModal() {
        appBlurContainer.classList.add('blurred');
        modal.classList.remove('modal-hidden');
    }

    function hideLogoutModal() {
        appBlurContainer.classList.remove('blurred');
        modal.classList.add('modal-hidden');
    }

    // --- Event Listeners ---
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogoutModal();
    });
    
    cancelModalBtn.addEventListener('click', hideLogoutModal);
    confirmLogoutBtn.addEventListener('click', logout);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideLogoutModal();
        }
    });

    // Placeholders
    document.getElementById('edit-profile-btn').addEventListener('click', (e) => {
        e.preventDefault();
        // Aqui você pode adicionar um Toast futuro
        alert('Edição de perfil em breve!');
    });

    document.getElementById('change-password-btn').addEventListener('click', (e) => {
        e.preventDefault();
        alert('Alteração de senha em breve!');
    });

    loadProfileData();
});