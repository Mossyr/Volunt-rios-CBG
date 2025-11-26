document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('edit-escala-form');
    const loader = document.querySelector('.loader');
    const ministerioNomeEl = document.getElementById('ministerio-nome');
    const dataEventoEl = document.getElementById('data-evento');
    const modalidadeDisplayEl = document.getElementById('modalidade-display');
    
    // Elementos da UI Padrão
    const defaultSection = document.getElementById('default-volunteers-section');
    const atuaisListEl = document.getElementById('voluntarios-atuais-list');
    const disponiveisListEl = document.getElementById('voluntarios-disponiveis-list');
    const atuaisCountEl = document.getElementById('atuais-count');
    const disponiveisCountEl = document.getElementById('disponiveis-count');
    
    // Elementos da UI Comunicação
    const comunicacaoSection = document.getElementById('comunicacao-edit-section');
    const comunicadorAvisosSelect = document.getElementById('comunicador-avisos-edit');
    const comunicadorOfertasSelect = document.getElementById('comunicador-ofertas-edit');
    
    // Elementos da UI Mídias
    const midiasSection = document.getElementById('midias-edit-section');
    const voluntariosTelaoDiv = document.getElementById('voluntarios-telao-edit');
    const voluntariosStoriesDiv = document.getElementById('voluntarios-stories-edit');

    const feedbackMessageEl = document.getElementById('feedback-message');
    const btnDeletar = document.getElementById('btn-deletar-escala');
    
    // --- CORREÇÃO 1: MUDANDO PARA LOCALHOST ---
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        showFeedback('Erro: ID da escala não fornecido.', 'error');
        return;
    }

    let todosVoluntariosDoMinisterio = [];
    let escalaAtual = null;
    let voluntariosNaEscala = new Set(); // IDs de voluntários para a UI Padrão

    // Função para mostrar feedback na tela
    function showFeedback(message, type) {
        feedbackMessageEl.textContent = message;
        feedbackMessageEl.className = `feedback-message ${type}`;
        feedbackMessageEl.style.display = 'block';
        loader.style.display = 'none';
        form.style.display = 'flex';
    }
    
    // Função para resetar e ocultar as seções especializadas
    function resetSpecializedUI() {
        defaultSection.style.display = 'none';
        comunicacaoSection.style.display = 'none';
        midiasSection.style.display = 'none';
    }

    // --- RENDERIZAÇÃO DE UI ESPECIALIZADA ---
    function renderSpecializedUI(escala, todosVoluntarios) {
        resetSpecializedUI();

        // Mapeia os voluntários atuais por ID (se a API retornar um array simples de IDs)
        const currentVolunteersIDs = new Set(escala.voluntarios.map(v => v._id || v));
        // Mapeia os voluntários atuais por ID e Role (se a API retornar um array de objetos)
        const currentVolunteersRoles = new Map(escala.voluntarios.map(v => [v.role, v._id]));
        
        // Obtém o nome do ministério
        const ministerioNome = escala.ministerio.nome; 
        
        // 1. Comunicação - Culto de Domingo
        if (escala.modalidade === 'Culto de Domingo - Comunicação') {
            comunicacaoSection.style.display = 'block';
            
            const defaultOption = '<option value="" disabled selected>Selecione o Voluntário</option>';
            comunicadorAvisosSelect.innerHTML = defaultOption;
            comunicadorOfertasSelect.innerHTML = defaultOption;

            todosVoluntarios.forEach(vol => {
                const option = `<option value="${vol._id}">${vol.nome} ${vol.sobrenome}</option>`;
                comunicadorAvisosSelect.innerHTML += option;
                comunicadorOfertasSelect.innerHTML += option;
            });

            // Pré-seleciona os voluntários atuais
            if (currentVolunteersRoles.get('Avisos')) {
                comunicadorAvisosSelect.value = currentVolunteersRoles.get('Avisos');
            } else if (escala.voluntarios.length > 0) {
                 comunicadorAvisosSelect.value = escala.voluntarios[0]._id || escala.voluntarios[0];
                 comunicadorOfertasSelect.value = escala.voluntarios[1]._id || escala.voluntarios[1];
            }


        } 
        // 2. Mídias - Padrão (Exibir se a modalidade for específica OU se o nome do ministério for 'Mídias')
        else if (escala.modalidade === 'Padrão - Mídias' || ministerioNome === 'Mídias') { // <-- Lógica alterada
            midiasSection.style.display = 'block';

            // Popula os checkboxes. Aqui assumimos que todos os voluntários na escala estão na lista atual (currentVolunteersIDs)
            populateMidiasCheckboxes(todosVoluntarios, voluntariosTelaoDiv, currentVolunteersIDs);
            populateMidiasCheckboxes(todosVoluntarios, voluntariosStoriesDiv, currentVolunteersIDs);
            
        } 
        // 3. UI Padrão
        else {
            defaultSection.style.display = 'grid';
            renderDefaultUI(escala, todosVoluntarios);
        }
    }
    
    // Função auxiliar para Mídias (popula e pré-seleciona)
    function populateMidiasCheckboxes(volunteers, container, currentVolunteersIDs) {
        container.innerHTML = volunteers.map(vol => {
            // Verifica se o voluntário está na escala (ou seja, se o ID está em currentVolunteersIDs)
            const isChecked = currentVolunteersIDs.has(vol._id);
            const roleName = container.id.includes('telao') ? 'telao' : 'stories'; // Infere a função pelo container
            
            let checkedAttr = isChecked ? 'checked' : '';
            
            return `
                <div class="volunteer-option">
                    <input type="checkbox" id="${roleName}-${vol._id}" value="${vol._id}" data-role="${roleName}" ${checkedAttr}>
                    <label for="${roleName}-${vol._id}">${vol.nome} ${vol.sobrenome}</label>
                </div>
            `;
        }).join('');
    }
    
    // --- FUNÇÃO PADRÃO DE RENDERIZAÇÃO DE LISTAS (Para UI Padrão) ---
    function renderDefaultUI(escala, todosVoluntarios) {
        atuaisListEl.innerHTML = '';
        disponiveisListEl.innerHTML = '';
        voluntariosNaEscala.clear(); 
        
        const escalaIDs = new Set(escala.voluntarios.map(v => v._id || v));

        todosVoluntarios.forEach(vol => {
            const isNaEscala = escalaIDs.has(vol._id);
            const listEl = isNaEscala ? atuaisListEl : disponiveisListEl;
            const action = isNaEscala ? 'remove' : 'add';

            if (isNaEscala) {
                voluntariosNaEscala.add(vol._id);
            }

            const listItem = document.createElement('li');
            listItem.className = 'volunteer-item';
            listItem.innerHTML = `
                <span class="volunteer-name">${vol.nome} ${vol.sobrenome}</span>
                <button type="button" class="btn-toggle-volunteer ${action}" data-id="${vol._id}" data-action="${action}">
                    ${action === 'add' ? 'Adicionar' : 'Remover'}
                </button>
            `;
            listEl.appendChild(listItem);
        });

        atuaisCountEl.textContent = voluntariosNaEscala.size;
        disponiveisCountEl.textContent = todosVoluntarios.length - voluntariosNaEscala.size;
    }

    // --- CARREGAMENTO DE DADOS PRINCIPAL ---
    async function carregarDados() {
        loader.style.display = 'block';
        form.style.display = 'none'; // Esconde o formulário antes de carregar
        
        try {
            // 1. Puxa os dados da escala
            // Mantendo a rota /turno/ para o backend que você forneceu, mas você pode mudar para /api/escalas/${escalaId} se tiver alterado o routes
            const escalaResponse = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!escalaResponse.ok) {
                 if (escalaResponse.status === 404) {
                     throw new Error('Escala não encontrada. Verifique se a rota /api/escalas/turno/:id existe no seu backend.');
                 }
                 throw new Error('Falha ao carregar a escala.');
            }
            escalaAtual = await escalaResponse.json();

            // 2. Puxa todos os voluntários disponíveis do ministério
            const volResponse = await fetch(`${API_URL}/api/lider/voluntarios/${escalaAtual.ministerio._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!volResponse.ok) throw new Error('Não foi possível carregar os voluntários.');
            todosVoluntariosDoMinisterio = await volResponse.json();
            
            // 3. Popula os campos somente leitura
            ministerioNomeEl.value = escalaAtual.ministerio.nome;
            dataEventoEl.value = `${new Date(escalaAtual.data).toLocaleDateString()} - ${escalaAtual.turno || 'Geral'}`;
            modalidadeDisplayEl.value = escalaAtual.modalidade || 'Padrão';

            // 4. Renderiza a UI correta
            renderSpecializedUI(escalaAtual, todosVoluntariosDoMinisterio);
            
            loader.style.display = 'none';
            form.style.display = 'flex'; // Mostra o formulário APÓS o carregamento e preenchimento

        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            showFeedback(error.message, 'error');
        }
    }
    
    // Listener para o botão de Adicionar/Remover (funciona apenas na UI Padrão)
    defaultSection.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-toggle-volunteer')) {
            const id = e.target.getAttribute('data-id');
            const action = e.target.getAttribute('data-action');

            if (action === 'add') {
                escalaAtual.voluntarios.push({ _id: id, nome: 'Placeholder' });
            } else {
                escalaAtual.voluntarios = escalaAtual.voluntarios.filter(v => (v._id || v) !== id);
            }
            renderDefaultUI(escalaAtual, todosVoluntariosDoMinisterio);
        }
    });

    // --- Listener para Deletar Escala ---
    btnDeletar.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja DELETAR esta escala? Esta ação é irreversível.')) {
            return;
        }

        btnDeletar.disabled = true;
        btnDeletar.textContent = 'Deletando...';

        try {
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Falha ao deletar a escala.');
            }

            showFeedback('Escala deletada com sucesso!', 'success');
            setTimeout(() => window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${escalaAtual.ministerio._id}`, 1500);

        } catch (error) {
            showFeedback(error.message, 'error');
            btnDeletar.disabled = false;
            btnDeletar.textContent = 'Deletar Escala';
        }
    });


    // --- Listener de Submissão (Coleta dados baseados na UI ativa) ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('.btn-submit');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';
        
        let newVolunteers = [];
        let dataToSend = {};

        try {
            if (escalaAtual.modalidade === 'Culto de Domingo - Comunicação') {
                const avisosId = comunicadorAvisosSelect.value;
                const ofertasId = comunicadorOfertasSelect.value;

                if (!avisosId || !ofertasId) {
                    throw new Error("Selecione um voluntário para Avisos e outro para Ofertas.");
                }
                
                newVolunteers = [avisosId, ofertasId];
                dataToSend = { voluntarios: newVolunteers };
                
            } else if (escalaAtual.modalidade === 'Padrão - Mídias' || escalaAtual.ministerio.nome === 'Mídias') { // <-- AJUSTADO
                const telaoVolunteers = Array.from(voluntariosTelaoDiv.querySelectorAll('input:checked')).map(input => input.value);
                const storiesVolunteers = Array.from(voluntariosStoriesDiv.querySelectorAll('input:checked')).map(input => input.value);
                
                if (telaoVolunteers.length === 0) {
                    throw new Error("É necessário selecionar pelo menos um voluntário para o Telão.");
                }
                
                // Combina os IDs (Set garante que não haja duplicatas)
                newVolunteers = Array.from(new Set(telaoVolunteers.concat(storiesVolunteers))); 
                dataToSend = { voluntarios: newVolunteers };
                
            } else {
                // UI Padrão ou outras modalidades
                newVolunteers = Array.from(voluntariosNaEscala);
                 if (newVolunteers.length === 0) {
                     throw new Error("A escala não pode ser salva sem voluntários.");
                 }
                dataToSend = { voluntarios: newVolunteers };
            }
            
            // Envio da requisição de atualização (PUT)
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Falha ao salvar as alterações.');
            }
            
            showFeedback('Escala atualizada com sucesso!', 'success');
            setTimeout(() => window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${escalaAtual.ministerio._id}`, 1500);

        } catch (error) {
            showFeedback(error.message, 'error');
            submitButton.disabled = false;
            submitButton.textContent = 'Salvar Alterações';
        }
    });

    carregarDados();
});