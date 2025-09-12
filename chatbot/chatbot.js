document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';

    if (!chatMessages) {
        return;
    }

    function initializeChat() {
        if (chatMessages.children.length === 0) {
            displayInitialOptions();
        }
    }

    function addMessage(text, sender) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', `${sender}-message`);
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        messageEl.innerHTML = `<p>${formattedText}</p>`;
        chatMessages.insertBefore(messageEl, chatMessages.firstChild);
    }

    function displayInitialOptions() {
        chatMessages.innerHTML = '';
        addMessage('Olá! 👋 Como posso te ajudar hoje?', 'bot');
        repromptWithOptions(true);
    }
    
    function repromptWithOptions(isInitial = false) {
        const options = [
            { text: 'Qual a minha próxima escala?', action: 'PROXIMA_ESCALA' },
            { text: 'Quando estou escalado nesse mês?', action: 'ESCALAS_MES' },
            { text: 'Quero solicitar uma troca', action: 'SOLICITAR_TROCA' },
            { text: 'Marcar indisponibilidade', action: 'PROMPT_UNAVAILABLE_DATE' }
        ];

        // --- INÍCIO DA ALTERAÇÃO 1: VERIFICAR SE O USUÁRIO É LÍDER ---
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            if (userData && userData.ministerios) {
                const isLeader = userData.ministerios.some(m => m.funcao === 'Líder' && m.status === 'Aprovado');
                if (isLeader) {
                    // Adiciona a opção de criar escala no final da lista
                    options.push({ text: 'Criar uma nova escala', action: 'CRIAR_ESCALA_INICIAR' });
                }
            }
        } catch (error) {
            console.error("Não foi possível verificar as permissões de liderança:", error);
        }
        // --- FIM DA ALTERAÇÃO 1 ---

        if (isInitial) {
             createOptionButtons(options);
        } else {
            setTimeout(() => {
                addMessage('Posso ajudar com mais alguma coisa?', 'bot');
                createOptionButtons(options);
            }, 800);
        }
    }

    function createOptionButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'chat-options';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt.text;
            Object.keys(opt).forEach(key => {
                if (key !== 'text') {
                    btn.dataset[key] = opt[key];
                }
            });
            optionsContainer.appendChild(btn);
        });
        chatMessages.insertBefore(optionsContainer, chatMessages.firstChild);
    }

    chatMessages.addEventListener('click', async (event) => {
        const button = event.target.closest('.chat-option-btn');
        if (!button) return;

        const action = button.dataset.action;
        const parentContainer = button.closest('.chat-options') || button.closest('.date-picker-container');

        // --- INÍCIO DA ALTERAÇÃO 2: AÇÃO DE REDIRECIONAMENTO ---
        // Esta é uma ação que acontece apenas no frontend, sem chamar a API
        if (action === 'REDIRECT_TO_CREATE_SCALE') {
            const url = button.dataset.url;
            if (url) {
                window.location.href = url;
            }
            return;
        }
        // --- FIM DA ALTERAÇÃO 2 ---

        if (action === 'PROMPT_UNAVAILABLE_DATE') {
            parentContainer.remove();

            const datePickerContainer = document.createElement('div');
            datePickerContainer.className = 'date-picker-container';

            const dateInput = document.createElement('input');
            dateInput.type = 'date';
            dateInput.className = 'chat-date-input';
            dateInput.min = new Date().toISOString().split("T")[0];

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirmar Data';
            confirmBtn.className = 'chat-option-btn';
            
            datePickerContainer.appendChild(dateInput);
            datePickerContainer.appendChild(confirmBtn);
            
            addMessage('Claro! Por favor, selecione a data abaixo:', 'bot');
            chatMessages.insertBefore(datePickerContainer, chatMessages.firstChild);

            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const selectedDate = dateInput.value;
                if (!selectedDate) {
                    alert('Por favor, selecione uma data.');
                    return;
                }
                const userMessage = `Quero marcar ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} como indisponível`;
                const requestBody = { action: 'SET_UNAVAILABLE', data: selectedDate };
                datePickerContainer.remove();
                addMessage(userMessage, 'user');
                callBotApi(requestBody);
            });
            return;
        }
        
        const userMessage = button.textContent;
        const requestBody = { ...button.dataset };
        parentContainer.remove();
        addMessage(userMessage, 'user');
        callBotApi(requestBody);
    });

    async function callBotApi(requestBody) {
        const loadingMessage = document.createElement('div');
        loadingMessage.classList.add('chat-message', 'bot-message');
        loadingMessage.innerHTML = `<p>Pensando... 🤖</p>`;
        chatMessages.insertBefore(loadingMessage, chatMessages.firstChild);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/chatbot/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(requestBody),
            });

            loadingMessage.remove();
            if (!response.ok) throw new Error('Falha na resposta da API');
            
            const data = await response.json();
            
            if (data.type === 'message') {
                addMessage(data.reply, 'bot');
                repromptWithOptions(); 
            } else if (data.type === 'volunteer_list') {
                addMessage(data.reply, 'bot');
                const volunteerOptions = data.volunteers.map(vol => ({
                    text: `${vol.nome} ${vol.sobrenome}`,
                    action: 'CONFIRMAR_TROCA',
                    turnoId: data.turnoId,
                    voluntarioId: vol._id
                }));
                createOptionButtons(volunteerOptions);
            // --- INÍCIO DA ALTERAÇÃO 3: LIDAR COM A RESPOSTA DE CRIAÇÃO DE ESCALA ---
            } else if (data.type === 'ministry_list_for_creation') {
                addMessage(data.reply, 'bot');
                const ministryOptions = data.ministries.map(min => ({
                    text: min.name,
                    action: 'REDIRECT_TO_CREATE_SCALE',
                    url: `../criar-escalas/criar-escala.html?ministerioId=${min.id}`
                }));
                createOptionButtons(ministryOptions);
            }
            // --- FIM DA ALTERAÇÃO 3 ---
        } catch (error) {
            console.error('Erro ao processar ação:', error);
            loadingMessage.remove();
            addMessage('Ops! Tive um problema para me conectar. Tente novamente mais tarde.', 'bot');
            repromptWithOptions();
        }
    }

    initializeChat();
});