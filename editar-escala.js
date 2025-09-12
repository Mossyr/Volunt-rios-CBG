document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('edit-escala-form');
    const loader = document.querySelector('.loader');
    const eventoNomeEl = document.getElementById('evento-nome');
    const dataTurnoEl = document.getElementById('data-turno');
    const atuaisListEl = document.getElementById('voluntarios-atuais-list');
    const disponiveisListEl = document.getElementById('voluntarios-disponiveis-list');
    const atuaisCountEl = document.getElementById('atuais-count');
    const disponiveisCountEl = document.getElementById('disponiveis-count');
    const feedbackMessageEl = document.getElementById('feedback-message');
    
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    // 1. Pegar o ID da escala pela URL
    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        showFeedback('Erro: ID da escala não fornecido.', 'error');
        return;
    }

    let todosVoluntariosDoMinisterio = [];
    let voluntariosNaEscala = new Set(); // Usar um Set é ótimo para performance e evitar duplicatas

    // Função principal para carregar todos os dados
    async function carregarDados() {
        try {
            // Puxa os dados da escala e os voluntários nela
            const escalaResponse = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!escalaResponse.ok) throw new Error('Falha ao carregar a escala.');
            const escala = await escalaResponse.json();

            // Puxa TODOS os voluntários daquele ministério
            const voluntariosResponse = await fetch(`${API_URL}/api/ministerios/${escala.ministerio._id}/voluntarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!voluntariosResponse.ok) throw new Error('Falha ao carregar voluntários do ministério.');
            todosVoluntariosDoMinisterio = await voluntariosResponse.json();

            // Preenche os campos do formulário
            eventoNomeEl.value = `${escala.ministerio.nome} | ${escala.evento || 'Escala Padrão'}`;
            const dataFormatada = new Date(escala.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            dataTurnoEl.value = `${dataFormatada} - ${escala.turno}`;

            // Popula o Set inicial de voluntários
            escala.voluntarios.forEach(vol => voluntariosNaEscala.add(vol._id));
            
            renderizarListas();

            loader.style.display = 'none';
            form.style.display = 'flex';

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            showFeedback(error.message, 'error');
            loader.style.display = 'none';
        }
    }

    // Função para desenhar as listas na tela
    function renderizarListas() {
        atuaisListEl.innerHTML = '';
        disponiveisListEl.innerHTML = '';

        todosVoluntariosDoMinisterio.forEach(vol => {
            const itemHtml = `
                <li class="volunteer-item" data-id="${vol._id}">
                    <span class="volunteer-name">${vol.nome} ${vol.sobrenome}</span>
                    <button type="button" class="btn-toggle-volunteer ${voluntariosNaEscala.has(vol._id) ? 'remove' : 'add'}">
                        ${voluntariosNaEscala.has(vol._id) ? 'Remover' : 'Adicionar'}
                    </button>
                </li>`;
            
            if (voluntariosNaEscala.has(vol._id)) {
                atuaisListEl.innerHTML += itemHtml;
            } else {
                disponiveisListEl.innerHTML += itemHtml;
            }
        });
        
        atuaisCountEl.textContent = atuaisListEl.children.length;
        disponiveisCountEl.textContent = disponiveisListEl.children.length;
    }

    // Adiciona ou remove voluntário ao clicar no botão
    function handleToggleVolunteer(event) {
        const button = event.target.closest('.btn-toggle-volunteer');
        if (!button) return;

        const volunteerId = button.parentElement.dataset.id;
        
        if (voluntariosNaEscala.has(volunteerId)) {
            voluntariosNaEscala.delete(volunteerId);
        } else {
            voluntariosNaEscala.add(volunteerId);
        }

        renderizarListas(); // Redesenha tudo
    }

    atuaisListEl.addEventListener('click', handleToggleVolunteer);
    disponiveisListEl.addEventListener('click', handleToggleVolunteer);

    // Salva as alterações
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('.btn-submit');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ voluntarios: Array.from(voluntariosNaEscala) })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Falha ao salvar as alterações.');
            }
            
            showFeedback('Escala atualizada com sucesso!', 'success');
            setTimeout(() => window.location.href = '../home/home.html', 1500);

        } catch (error) {
            showFeedback(error.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        }
    });

    function showFeedback(message, type) {
        feedbackMessageEl.textContent = message;
        feedbackMessageEl.className = `feedback-message ${type}`;
        feedbackMessageEl.style.display = 'block';
    }

    // Inicia o processo
    carregarDados();
});