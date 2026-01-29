document.addEventListener('DOMContentLoaded', () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    const form = document.getElementById('create-escala-form');
    const dateInput = document.getElementById('escala-data');
    const escalaTurno = document.getElementById('escala-turno');
    const escalaModalidade = document.getElementById('escala-modalidade');
    const emptyStateDiv = document.getElementById('empty-state-volunteers');
    const volunteersListDiv = document.getElementById('volunteers-list');
    const comunicacaoVolunteersDiv = document.getElementById('comunicacao-volunteers');
    const midiasVolunteersDiv = document.getElementById('midias-volunteers');
    const comunicadorAvisosSelect = document.getElementById('comunicador-avisos');
    const comunicadorOfertasSelect = document.getElementById('comunicador-ofertas');
    const voluntariosTelaoDiv = document.getElementById('voluntarios-telao');
    const voluntariosStoriesDiv = document.getElementById('voluntarios-stories');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');
    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');
    let ministerioNome = ''; 
    let todosVoluntariosDisponiveis = []; 

    if (!token || !ministerioId) { window.location.href = '../home/home.html'; return; }

    async function loadMinistryInfo() {
        const userData = JSON.parse(localStorage.getItem('userData'));
        const ministry = userData.ministerios.find(m => m.ministerio._id === ministerioId);
        if (ministry) {
            ministerioNome = ministry.ministerio.nome;
            ministryHeader.textContent = ministerioNome;
            setupMinistryUI(ministerioNome);
        }
        
        // ✅ CONFIGURAR LINK DE VOLTAR DINAMICAMENTE
        const backLink = document.getElementById('back-link');
        if (backLink && ministerioId) {
            backLink.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`;
        }
    }
    
    function setupMinistryUI(nome) {
        if (nome === 'Comunicação') {
            escalaModalidade.innerHTML = `<option value="padrao">Padrão</option><option value="culto-domingo">Culto de Domingo</option>`;
        } else if (nome === 'Mídias') {
            escalaModalidade.innerHTML = `<option value="padrao">Padrão</option>`;
        }
        escalaModalidade.addEventListener('change', () => renderDynamicVolunteersSelection(escalaModalidade.value, todosVoluntariosDisponiveis));
    }

    async function fetchAvailableVolunteers(date) {
        const turno = escalaTurno.value;
        // Se for Comunicação no Domingo, o turno é fixo (Noite), senão precisa do turno selecionado
        const queryTurno = (ministerioNome === 'Comunicação' && escalaModalidade.value === 'culto-domingo') ? 'Noite' : turno;

        if (!queryTurno) {
            emptyStateDiv.innerHTML = '<i class="ph ph-clock"></i><p>Selecione o turno para carregar os voluntários.</p>';
            return;
        }

        emptyStateDiv.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i><p>Buscando voluntários...</p>';
        emptyStateDiv.style.display = 'block';
        volunteersListDiv.style.display = 'none';

        try {
            // ENVIANDO TURNO NA QUERY
            const response = await fetch(`${API_URL}/api/lider/voluntarios/${ministerioId}?data=${date}&turno=${queryTurno}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            todosVoluntariosDisponiveis = await response.json(); 
            renderDynamicVolunteersSelection(escalaModalidade.value, todosVoluntariosDisponiveis);
        } catch (error) {
            emptyStateDiv.innerHTML = '<p>Erro ao buscar.</p>';
        }
    }

    function renderDynamicVolunteersSelection(modalidade, volunteers) {
        emptyStateDiv.style.display = 'none';
        volunteersListDiv.style.display = 'none';
        comunicacaoVolunteersDiv.style.display = 'none';
        midiasVolunteersDiv.style.display = 'none';

        if (volunteers.length === 0) {
            emptyStateDiv.innerHTML = '<i class="ph ph-mask-sad"></i><p>Ninguém disponível para este turno/data.</p>';
            emptyStateDiv.style.display = 'block';
            return;
        }

        if (ministerioNome === 'Comunicação' && modalidade === 'culto-domingo') {
            comunicacaoVolunteersDiv.style.display = 'block';
            populateSelects(volunteers);
        } else if (ministerioNome === 'Mídias') {
            midiasVolunteersDiv.style.display = 'block';
            populateCheckboxes(volunteers, voluntariosTelaoDiv, 'telao');
            populateCheckboxes(volunteers, voluntariosStoriesDiv, 'stories');
        } else {
            volunteersListDiv.style.display = 'grid';
            volunteersListDiv.innerHTML = volunteers.map(vol => generateCheckboxHTML(vol, 'padrao', 'voluntarios-padrao')).join('');
        }
    }
    
    function populateSelects(volunteers) {
        const options = volunteers.map(vol => `<option value="${vol._id}">${vol.nome} ${vol.sobrenome || ''}</option>`).join('');
        comunicadorAvisosSelect.innerHTML = '<option value="" disabled selected>Escolher...</option>' + options;
        comunicadorOfertasSelect.innerHTML = '<option value="" disabled selected>Escolher...</option>' + options;
    }

    function generateCheckboxHTML(vol, idPrefix, name) {
        return `
            <div class="volunteer-option">
                <input type="checkbox" id="${idPrefix}-${vol._id}" value="${vol._id}" name="${name}">
                <label for="${idPrefix}-${vol._id}">
                    <div class="v-avatar">${vol.nome.charAt(0)}</div>
                    <div class="v-info"><span class="v-name">${vol.nome} ${vol.sobrenome || ''}</span></div>
                    <i class="ph ph-check-circle v-check-icon"></i>
                </label>
            </div>`;
    }

    function populateCheckboxes(volunteers, container, roleName) {
        container.innerHTML = volunteers.map(vol => generateCheckboxHTML(vol, roleName, `voluntarios-${roleName}`)).join('');
    }

    dateInput.addEventListener('change', () => { if (dateInput.value) fetchAvailableVolunteers(dateInput.value); });
    escalaTurno.addEventListener('change', () => { if (dateInput.value) fetchAvailableVolunteers(dateInput.value); });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        let escalaData = { ministerioId, data: dateInput.value, turno: escalaTurno.value };
        
        if (ministerioNome === 'Comunicação' && escalaModalidade.value === 'culto-domingo') {
            escalaData.voluntarios = [comunicadorAvisosSelect.value, comunicadorOfertasSelect.value];
            escalaData.turno = 'Noite';
        } else if (ministerioNome === 'Mídias') {
            const telao = Array.from(voluntariosTelaoDiv.querySelectorAll('input:checked')).map(i => i.value);
            const stories = Array.from(voluntariosStoriesDiv.querySelectorAll('input:checked')).map(i => i.value);
            escalaData.voluntarios = telao.concat(stories);
        } else {
            escalaData.voluntarios = Array.from(volunteersListDiv.querySelectorAll('input:checked')).map(i => i.value);
        }

        try {
            submitButton.disabled = true;
            const response = await fetch(`${API_URL}/api/escalas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(escalaData)
            });
            if (!response.ok) throw new Error((await response.json()).msg);
            window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${ministerioId}`;
        } catch (error) { alert(error.message); submitButton.disabled = false; }
    });

    loadMinistryInfo();
});