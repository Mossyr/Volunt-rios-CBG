document.addEventListener('DOMContentLoaded', async () => {
    const pendingListEl = document.getElementById('pending-list');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    // 1. Pega o ID do ministério da URL
    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');

    if (!token || !ministerioId) {
        alert('Acesso inválido.');
        window.location.href = '../home/home.html';
        return;
    }

    // 2. Busca os voluntários pendentes na API
    try {
        const response = await fetch(`${API_URL}/lider/pendentes/${ministerioId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.msg || 'Erro ao buscar voluntários.');
        }

        const pendingUsers = await response.json();
        displayPendingUsers(pendingUsers);

    } catch (error) {
        console.error('Erro:', error);
        pendingListEl.innerHTML = `<p>${error.message}</p>`;
    }

    // 3. Função para exibir a lista na tela
    function displayPendingUsers(users) {
        pendingListEl.innerHTML = ''; // Limpa a mensagem "Carregando..."
        if (users.length === 0) {
            pendingListEl.innerHTML = '<p>Nenhum voluntário pendente de aprovação.</p>';
            return;
        }

        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'pending-item';
            item.innerHTML = `
                <p>${user.nome} ${user.sobrenome}</p>
                <button class="approve-btn" data-id="${user._id}">Aprovar</button>
            `;
            pendingListEl.appendChild(item);
        });
    }

    // 4. Adiciona evento de clique para os botões "Aprovar"
    pendingListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('approve-btn')) {
            const voluntarioId = e.target.dataset.id;
            e.target.disabled = true;
            e.target.textContent = 'Aprovando...';

            try {
                const response = await fetch(`${API_URL}/lider/aprovar`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ voluntarioId, ministerioId })
                });

                if (!response.ok) {
                    throw new Error('Falha ao aprovar.');
                }
                
                // Remove o item da lista após a aprovação
                e.target.closest('.pending-item').remove();

            } catch (error) {
                console.error('Erro ao aprovar:', error);
                alert(error.message);
                e.target.disabled = false;
                e.target.textContent = 'Aprovar';
            }
        }
    });
});