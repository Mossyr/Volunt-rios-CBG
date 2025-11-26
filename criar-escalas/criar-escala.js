document.addEventListener('DOMContentLoaded', () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    
    // Elementos de UI
    const form = document.getElementById('create-escala-form');
    const dateInput = document.getElementById('escala-data');
    const backLink = document.getElementById('back-link');
    
    // Containers
    const turnoInputGroup = document.getElementById('turno-input-group');
    const escalaTurno = document.getElementById('escala-turno');
    const modalidadeInputGroup = document.getElementById('modalidade-input-group');
    const escalaModalidade = document.getElementById('escala-modalidade');
    
    // Áreas de Seleção
    const emptyStateDiv = document.getElementById('empty-state-volunteers');
    const volunteersListDiv = document.getElementById('volunteers-list');
    const comunicacaoVolunteersDiv = document.getElementById('comunicacao-volunteers');
    const midiasVolunteersDiv = document.getElementById('midias-volunteers');
    
    // Selects Específicos
    const comunicadorAvisosSelect = document.getElementById('comunicador-avisos');
    const comunicadorOfertasSelect = document.getElementById('comunicador-ofertas');
    const voluntariosTelaoDiv = document.getElementById('voluntarios-telao');
    const voluntariosStoriesDiv = document.getElementById('voluntarios-stories');

    const API_URL = 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');
    
    let ministerioNome = ''; 
    let todosVoluntariosDisponiveis = []; 

    // Configura Botão Voltar
    if (ministerioId) {
        backLink.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`;
    } else {
        backLink.href = '../home/home.html';
    }

    if (!token || !ministerioId) {
        window.location.href = '../home/home.html';
        return;
    }

    async function loadMinistryInfo() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const ministry = userData.ministerios.find(m => m.ministerio._id === ministerioId);
            if (ministry) {
                ministerioNome = ministry.ministerio.nome;
                ministryHeader.textContent = ministerioNome;
                setupMinistryUI(ministerioNome);
            }
        } catch (error) {
            console.error(error);
            ministryHeader.textContent = "Erro ao carregar";
        }
    }
    
    function setupMinistryUI(nome) {
        // Reset visual
        volunteersListDiv.style.display = 'none';
        modalidadeInputGroup.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';

        if (nome === 'Comunicação') {
            modalidadeInputGroup.style.display = 'block';
            escalaModalidade.innerHTML = `
                <option value="padrao">Padrão</option>
                <option value="culto-domingo">Culto de Domingo</option>
            `;
            escalaModalidade.value = 'padrao'; 
            turnoInputGroup.style.display = 'block'; 

        } else if (nome === 'Mídias') {
            modalidadeInputGroup.style.display = 'block';
            escalaModalidade.innerHTML = `<option value="padrao">Padrão</option>`;
            escalaModalidade.value = 'padrao';
            midiasVolunteersDiv.style.display = 'none'; // Só mostra após carregar data
            turnoInputGroup.style.display = 'block';
        }
        
        escalaModalidade.addEventListener('change', () => {
            renderDynamicVolunteersSelection(escalaModalidade.value, todosVoluntariosDisponiveis);
        });
    }

    async function fetchAvailableVolunteers(date) {
        // Mostra estado de carregamento
        emptyStateDiv.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i><p>Buscando voluntários...</p>';
        emptyStateDiv.style.display = 'block';
        volunteersListDiv.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';

        const fetchUrl = `${API_URL}/api/lider/voluntarios/${ministerioId}?data=${date}`;
        try {
            const response = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha na busca.');
            
            todosVoluntariosDisponiveis = await response.json(); 
            
            const currentModalidade = escalaModalidade.value || 'padrao';
            renderDynamicVolunteersSelection(currentModalidade, todosVoluntariosDisponiveis);
            
        } catch (error) {
            console.error(error);
            emptyStateDiv.innerHTML = '<i class="ph ph-warning-circle" style="color:#ef4444"></i><p>Erro ao buscar voluntários.</p>';
        }
    }

    function renderDynamicVolunteersSelection(modalidade, volunteers) {
        // Esconde tudo primeiro
        emptyStateDiv.style.display = 'none';
        volunteersListDiv.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';
        turnoInputGroup.style.display = 'block';

        if (volunteers.length === 0) {
            emptyStateDiv.innerHTML = '<i class="ph ph-mask-sad"></i><p>Ninguém disponível nesta data.</p>';
            emptyStateDiv.style.display = 'block';
            return;
        }

        if (ministerioNome === 'Comunicação' && modalidade === 'culto-domingo') {
            comunicacaoVolunteersDiv.style.display = 'block';
            turnoInputGroup.style.display = 'none'; // Culto já tem horário fixo implícito
            populateSelects(volunteers);
            
        } else if (ministerioNome === 'Mídias') {
            midiasVolunteersDiv.style.display = 'block';
            populateCheckboxes(volunteers, voluntariosTelaoDiv, 'telao');
            populateCheckboxes(volunteers, voluntariosStoriesDiv, 'stories');
            
        } else {
            // Padrão
            volunteersListDiv.style.display = 'grid'; // Grid layout
            populateStandardCheckboxes(volunteers);
        }
    }
    
    function populateSelects(volunteers) {
        const defaultOption = '<option value="" disabled selected>Escolher...</option>';
        const options = volunteers.map(vol => `<option value="${vol._id}">${vol.nome} ${vol.sobrenome || ''}</option>`).join('');
        comunicadorAvisosSelect.innerHTML = defaultOption + options;
        comunicadorOfertasSelect.innerHTML = defaultOption + options;
    }

    // Gera Cards de Checkbox (Novo Estilo)
    function generateCheckboxHTML(vol, idPrefix, name) {
        const initial = vol.nome.charAt(0).toUpperCase();
        return `
            <div class="volunteer-option">
                <input type="checkbox" id="${idPrefix}-${vol._id}" value="${vol._id}" name="${name}">
                <label for="${idPrefix}-${vol._id}">
                    <div class="v-avatar">${initial}</div>
                    <div class="v-info">
                        <span class="v-name">${vol.nome} ${vol.sobrenome || ''}</span>
                    </div>
                    <i class="ph ph-check-circle v-check-icon"></i>
                </label>
            </div>
        `;
    }

    function populateCheckboxes(volunteers, container, roleName) {
        container.innerHTML = volunteers.map(vol => generateCheckboxHTML(vol, roleName, `voluntarios-${roleName}`)).join('');
    }
    
    function populateStandardCheckboxes(volunteers) {
        volunteersListDiv.innerHTML = volunteers.map(vol => generateCheckboxHTML(vol, 'padrao', 'voluntarios-padrao')).join('');
    }

    dateInput.addEventListener('change', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) fetchAvailableVolunteers(selectedDate);
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        let selectedVolunteers = [];
        let escalaData = {};
        const data = dateInput.value;
        
        // --- Validação (Mesma lógica do seu código anterior) ---
        // Adapte aqui apenas se a lógica de negócio mudar.
        // O foco foi a interface visual.
        
        if (ministerioNome === 'Comunicação' && escalaModalidade.value === 'culto-domingo') {
            const aviso = comunicadorAvisosSelect.value;
            const oferta = comunicadorOfertasSelect.value;
            if (!aviso || !oferta) { alert("Selecione voluntários para Avisos e Ofertas."); return; }
            selectedVolunteers.push({ _id: aviso, role: 'Avisos' });
            selectedVolunteers.push({ _id: oferta, role: 'Ofertas' });
            escalaData = { ministerioId, data, turno: 'Noite', modalidade: 'Culto de Domingo - Comunicação', voluntarios: selectedVolunteers.map(v=>v._id) };
        } else if (ministerioNome === 'Mídias') {
            const telao = Array.from(voluntariosTelaoDiv.querySelectorAll('input:checked')).map(i => i.value);
            const stories = Array.from(voluntariosStoriesDiv.querySelectorAll('input:checked')).map(i => i.value);
            if (telao.length === 0) { alert("Selecione alguém para o Telão."); return; }
            selectedVolunteers = telao.concat(stories);
            escalaData = { ministerioId, data, turno: escalaTurno.value, modalidade: 'Padrão - Mídias', voluntarios: selectedVolunteers };
        } else {
            selectedVolunteers = Array.from(volunteersListDiv.querySelectorAll('input:checked')).map(i => i.value);
            if (selectedVolunteers.length === 0) { alert("Selecione pelo menos um voluntário."); return; }
            if (!escalaTurno.value) { alert("Selecione um turno."); return; }
            escalaData = { ministerioId, data, turno: escalaTurno.value, modalidade: 'Padrão', voluntarios: selectedVolunteers };
        }

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Salvando...';
            
            const response = await fetch(`${API_URL}/api/escalas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(escalaData)
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.msg || 'Erro ao salvar.');
            }
            
            // Sucesso visual
            submitButton.innerHTML = '<i class="ph ph-check"></i> Sucesso!';
            submitButton.style.background = '#10b981';
            
            setTimeout(() => {
                window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`;
            }, 1000);

        } catch (error) {
            alert(error.message);
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="ph ph-check-circle"></i> Confirmar Escala';
            submitButton.style.background = '';
        }
    });

    loadMinistryInfo();
});