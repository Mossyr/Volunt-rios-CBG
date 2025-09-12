document.addEventListener('DOMContentLoaded', () => {
    const ministryListDiv = document.querySelector('.ministry-list');
    const continueBtn = document.getElementById('continue-btn');
    const API_URL = 'https://back-end-volunt-rios.onrender.com'; // URL base da sua API

    // Função para buscar e exibir os ministérios
    async function fetchAndDisplayMinisterios() {
        try {
            const response = await fetch(`${API_URL}/ministerios`);
            if (!response.ok) {
                throw new Error('Erro ao buscar ministérios.');
            }
            const ministerios = await response.json();

            // Limpa a lista antes de adicionar os novos itens
            ministryListDiv.innerHTML = '';

            // Cria o HTML para cada ministério
            ministerios.forEach(ministerio => {
                const ministryOption = `
                    <div class="ministry-option">
                        <input type="checkbox" id="${ministerio._id}" name="ministerio" value="${ministerio._id}">
                        <label for="${ministerio._id}">
                            <span class="ministry-name">${ministerio.nome}</span>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                `;
                ministryListDiv.innerHTML += ministryOption;
            });
            
            // Adiciona os event listeners para os novos checkboxes
            addCheckboxListeners();

        } catch (error) {
            console.error('Erro:', error);
            ministryListDiv.innerHTML = '<p>Não foi possível carregar os ministérios. Tente novamente.</p>';
        }
    }

    // Função para habilitar o botão de continuar
    function checkSelection() {
        const checkboxes = document.querySelectorAll('input[name="ministerio"]');
        const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
        continueBtn.disabled = !anyChecked;
    }

    function addCheckboxListeners() {
        const checkboxes = document.querySelectorAll('input[name="ministerio"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', checkSelection);
        });
    }

    // Função para finalizar o cadastro
    async function finalizeRegistration() {
        // 1. Pega os dados do usuário salvos na etapa anterior
        const registrationData = JSON.parse(sessionStorage.getItem('registrationData'));
        if (!registrationData) {
            alert('Ocorreu um erro. Por favor, inicie o cadastro novamente.');
            window.location.href = '../cadastro/cadastro.html';
            return;
        }

        // 2. Pega os IDs dos ministérios selecionados
        const checkboxes = document.querySelectorAll('input[name="ministerio"]:checked');
        const ministeriosSelecionados = Array.from(checkboxes).map(cb => cb.value);

        // 3. Junta todos os dados
        const finalData = {
            ...registrationData,
            ministeriosSelecionados
        };

        // 4. Envia para o backend
        try {
            continueBtn.disabled = true;
            continueBtn.textContent = 'Enviando...';

            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalData),
            });

            const result = await response.json();

            if (!response.ok) {
                // Se o backend retornar um erro (ex: celular já existe), mostra a mensagem
                throw new Error(result.msg || 'Ocorreu um erro no servidor.');
            }

            // 5. Sucesso!
            alert('Cadastro realizado com sucesso! Você será redirecionado para a tela de login.');
            sessionStorage.removeItem('registrationData'); // Limpa os dados temporários
            window.location.href = '../login/login.html';

        } catch (error) {
            console.error('Erro no cadastro:', error);
            alert(`Erro: ${error.message}`);
            continueBtn.disabled = false;
            continueBtn.textContent = 'Seguir em frente';
        }
    }

    continueBtn.addEventListener('click', finalizeRegistration);

    // Inicia o processo buscando os ministérios
    fetchAndDisplayMinisterios();
});