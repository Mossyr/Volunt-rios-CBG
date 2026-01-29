document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('edit-escala-form');
    const loader = document.getElementById('main-loader');
    
    // Campos
    const ministerioNomeEl = document.getElementById('ministerio-nome');
    const dataEventoEl = document.getElementById('data-evento');
    const modalidadeDisplayEl = document.getElementById('modalidade-display');
    
    // UI Padrão
    const defaultSection = document.getElementById('default-volunteers-section');
    const atuaisListEl = document.getElementById('voluntarios-atuais-list');
    const disponiveisListEl = document.getElementById('voluntarios-disponiveis-list');
    const atuaisCountEl = document.getElementById('atuais-count');
    const disponiveisCountEl = document.getElementById('disponiveis-count');
    
    // UI Comunicação
    const comunicacaoSection = document.getElementById('comunicacao-edit-section');
    const comunicadorAvisosSelect = document.getElementById('comunicador-avisos-edit');
    const comunicadorOfertasSelect = document.getElementById('comunicador-ofertas-edit');
    
    // UI Mídias
    const midiasSection = document.getElementById('midias-edit-section');
    const voluntariosTelaoDiv = document.getElementById('voluntarios-telao-edit');
    const voluntariosStoriesDiv = document.getElementById('voluntarios-stories-edit');

    const btnDeletar = document.getElementById('btn-deletar-escala');
    
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');
    const urlParams = new URLSearchParams(window.location.search);
    const escalaId = urlParams.get('id');

    if (!escalaId) {
        showToast('Erro: ID da escala não encontrado.', 'error');
        return;
    }

    let todosVoluntariosDoMinisterio = [];
    let escalaAtual = null;
    let voluntariosNaEscala = new Set(); 

    // --- FUNÇÕES DE UI (Toast) ---
    function showToast(message, type = 'error') {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        const icon = type === 'success' ? '<i class="ph ph-check-circle"></i>' : '<i class="ph ph-warning-circle"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    function resetSpecializedUI() {
        defaultSection.style.display = 'none';
        comunicacaoSection.style.display = 'none';
        midiasSection.style.display = 'none';
    }

    // --- RENDERIZAÇÃO ---
    function renderSpecializedUI(escala, todosVoluntarios) {
        resetSpecializedUI();

        const ministerioNome = escala.ministerio.nome; 
        
        // 1. Comunicação
        if (escala.modalidade && escala.modalidade.includes('Comunicação')) {
            comunicacaoSection.style.display = 'block';
            
            const defaultOption = '<option value="" disabled selected>Selecione...</option>';
            comunicadorAvisosSelect.innerHTML = defaultOption;
            comunicadorOfertasSelect.innerHTML = defaultOption;

            todosVoluntarios.forEach(vol => {
                const option = `<option value="${vol._id}">${vol.nome} ${vol.sobrenome || ''}</option>`;
                comunicadorAvisosSelect.innerHTML += option;
                comunicadorOfertasSelect.innerHTML += option;
            });

            // Encontra quem tem a role específica (comparando Strings para segurança)
            const avisoVol = escala.voluntarios.find(v => v.role === 'Avisos');
            const ofertaVol = escala.voluntarios.find(v => v.role === 'Ofertas');

            if (avisoVol) comunicadorAvisosSelect.value = String(avisoVol._id || avisoVol);
            if (ofertaVol) comunicadorOfertasSelect.value = String(ofertaVol._id || ofertaVol);

        } 
        // 2. Mídias
        else if ((escala.modalidade && escala.modalidade.includes('Mídias')) || ministerioNome === 'Mídias') {
            midiasSection.style.display = 'block';
            // Passamos a Role específica para filtrar corretamente
            populateMidiasCheckboxes(todosVoluntarios, voluntariosTelaoDiv, escala.voluntarios, 'Telão');
            populateMidiasCheckboxes(todosVoluntarios, voluntariosStoriesDiv, escala.voluntarios, 'Stories');
            
        } 
        // 3. Padrão
        else {
            defaultSection.style.display = 'grid';
            renderDefaultUI(escala, todosVoluntarios);
        }
    }
    
    // --- CORREÇÃO CRÍTICA AQUI: COMPARAÇÃO DE IDs E ROLES ---
    function populateMidiasCheckboxes(allVolunteers, container, currentScaleVolunteers, targetRole) {
        container.innerHTML = allVolunteers.map(vol => {
            
            // Verifica se esse voluntário está na lista COM A FUNÇÃO CERTA
            const isChecked = currentScaleVolunteers.some(v => {
                // Converte tudo para String para evitar erro de ObjectId vs String
                const idNaEscala = String(v._id || v); 
                const idDaLista = String(vol._id);
                
                const idMatch = (idNaEscala === idDaLista);
                const roleMatch = (v.role === targetRole);
                
                return idMatch && roleMatch;
            });

            const roleName = container.id.includes('telao') ? 'telao' : 'stories';
            
            return `
                <div class="volunteer-option">
                    <input type="checkbox" id="${roleName}-${vol._id}" value="${vol._id}" ${isChecked ? 'checked' : ''}>
                    <label for="${roleName}-${vol._id}">
                        <span class="v-name">${vol.nome} ${vol.sobrenome || ''}</span>
                        <i class="ph ph-check-circle v-check-icon"></i>
                    </label>
                </div>
            `;
        }).join('');
    }
    
    function renderDefaultUI(escala, todosVoluntarios) {
        atuaisListEl.innerHTML = '';
        disponiveisListEl.innerHTML = '';
        voluntariosNaEscala.clear(); 
        
        // Cria um Set de IDs (Strings) para busca rápida
        const escalaIDs = new Set(escala.voluntarios.map(v => String(v._id || v)));

        todosVoluntarios.forEach(vol => {
            const volIdString = String(vol._id);
            const isNaEscala = escalaIDs.has(volIdString);
            
            const listEl = isNaEscala ? atuaisListEl : disponiveisListEl;
            const action = isNaEscala ? 'remove' : 'add';
            const icon = isNaEscala ? '<i class="ph ph-minus"></i>' : '<i class="ph ph-plus"></i>';

            if (isNaEscala) {
                voluntariosNaEscala.add(volIdString);
            }

            const listItem = document.createElement('li');
            listItem.className = 'volunteer-item';
            listItem.innerHTML = `
                <span class="volunteer-name">${vol.nome} ${vol.sobrenome || ''}</span>
                <button type="button" class="btn-toggle-volunteer ${action}" data-id="${vol._id}" data-action="${action}">
                    ${icon}
                </button>
            `;
            listEl.appendChild(listItem);
        });

        atuaisCountEl.textContent = voluntariosNaEscala.size;
        disponiveisCountEl.textContent = todosVoluntarios.length - voluntariosNaEscala.size;
    }

    // --- CARREGAMENTO ---
    async function carregarDados() {
        loader.style.display = 'flex'; 
        form.style.display = 'none'; 
        
        try {
            const escalaResponse = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!escalaResponse.ok) throw new Error('Falha ao carregar escala.');
            escalaAtual = await escalaResponse.json();

            // ✅ CORREÇÃO AQUI: ADICIONA O TURNO NA QUERY
            const dataISO = new Date(escalaAtual.data).toISOString().split('T')[0];
            const turnoQuery = escalaAtual.turno || 'Manhã'; // Fallback caso não tenha turno
            
            const volResponse = await fetch(
                `${API_URL}/api/lider/voluntarios/${escalaAtual.ministerio._id}?data=${dataISO}&turno=${turnoQuery}`, 
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!volResponse.ok) throw new Error('Falha ao carregar voluntários.');
            todosVoluntariosDoMinisterio = await volResponse.json();
            
            // Preenche Info Card
            ministerioNomeEl.textContent = escalaAtual.ministerio.nome;
            const dataObj = new Date(escalaAtual.data);
            dataEventoEl.textContent = `${dataObj.getUTCDate()}/${dataObj.getUTCMonth()+1}/${dataObj.getUTCFullYear()} · ${escalaAtual.turno || 'Geral'}`;
            modalidadeDisplayEl.textContent = escalaAtual.modalidade || 'Padrão';

            renderSpecializedUI(escalaAtual, todosVoluntariosDoMinisterio);
            
            loader.style.display = 'none';
            form.style.display = 'flex';

        } catch (error) {
            console.error(error);
            showToast(error.message, 'error');
        }
    }
    
    // --- EVENTOS ---
    defaultSection.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-toggle-volunteer');
        if (btn) {
            const id = btn.getAttribute('data-id');
            const action = btn.getAttribute('data-action');

            if (action === 'add') {
                // Adiciona ao objeto local
                escalaAtual.voluntarios.push({ _id: id, role: 'Voluntário' });
            } else {
                // Remove do objeto local
                escalaAtual.voluntarios = escalaAtual.voluntarios.filter(v => String(v._id || v) !== id);
            }
            // Re-renderiza a tela com os dados atualizados
            renderDefaultUI(escalaAtual, todosVoluntariosDoMinisterio);
        }
    });

    btnDeletar.addEventListener('click', async () => {
        if (!confirm('ATENÇÃO: Deseja excluir esta escala permanentemente?')) return;

        btnDeletar.disabled = true;
        btnDeletar.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Deletando...';

        try {
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Erro ao excluir.');

            showToast('Escala excluída.', 'success');
            setTimeout(() => window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${escalaAtual.ministerio._id}`, 1000);

        } catch (error) {
            showToast('Erro ao excluir.', 'error');
            btnDeletar.disabled = false;
            btnDeletar.innerHTML = '<i class="ph ph-trash"></i> Deletar esta escala';
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Salvando...';
        
        let newVolunteers = [];
        let dataToSend = {};

        try {
            // COMUNICAÇÃO
            if (escalaAtual.modalidade && escalaAtual.modalidade.includes('Comunicação')) {
                const avisosId = comunicadorAvisosSelect.value;
                const ofertasId = comunicadorOfertasSelect.value;
                
                if (!avisosId || !ofertasId) throw new Error("Selecione todos os voluntários.");
                
                newVolunteers = [
                    { _id: avisosId, role: 'Avisos' },
                    { _id: ofertasId, role: 'Ofertas' }
                ];
                dataToSend = { voluntarios: newVolunteers };
                
            } 
            // MÍDIAS
            else if ((escalaAtual.modalidade && escalaAtual.modalidade.includes('Mídias')) || escalaAtual.ministerio.nome === 'Mídias') {
                const telaoIds = Array.from(voluntariosTelaoDiv.querySelectorAll('input:checked')).map(i => i.value);
                const storiesIds = Array.from(voluntariosStoriesDiv.querySelectorAll('input:checked')).map(i => i.value);
                
                if (telaoIds.length === 0) throw new Error("Selecione alguém para o Telão.");
                
                // Mapeia IDs para Objetos com Role
                const telaoObjs = telaoIds.map(id => ({ _id: id, role: 'Telão' }));
                const storiesObjs = storiesIds.map(id => ({ _id: id, role: 'Stories' }));
                
                newVolunteers = [...telaoObjs, ...storiesObjs];
                dataToSend = { voluntarios: newVolunteers };
                
            } 
            // PADRÃO
            else {
                newVolunteers = Array.from(voluntariosNaEscala).map(id => ({ _id: id, role: 'Voluntário' }));
                if (newVolunteers.length === 0) throw new Error("A escala não pode ficar vazia.");
                dataToSend = { voluntarios: newVolunteers };
            }
            
            const response = await fetch(`${API_URL}/api/escalas/turno/${escalaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) throw new Error('Falha ao salvar.');
            
            submitButton.innerHTML = '<i class="ph ph-check"></i> Salvo!';
            submitButton.style.background = '#10b981';
            
            setTimeout(() => window.location.href = `../gerenciar-ministerio/gerenciar-ministerio.html?ministerioId=${escalaAtual.ministerio._id}`, 1000);

        } catch (error) {
            showToast(error.message, 'error');
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="ph ph-floppy-disk"></i> Salvar Alterações';
            submitButton.style.background = '';
        }
    });

    carregarDados();
});