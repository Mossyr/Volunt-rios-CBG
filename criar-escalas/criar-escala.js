document.addEventListener('DOMContentLoaded', () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    const volunteersListDiv = document.getElementById('volunteers-list');
    const form = document.getElementById('create-escala-form');
    const dateInput = document.getElementById('escala-data');
    const backLink = document.getElementById('back-link');
    
    // --- NOVOS ELEMENTOS ADICIONADOS ---
    const turnoInputGroup = document.getElementById('turno-input-group');
    const escalaTurno = document.getElementById('escala-turno');
    const modalidadeInputGroup = document.getElementById('modalidade-input-group');
    const escalaModalidade = document.getElementById('escala-modalidade');
    
    const comunicacaoVolunteersDiv = document.getElementById('comunicacao-volunteers');
    const comunicadorAvisosSelect = document.getElementById('comunicador-avisos');
    const comunicadorOfertasSelect = document.getElementById('comunicador-ofertas');
    
    const midiasVolunteersDiv = document.getElementById('midias-volunteers');
    const voluntariosTelaoDiv = document.getElementById('voluntarios-telao');
    const voluntariosStoriesDiv = document.getElementById('voluntarios-stories');
    
    const dynamicVolunteersSelection = document.getElementById('dynamic-volunteers-selection');
    // ------------------------------------

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');
    let ministerioNome = ''; // Para guardar o nome do ministério
    let todosVoluntariosDisponiveis = []; // Para guardar todos os voluntários

    // Monta o link de "Voltar" dinamicamente com o ID do ministério
    if (ministerioId) {
        backLink.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`;
    } else {
        backLink.href = '../home/home.html'; // Fallback para a home se não encontrar o ID
    }

    if (!token || !ministerioId) {
        alert('Acesso inválido.');
        window.location.href = '../home/home.html';
        return;
    }

    async function loadMinistryInfo() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const ministry = userData.ministerios.find(m => m.ministerio._id === ministerioId);
            if (ministry) {
                ministerioNome = ministry.ministerio.nome;
                ministryHeader.textContent = `Ministério: ${ministerioNome}`;
                // Configura a interface com base no ministério
                setupMinistryUI(ministerioNome);
            }
        } catch (error) {
            console.error("Erro ao carregar dados do ministério:", error);
            ministryHeader.textContent = "Ministério não encontrado";
        }
    }
    
    // --- NOVA FUNÇÃO: Configura UI por Ministério ---
    function setupMinistryUI(nome) {
        // Esconde tudo o que é específico por padrão
        volunteersListDiv.style.display = 'block';
        modalidadeInputGroup.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';

        if (nome === 'Comunicação') {
            // Configura modalidade para Comunicação
            modalidadeInputGroup.style.display = 'block';
            escalaModalidade.innerHTML = `
                <option value="padrao">Padrão (Gravação/Evento Semanal)</option>
                <option value="culto-domingo">Culto de Domingo (Avisos/Ofertas)</option>
            `;
            // Por padrão, esconde a lista padrão de checkbox, pois usaremos selects
            volunteersListDiv.style.display = 'none';
            // Configura o valor inicial da modalidade
            escalaModalidade.value = 'padrao'; 
            // Mostra o turno padrão para a modalidade 'padrao'
            turnoInputGroup.style.display = 'block'; 

        } else if (nome === 'Mídias') {
            // Configura modalidade para Mídias
            modalidadeInputGroup.style.display = 'block';
            escalaModalidade.innerHTML = `
                <option value="padrao">Padrão (Telão e Stories)</option>
            `;
            escalaModalidade.value = 'padrao';
            // Para Mídias, usamos o bloco dinâmico de Mídias
            midiasVolunteersDiv.style.display = 'block';
            volunteersListDiv.style.display = 'none';
            // Mostra o turno padrão
            turnoInputGroup.style.display = 'block';
        }
        
        // Listener para mudar a exibição ao trocar a modalidade
        escalaModalidade.addEventListener('change', () => {
            renderDynamicVolunteersSelection(escalaModalidade.value, todosVoluntariosDisponiveis);
        });
    }
    // ---------------------------------------------
    
    // --- FUNÇÃO DE BUSCA DE VOLUNTÁRIOS ---
    async function fetchAvailableVolunteers(date) {
        dynamicVolunteersSelection.innerHTML = "<p>Buscando voluntários disponíveis...</p>";
        const fetchUrl = `${API_URL}/api/lider/voluntarios/${ministerioId}?data=${date}`;
        try {
            const response = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error('Não foi possível carregar os voluntários.');
            }
            // Guarda a lista completa
            todosVoluntariosDisponiveis = await response.json(); 
            
            // Renderiza a seleção com base no ministério e modalidade atual
            const currentModalidade = escalaModalidade.value || 'padrao';
            renderDynamicVolunteersSelection(currentModalidade, todosVoluntariosDisponiveis);
            
        } catch (error) {
            console.error("Erro ao carregar voluntários:", error);
            dynamicVolunteersSelection.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }
    // ---------------------------------------------

    // --- NOVA FUNÇÃO: Renderiza a seleção dinâmica ---
    function renderDynamicVolunteersSelection(modalidade, volunteers) {
        volunteersListDiv.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';
        turnoInputGroup.style.display = 'block';

        if (volunteers.length === 0) {
            dynamicVolunteersSelection.innerHTML = "<p>Nenhum voluntário disponível para esta data.</p>";
            return;
        }

        if (ministerioNome === 'Comunicação' && modalidade === 'culto-domingo') {
            // Comunicação - Culto de Domingo
            volunteersListDiv.style.display = 'none';
            comunicacaoVolunteersDiv.style.display = 'block';
            dynamicVolunteersSelection.innerHTML = '';
            dynamicVolunteersSelection.appendChild(comunicacaoVolunteersDiv);
            
            // Esconde o campo de Turno para o Culto de Domingo (Subentende-se Noite/Geral)
            turnoInputGroup.style.display = 'none'; 
            
            populateSelects(volunteers);
            
        } else if (ministerioNome === 'Mídias') {
            // Mídias - Padrão (Telão e Stories)
            volunteersListDiv.style.display = 'none';
            midiasVolunteersDiv.style.display = 'block';
            dynamicVolunteersSelection.innerHTML = '';
            dynamicVolunteersSelection.appendChild(midiasVolunteersDiv);

            // Popula as listas de checkbox
            populateCheckboxes(volunteers, voluntariosTelaoDiv, 'telao');
            populateCheckboxes(volunteers, voluntariosStoriesDiv, 'stories');
            
        } else {
            // Padrão (incluindo Comunicação - Padrão e outros ministérios)
            volunteersListDiv.style.display = 'block';
            dynamicVolunteersSelection.innerHTML = '';
            dynamicVolunteersSelection.appendChild(volunteersListDiv);
            
            // Popula a lista de checkbox padrão
            populateStandardCheckboxes(volunteers);
        }
    }
    // ---------------------------------------------
    
    // --- FUNÇÕES DE POPULAMENTO DE ELEMENTOS ---
    function populateSelects(volunteers) {
        const defaultOption = '<option value="" disabled selected>Selecione o Voluntário</option>';
        
        comunicadorAvisosSelect.innerHTML = defaultOption + volunteers.map(vol => 
            `<option value="${vol._id}">${vol.nome} ${vol.sobrenome}</option>`
        ).join('');
        
        comunicadorOfertasSelect.innerHTML = defaultOption + volunteers.map(vol => 
            `<option value="${vol._id}">${vol.nome} ${vol.sobrenome}</option>`
        ).join('');
    }

    function populateCheckboxes(volunteers, container, roleName) {
        container.innerHTML = volunteers.map(vol => `
            <div class="volunteer-option">
                <input type="checkbox" id="${roleName}-${vol._id}" value="${vol._id}" name="voluntarios-${roleName}">
                <label for="${roleName}-${vol._id}">${vol.nome} ${vol.sobrenome}</label>
            </div>
        `).join('');
    }
    
    function populateStandardCheckboxes(volunteers) {
        volunteersListDiv.innerHTML = '';
        volunteers.forEach(vol => {
            const div = document.createElement('div');
            div.className = 'volunteer-option';
            div.innerHTML = `
                <input type="checkbox" id="padrao-${vol._id}" value="${vol._id}" name="voluntarios-padrao">
                <label for="padrao-${vol._id}">${vol.nome} ${vol.sobrenome}</label>
            `;
            volunteersListDiv.appendChild(div);
        });
    }
    // ---------------------------------------------

    dateInput.addEventListener('change', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) {
            fetchAvailableVolunteers(selectedDate);
        } else {
            dynamicVolunteersSelection.innerHTML = '<p class="info-message">Selecione uma data para ver os voluntários.</p>';
        }
    });
    
    // --- FUNÇÃO DE SUBMISSÃO MELHORADA ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        let selectedVolunteers = [];
        let escalaData = {};
        
        const data = document.getElementById('escala-data').value;
        
        // 1. Lógica de Validação e Coleta de Dados
        if (ministerioNome === 'Comunicação' && escalaModalidade.value === 'culto-domingo') {
            const comunicadorAvisos = comunicadorAvisosSelect.value;
            const comunicadorOfertas = comunicadorOfertasSelect.value;

            if (!comunicadorAvisos || !comunicadorOfertas) {
                alert("Por favor, selecione um voluntário para Avisos e outro para Ofertas.");
                return;
            }
            
            // Armazena com o papel/função específico
            selectedVolunteers.push({ _id: comunicadorAvisos, role: 'Avisos' });
            selectedVolunteers.push({ _id: comunicadorOfertas, role: 'Ofertas' });
            
            escalaData = {
                ministerioId,
                data,
                turno: 'Noite', // Padrão para Culto de Domingo
                modalidade: 'Culto de Domingo - Comunicação', // Novo campo para o back-end
                voluntarios: selectedVolunteers.map(v => v._id) // O back-end ainda espera um array simples de IDs
                // Seria ideal enviar o array completo, mas manteremos o padrão por enquanto:
                // voluntarios_roles: selectedVolunteers 
            };
            
        } else if (ministerioNome === 'Mídias') {
            const telaoVolunteers = Array.from(voluntariosTelaoDiv.querySelectorAll('input:checked')).map(input => input.value);
            const storiesVolunteers = Array.from(voluntariosStoriesDiv.querySelectorAll('input:checked')).map(input => input.value);
            
            if (telaoVolunteers.length === 0) {
                alert("É necessário selecionar pelo menos um voluntário para o Telão.");
                return;
            }
            
            selectedVolunteers = telaoVolunteers.concat(storiesVolunteers);
            
            if (selectedVolunteers.length === 0) {
                alert("Por favor, selecione pelo menos um voluntário.");
                return;
            }

            escalaData = {
                ministerioId,
                data,
                turno: escalaTurno.value,
                modalidade: 'Padrão - Mídias',
                voluntarios: selectedVolunteers
            };
            
        } else {
            // Lógica Padrão para todos os outros ministérios e Comunicação/Mídias - Padrão
            selectedVolunteers = Array.from(volunteersListDiv.querySelectorAll('input:checked')).map(input => input.value);
            
            if (selectedVolunteers.length === 0) {
                alert("Por favor, selecione pelo menos um voluntário.");
                return;
            }
            
            if (!escalaTurno.value) {
                alert("Por favor, selecione um turno.");
                return;
            }

            escalaData = {
                ministerioId,
                data,
                turno: escalaTurno.value,
                modalidade: 'Padrão',
                voluntarios: selectedVolunteers
            };
        }
        
        // 2. Envio para a API
        try {
            submitButton.disabled = true;
            submitButton.textContent = "Salvando...";
            const response = await fetch(`${API_URL}/api/escalas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(escalaData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao salvar a escala.');
            }
            alert('Escala criada com sucesso!');
            window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`; // Volta para a tela de gerenciamento
        } catch (error) {
            console.error("Erro ao criar escala:", error);
            alert(error.message);
            submitButton.disabled = false;
            submitButton.textContent = "Salvar Escala";
        }
    });

    loadMinistryInfo();
});