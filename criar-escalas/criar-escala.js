document.addEventListener('DOMContentLoaded', () => {
    const ministryHeader = document.getElementById('ministry-name-header');
    const volunteersListDiv = document.getElementById('volunteers-list');
    const form = document.getElementById('create-escala-form');
    const dateInput = document.getElementById('escala-data'); // NOVO: Pega o input de data
    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    const urlParams = new URLSearchParams(window.location.search);
    const ministerioId = urlParams.get('ministerioId');

    if (!token || !ministerioId) {
        alert('Acesso inválido.');
        window.location.href = '../home/home.html';
        return;
    }

    // ALTERADO: A função inicial agora só carrega o nome do ministério
    async function loadMinistryInfo() {
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const ministry = userData.ministerios.find(m => m.ministerio._id === ministerioId);
            if (ministry) {
                ministryHeader.textContent = `Ministério: ${ministry.ministerio.nome}`;
            }
        } catch (error) {
            console.error("Erro ao carregar dados do ministério:", error);
            ministryHeader.textContent = "Ministério não encontrado";
        }
    }

    // NOVO: Função para buscar voluntários disponíveis para uma data específica
    async function fetchAvailableVolunteers(date) {
        volunteersListDiv.innerHTML = "<p>Buscando voluntários disponíveis...</p>";

        // IMPORTANTE: A URL da API foi alterada para refletir a nova funcionalidade.
        // O seu backend precisa suportar esta rota:
        const fetchUrl = `${API_URL}/api/lider/voluntarios/${ministerioId}?data=${date}`;

        try {
            const response = await fetch(fetchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Não foi possível carregar os voluntários.');
            }

            const volunteers = await response.json();
            displayVolunteers(volunteers);
        } catch (error) {
            console.error("Erro ao carregar voluntários:", error);
            volunteersListDiv.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    }

    function displayVolunteers(volunteers) {
        volunteersListDiv.innerHTML = '';
        if (volunteers.length === 0) {
            volunteersListDiv.innerHTML = "<p>Nenhum voluntário disponível para esta data.</p>";
            return;
        }
        volunteers.forEach(vol => {
            const div = document.createElement('div');
            div.className = 'volunteer-option';
            div.innerHTML = `
                <input type="checkbox" id="${vol._id}" value="${vol._id}" name="voluntarios">
                <label for="${vol._id}">${vol.nome} ${vol.sobrenome}</label>
            `;
            volunteersListDiv.appendChild(div);
        });
    }

    // NOVO: Adiciona o "escutador de eventos" para o campo de data
    dateInput.addEventListener('change', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) {
            fetchAvailableVolunteers(selectedDate);
        } else {
            // Limpa a lista se a data for removida
            volunteersListDiv.innerHTML = '<p class="info-message">Selecione uma data para ver os voluntários.</p>';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const selectedVolunteers = Array.from(volunteersListDiv.querySelectorAll('input:checked')).map(input => input.value);

        if (selectedVolunteers.length === 0) {
            alert("Por favor, selecione pelo menos um voluntário.");
            return;
        }

        const escalaData = {
            ministerioId,
            data: document.getElementById('escala-data').value,
            turno: document.getElementById('escala-turno').value,
            voluntarios: selectedVolunteers
        };

        if (!escalaData.turno) {
            alert("Por favor, selecione um turno.");
            return;
        }

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
            window.location.href = '../home/home.html';
        } catch (error) {
            console.error("Erro ao criar escala:", error);
            alert(error.message);
            submitButton.disabled = false;
            submitButton.textContent = "Salvar Escala";
        }
    });

    // Carrega apenas a informação do ministério ao iniciar a página
    loadMinistryInfo();
});