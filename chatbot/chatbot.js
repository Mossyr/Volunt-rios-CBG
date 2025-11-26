// chatbot/chatbot.js
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatMessages = document.getElementById('chat-messages');
    const API_URL = 'https://back-end-volunt-rios.onrender.com';

    if (!chatContainer || !chatMessages) return;

    // --- FUNÇÕES DE RENDERIZAÇÃO ---

    function createMessageElement(text, sender) {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', `${sender}-message`);
        
        const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        
        // Adiciona ícone se for bot (opcional, mas fica bonito)
        if (sender === 'bot' && text) {
             // Opcional: Inserir ícone dentro da bolha ou manter clean
        }

        messageEl.innerHTML = `<p>${formattedText}</p>`;
        return messageEl;
    }

    function createTypingIndicatorElement() {
        const messageEl = document.createElement('div');
        messageEl.classList.add('chat-message', 'bot-message');
        messageEl.style.width = 'fit-content';
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
            // Copia todos os dados do objeto para o dataset
            Object.keys(opt).forEach(key => {
                if (key !== 'text') btn.dataset[key] = opt[key];
            });
            container.appendChild(btn);
        });
        
        if (replyText) {
            const messageWrapper = createMessageElement(replyText, 'bot');
            messageWrapper.appendChild(container);
            return messageWrapper;
        }
        
        // Se não tiver texto, envelopa num container invisível para manter layout
        const wrapper = document.createElement('div');
        wrapper.style.paddingLeft = '5px'; // Ligeiro indent
        wrapper.appendChild(container);
        return wrapper;
    }
    
    function createDatePickerElement(action, context) {
        const container = document.createElement('div');
        container.className = 'date-picker-container';
        
        // Título do Widget
        const title = document.createElement('div');
        title.innerHTML = '<strong><i class="ph ph-calendar-plus"></i> Selecione a Data</strong>';
        title.style.fontSize = '0.9rem'; title.style.color = 'var(--text-muted)';
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'chat-date-input';
        dateInput.min = new Date().toISOString().split("T")[0]; // Bloqueia passado
        
        const confirmBtn = document.createElement('button');
        confirmBtn.innerHTML = 'Confirmar <i class="ph ph-check"></i>';
        confirmBtn.className = 'chat-option-btn confirm-volunteers-btn'; // Reusa estilo
        
        container.appendChild(title);
        container.appendChild(dateInput);
        container.appendChild(confirmBtn);
        
        confirmBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const selectedDate = dateInput.value;
            if (!selectedDate) return; // Não faz nada se vazio
            
            // Remove o widget após uso
            container.closest('.chat-message')?.remove();
            
            let userMessage, requestBody;
            if (action === 'SET_UNAVAILABLE') {
                userMessage = `Indisponível dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
                requestBody = { action: 'SET_UNAVAILABLE', data: selectedDate };
            } else { 
                userMessage = `Data: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`;
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
            container.innerHTML += `
                <label class="volunteer-option">
                    <input type="checkbox" value="${vol._id}">
                    <span>${vol.nome} ${vol.sobrenome || ''}</span>
                </label>`;
        });

        const confirmBtn = document.createElement('button');
        confirmBtn.innerHTML = `Confirmar Seleção <i class="ph ph-check-circle"></i>`;
        confirmBtn.className = 'chat-option-btn confirm-volunteers-btn';
        container.appendChild(confirmBtn);

        confirmBtn.addEventListener('click', () => {
            const selected = container.querySelectorAll('input:checked');
            if (selected.length === 0) return; // Validação silenciosa ou visual
            
            const selectedIds = Array.from(selected).map(cb => cb.value);
            container.closest('.chat-message')?.remove();
            
            renderMessage(`Selecionei ${selectedIds.length} voluntários.`, 'user');
            callBotApi({ action: 'CRIAR_ESCALA_CONFIRMAR', ...context, voluntarios: selectedIds });
        });

        const messageWrapper = createMessageElement(replyText, 'bot');
        messageWrapper.appendChild(container);
        return messageWrapper;
    }

    // --- LÓGICA DO CHAT ---

    function scrollToBottom() {
        // Scroll suave para o final
        setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
    }

    function renderElement(element) {
        chatMessages.appendChild(element);
        scrollToBottom();
    }

    function renderMessage(text, sender) {
        renderElement(createMessageElement(text, sender));
    }
    
    function getInitialOptions() {
        const options = [
            { text: 'Minha próxima escala', action: 'PROXIMA_ESCALA' },
            { text: 'Escalas do mês', action: 'ESCALAS_MES' },
            { text: 'Solicitar troca', action: 'SOLICITAR_TROCA' },
            { text: 'Marcar indisponibilidade', action: 'PROMPT_UNAVAILABLE_DATE' }
        ];
        
        try {
            const userData = JSON.parse(localStorage.getItem('userData'));
            const isLeader = userData?.ministerios?.some(m => m.funcao === 'Líder' && m.status === 'Aprovado');
            if (isLeader) {
                options.push({ text: '✨ Criar Nova Escala', action: 'CRIAR_ESCALA_INICIAR' });
            }
        } catch (e) {}
        
        return options;
    }

    function repromptWithOptions(isInitial = false) {
        const options = getInitialOptions();
        const optionsEl = createOptionsElement(options, isInitial ? null : 'Posso ajudar com algo mais?');
        // Pequeno delay para parecer natural
        setTimeout(() => renderElement(optionsEl), isInitial ? 0 : 600);
    }

    // --- HANDLERS ---
    const responseHandlers = {
        'message': data => { 
            renderMessage(data.reply, 'bot'); 
            repromptWithOptions(); 
        },
        'options': data => renderElement(createOptionsElement(data.options, data.reply)),
        'volunteer_list': data => {
            const volunteerOptions = data.volunteers.map(v => ({ 
                text: `${v.nome} ${v.sobrenome || ''}`, 
                action: 'CONFIRMAR_TROCA', 
                turnoId: data.turnoId, 
                voluntarioId: v._id 
            }));
            renderElement(createOptionsElement(volunteerOptions, data.reply));
        },
        'date_picker_creation': data => renderElement(createDatePickerElement('CRIAR_ESCALA_PEDIR_TURNO', data.context)),
        'volunteer_checklist': data => renderElement(createVolunteerChecklist(data.reply, data.volunteers, data.context)),
        'default': () => { 
            renderMessage('Não entendi, mas tente uma das opções abaixo:', 'bot'); 
            repromptWithOptions(); 
        }
    };

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

            if (!response.ok) throw new Error('API Error');
            const data = await response.json();
            
            // Simula "pensando" rapidinho
            setTimeout(() => {
                loadingMessage.remove();
                (responseHandlers[data.type] || responseHandlers['default'])(data);
            }, 600);

        } catch (error) {
            console.error('Erro:', error);
            loadingMessage.remove();
            renderMessage('Ops! Erro de conexão. Tente novamente.', 'bot');
            repromptWithOptions();
        }
    }

    // Clique Global (Delegation)
    chatMessages.addEventListener('click', (event) => {
        const button = event.target.closest('.chat-option-btn');
        // Ignora cliques dentro de widgets especiais (date/checklist) que têm seus próprios listeners
        if (!button || button.closest('.date-picker-container') || button.closest('.volunteer-checklist')) return;

        event.stopPropagation();
        
        // Remove os botões clicados para limpar a tela
        const parentOptions = button.closest('.chat-options');
        if (parentOptions) {
             // Opcional: Remover ou Desabilitar botões após clique para evitar duplo envio
             parentOptions.remove();
        }

        if (button.dataset.action === 'PROMPT_UNAVAILABLE_DATE') {
            const datePickerEl = createDatePickerElement('SET_UNAVAILABLE');
            renderElement(createMessageElement('Selecione a data que você não pode ir:', 'bot'));
            renderElement(datePickerEl);
            return;
        }
        
        renderMessage(button.textContent, 'user');
        callBotApi({ ...button.dataset });
    });

    // Início
    function initializeChat() {
        if (chatMessages.children.length === 0) {
            setTimeout(() => {
                renderMessage('Olá! Sou seu assistente virtual. 🤖', 'bot');
                repromptWithOptions(true);
            }, 500);
        }
    }
    
    initializeChat();
});