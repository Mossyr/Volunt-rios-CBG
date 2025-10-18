// chatbot/chatbot.js
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';

    if (!chatContainer || !chatMessages) return;

    // --- FUNÇÕES DE RENDERIZAÇÃO (CRIAR HTML) ---

    function createMessageElement(text, sender) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', `${sender}-message`);
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        messageEl.innerHTML = `<p>${formattedText}</p>`;
        return messageEl;
    }

    function createTypingIndicatorElement() {
        const messageEl = createMessageElement('', 'bot');
        messageEl.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        return messageEl;
    }

    function createOptionsElement(options, replyText) {
        const container = document.createElement('div');
        container.className = 'chat-options';
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt.text;
            Object.keys(opt).forEach(key => {
                if (key !== 'text') btn.dataset[key] = opt[key];
            });
            container.appendChild(btn);
        });
        
        // Se houver um texto de resposta, cria uma bolha de mensagem para os botões
        if (replyText) {
            const messageWrapper = createMessageElement(replyText, 'bot');
            messageWrapper.appendChild(container);
            return messageWrapper;
        }
        return container; // Retorna só os botões se não houver texto
    }
    
    function createDatePickerElement(action, context) {
        const container = document.createElement('div');
        container.className = 'date-picker-container';
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'chat-date-input';
        dateInput.min = new Date().toISOString().split("T")[0];
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar';
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
            container.closest('.chat-message')?.remove();
            
            let userMessage, requestBody;
            if (action === 'SET_UNAVAILABLE') {
                userMessage = `Marcar ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} como indisponível`;
                requestBody = { action: 'SET_UNAVAILABLE', data: selectedDate };
            } else { // Ação de criação de escala
                userMessage = `Data selecionada: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                requestBody = { action: 'CRIAR_ESCALA_PEDIR_TURNO', data: selectedDate, ...context };
            }
            
            renderMessage(userMessage, 'user');
            callBotApi(requestBody);
        });

        const messageWrapper = createMessageElement('', 'bot');
        messageWrapper.appendChild(container);
        return messageWrapper;
    }

    function createVolunteerChecklist(replyText, volunteers, context) {
        const container = document.createElement('div');
        container.className = 'volunteer-checklist';
        
        volunteers.forEach(vol => {
            container.innerHTML += `<label class="volunteer-option"><input type="checkbox" value="${vol._id}"><span>${vol.nome} ${vol.sobrenome}</span></label>`;
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirmar Voluntários';
        confirmBtn.className = 'chat-option-btn confirm-volunteers-btn';
        container.appendChild(confirmBtn);

        confirmBtn.addEventListener('click', () => {
            const selected = container.querySelectorAll('input:checked');
            if (selected.length === 0) {
                alert('Selecione pelo menos um voluntário.');
                return;
            }
            const selectedIds = Array.from(selected).map(cb => cb.value);
            container.closest('.chat-message')?.remove();
            renderMessage(`Selecionei ${selectedIds.length} voluntário(s).`, 'user');
            callBotApi({ action: 'CRIAR_ESCALA_CONFIRMAR', ...context, voluntarios: selectedIds });
        });

        const messageWrapper = createMessageElement(replyText, 'bot');
        messageWrapper.appendChild(container);
        return messageWrapper;
    }

    // --- FUNÇÕES DE LÓGICA DO CHAT ---
    function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }
    function renderElement(element) { chatMessages.appendChild(element); scrollToBottom(); }
    function renderMessage(text, sender) { renderElement(createMessageElement(text, sender)); }
    
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
            if (isLeader) options.push({ text: 'Criar uma nova escala', action: 'CRIAR_ESCALA_INICIAR' });
        } catch (error) { console.error("Erro ao verificar permissões:", error); }
        return options;
    }

    function repromptWithOptions(isInitial = false) {
        const options = getInitialOptions();
        const optionsEl = createOptionsElement(options, isInitial ? null : 'Posso ajudar com mais alguma coisa?');
        setTimeout(() => renderElement(optionsEl), isInitial ? 0 : 800);
    }

    // --- HANDLERS DE RESPOSTA DA API (ATUALIZADO) ---
    const responseHandlers = {
        'message': data => { renderMessage(data.reply, 'bot'); repromptWithOptions(); },
        'options': data => renderElement(createOptionsElement(data.options, data.reply)),
        'volunteer_list': data => {
            const volunteerOptions = data.volunteers.map(v => ({ text: `${v.nome} ${v.sobrenome}`, action: 'CONFIRMAR_TROCA', turnoId: data.turnoId, voluntarioId: v._id }));
            renderElement(createOptionsElement(volunteerOptions, data.reply));
        },
        'date_picker_creation': data => renderElement(createDatePickerElement('CRIAR_ESCALA_PEDIR_TURNO', data.context)),
        'volunteer_checklist': data => renderElement(createVolunteerChecklist(data.reply, data.volunteers, data.context)),
        'default': () => { renderMessage('Recebi uma resposta que não entendi. 😬', 'bot'); repromptWithOptions(); }
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
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            setTimeout(() => {
                loadingMessage.remove();
                (responseHandlers[data.type] || responseHandlers['default'])(data);
            }, 500);
        } catch (error) {
            console.error('Erro:', error);
            loadingMessage.remove();
            renderMessage('Ops! Tive um problema para me conectar. Tente novamente mais tarde.', 'bot');
            repromptWithOptions();
        }
    }

    chatMessages.addEventListener('click', (event) => {
        const button = event.target.closest('.chat-option-btn');
        if (!button || button.closest('.date-picker-container') || button.closest('.volunteer-checklist')) return;

        event.stopPropagation();
        button.closest('.chat-message')?.remove(); // Remove o balão de mensagem que contém os botões
        button.closest('.chat-options')?.remove(); // Remove apenas os botões se não estiverem em um balão
        
        if (button.dataset.action === 'PROMPT_UNAVAILABLE_DATE') {
            const datePickerEl = createDatePickerElement('SET_UNAVAILABLE');
            renderElement(createMessageElement('Claro! Por favor, selecione a data abaixo:', 'bot'));
            renderElement(datePickerEl);
            return;
        }
        
        renderMessage(button.textContent, 'user');
        callBotApi({ ...button.dataset });
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
    
    initializeChat();
});

