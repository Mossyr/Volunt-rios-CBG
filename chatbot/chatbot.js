// chatbot/chatbot.js
document.addEventListener('DOMContentLoaded', () => {
    // Seletores atualizados
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    
    // IMPORTANTE: Mude para a URL do seu backend em produção
    const API_URL = 'http://localhost:5000';

    if (!chatContainer || !chatMessages) {
        console.error("Elementos essenciais do chat não foram encontrados.");
        return;
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO (CRIAÇÃO DE HTML) ---

    function createMessageElement(text, sender) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', `${sender}-message`);
        const formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        messageEl.innerHTML = `<p>${formattedText}</p>`;
        return messageEl;
    }

    // Função para criar o indicador de "digitando..."
    function createTypingIndicatorElement() {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', 'bot-message');
        messageEl.innerHTML = `
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        `;
        return messageEl;
    }

    function createOptionsElement(options) {
        const container = document.createElement('div');
        container.className = 'chat-options';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt.text;
            Object.keys(opt).forEach(key => {
                if (key !== 'text') {
                    btn.dataset[key] = opt[key];
                }
            });
            container.appendChild(btn);
        });
        return container;
    }
    
    function createDatePickerElement() {
        // ... (Esta função continua exatamente igual à anterior)
        const container = document.createElement('div');
        container.className = 'date-picker-container';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'chat-date-input';
        dateInput.min = new Date().toISOString().split("T")[0];

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar'; // Texto mais curto
        confirmBtn.className = 'chat-option-btn';
        
        container.appendChild(dateInput);
        container.appendChild(confirmBtn);
        
        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedDate = dateInput.value;
            if (!selectedDate) {
                alert('Por favor, selecione uma data.');
                return;
            }
            const userMessage = `Quero marcar ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} como indisponível`;
            const requestBody = { action: 'SET_UNAVAILABLE', data: selectedDate };
            
            container.parentElement.remove(); // Remove o container da mensagem inteira
            renderMessage(userMessage, 'user');
            callBotApi(requestBody);
        });

        // Retornamos um elemento de mensagem completo
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('chat-message', 'bot-message');
        messageWrapper.appendChild(container);
        return messageWrapper;
    }

    // --- FUNÇÕES DE LÓGICA DO CHAT ---
    
    // Função para rolar para a mensagem mais recente
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function renderElement(element) {
        chatMessages.appendChild(element); // Usa appendChild para ordem normal
        scrollToBottom();
    }

    function renderMessage(text, sender) {
        const messageEl = createMessageElement(text, sender);
        renderElement(messageEl);
    }
    
    function renderOptions(options) {
        const optionsEl = createOptionsElement(options);
        // Os botões não são uma "mensagem", então os adicionamos diretamente
        chatMessages.appendChild(optionsEl);
        scrollToBottom();
    }

    function renderDatePicker() {
        renderMessage('Claro! Por favor, selecione a data abaixo:', 'bot');
        const datePickerEl = createDatePickerElement();
        // A função createDatePickerElement já cria uma bolha de mensagem
        chatMessages.appendChild(datePickerEl);
        scrollToBottom();
    }
    
    // ... a função getInitialOptions() continua exatamente a mesma ...
    function getInitialOptions() {
        const options = [
            { text: 'Qual a minha próxima escala?', action: 'PROXIMA_ESCALA' },
            { text: 'Quando estou escalado nesse mês?', action: 'ESCALAS_MES' },
            { text: 'Quero solicitar uma troca', action: 'SOLICITAR_TROCA' },
            { text: 'Marcar indisponibilidade', action: 'PROMPT_UNAVAILABLE_DATE' }
        ];

        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const isLeader = userData?.ministerios?.some(m => m.funcao === 'Líder' && m.status === 'Aprovado');
            if (isLeader) {
                options.push({ text: 'Criar uma nova escala', action: 'CRIAR_ESCALA_INICIAR' });
            }
        } catch (error) {
            console.error("Não foi possível verificar as permissões de liderança:", error);
        }
        return options;
    }

    // ... a função repromptWithOptions() continua a mesma ...
    function repromptWithOptions(isInitial = false) {
        const options = getInitialOptions();
        
        if (isInitial) {
             renderOptions(options);
        } else {
            setTimeout(() => {
                renderMessage('Posso ajudar com mais alguma coisa?', 'bot');
                renderOptions(options);
            }, 800);
        }
    }


    // --- HANDLERS DE RESPOSTA DA API ---
    // ... O objeto responseHandlers continua exatamente o mesmo ...
    const responseHandlers = {
        'message': (data) => {
            renderMessage(data.reply, 'bot');
            repromptWithOptions();
        },
        'volunteer_list': (data) => {
            renderMessage(data.reply, 'bot');
            const volunteerOptions = data.volunteers.map(vol => ({
                text: `${vol.nome} ${vol.sobrenome}`,
                action: 'CONFIRMAR_TROCA',
                turnoId: data.turnoId,
                voluntarioId: vol._id
            }));
            renderOptions(volunteerOptions);
        },
        'ministry_list_for_creation': (data) => {
            renderMessage(data.reply, 'bot');
            const ministryOptions = data.ministries.map(min => ({
                text: min.name,
                action: 'REDIRECT_TO_CREATE_SCALE',
                url: `../criar-escalas/criar-escala.html?ministerioId=${min.id}`
            }));
            renderOptions(ministryOptions);
        },
        'default': (data) => {
            console.warn('Tipo de resposta não reconhecido:', data.type);
            renderMessage('Recebi uma resposta que não entendi. 😬 Tente novamente.', 'bot');
            repromptWithOptions();
        }
    };


    // --- FUNÇÃO PRINCIPAL DA API E EVENT LISTENER ---

    async function callBotApi(requestBody) {
        const loadingMessage = createTypingIndicatorElement();
        renderElement(loadingMessage);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/api/chatbot/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error(`Falha na resposta da API: ${response.statusText}`);
            
            const data = await response.json();
            
            // Espera um pouco antes de remover o "digitando" para parecer mais natural
            setTimeout(() => {
                loadingMessage.remove();
                const handler = responseHandlers[data.type] || responseHandlers['default'];
                handler(data);
            }, 500);


        } catch (error) {
            console.error('Erro ao processar ação:', error);
            loadingMessage.remove();
            renderMessage('Ops! Tive um problema para me conectar. Tente novamente mais tarde.', 'bot');
            repromptWithOptions();
        }
    }

    // Agora o listener é no container das mensagens
    chatMessages.addEventListener('click', async (event) => {
        const button = event.target.closest('.chat-option-btn');
        if (!button) return;

        // Impede que o evento se propague para outros listeners (como o do date picker)
        event.stopPropagation();

        const action = button.dataset.action;
        const parentContainer = button.closest('.chat-options');

        parentContainer?.remove();

        if (action === 'REDIRECT_TO_CREATE_SCALE') {
            window.location.href = button.dataset.url;
            return;
        }
        if (action === 'PROMPT_UNAVAILABLE_DATE') {
            renderDatePicker();
            return;
        }
        
        const userMessage = button.textContent;
        const requestBody = { ...button.dataset };
        
        renderMessage(userMessage, 'user');
        callBotApi(requestBody);
    });

    // --- INICIALIZAÇÃO ---

    function initializeChat() {
        if (chatMessages.children.length === 0) {
            setTimeout(() => {
                renderMessage('Olá! 👋 Como posso te ajudar hoje?', 'bot');
                repromptWithOptions(true);
            }, 500);
        }
    }
    
    // Mantive a lógica de `column-reverse` no CSS e ajustei o JS para usar `appendChild`,
    // o que na prática mantém as novas mensagens aparecendo no final (embaixo).
    // Para fazer isso funcionar com a rolagem correta, removi o `flex-direction: column-reverse`
    // do `.chat-messages` e adicionei o `scrollToBottom()`.
    // Vamos ajustar o CSS para refletir isso para a melhor experiência.
    
    // **Ajuste final para a lógica de rolagem**
    // No CSS, em `.chat-main`, troque `flex-direction: column-reverse` por `flex-direction: column`.
    // E em `.chat-messages`, remova o `flex-direction: column-reverse`.
    // Com isso, o JS com `appendChild` e `scrollToBottom` funcionará perfeitamente.
    
    initializeChat();
});