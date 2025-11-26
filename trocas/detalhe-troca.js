// detalhe-troca.js

document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    let currentTrocaId = null; 

    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    const swapDetailsCard = document.getElementById('swap-details-card');

    const swapIdEl = document.getElementById('swap-id');
    const swapStatusEl = document.getElementById('swap-status');
    const ministryNameEl = document.getElementById('ministry-name');
    const scheduleDateEl = document.getElementById('schedule-date');
    const scheduleShiftEl = document.getElementById('schedule-shift');
    const requesterNameEl = document.getElementById('requester-name');
    const recipientNameEl = document.getElementById('recipient-name');

    const btnAcceptSwap = document.getElementById('btn-accept-swap');
    const btnRejectSwap = document.getElementById('btn-reject-swap');
    const actionMessage = document.getElementById('action-message');

    // Inicialmente, esconde o card de detalhes, só mostraremos se houver dados.
    swapDetailsCard.style.display = 'none';

    if (!token || !userData) {
        window.location.href = '../login/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const trocaId = urlParams.get('trocaId');

    if (!trocaId) {
        errorMessage.textContent = 'ID da troca não fornecido na URL.';
        errorMessage.style.display = 'block';
        return;
    }

    currentTrocaId = trocaId;

    async function fetchSwapDetails() {
        loadingSpinner.style.display = 'block';
        swapDetailsCard.style.display = 'none';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/api/trocas/${trocaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Solicitação de troca não encontrada.');
                }
                const errorData = await response.json();
                throw new Error(errorData.msg || 'Erro ao buscar detalhes da troca.');
            }

            const troca = await response.json();
            renderSwapDetails(troca);

        } catch (error) {
            console.error('Erro ao buscar detalhes da troca:', error);
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderSwapDetails(troca) {
        const displayId = troca._id ? troca._id.slice(-6).toUpperCase() : 'N/A';

        swapIdEl.textContent = displayId;
        swapStatusEl.textContent = troca.status;
        swapStatusEl.className = `status-tag status-${troca.status.toLowerCase()}`;

        ministryNameEl.textContent = troca.turno.ministerio.nome;
        scheduleDateEl.textContent = new Date(troca.turno.data).toLocaleDateString('pt-BR');
        scheduleShiftEl.textContent = troca.turno.turno;
        requesterNameEl.textContent = `${troca.solicitante.nome} ${troca.solicitante.sobrenome}`;
        recipientNameEl.textContent = `${troca.destinatario.nome} ${troca.destinatario.sobrenome}`;

        const isRecipient = userData._id === troca.destinatario._id;
        const isPending = troca.status === 'pendente'; // Use 'pendente' em minúsculo, conforme seu model

        if (isRecipient && isPending) {
            btnAcceptSwap.style.display = 'inline-block';
            btnRejectSwap.style.display = 'inline-block';
            actionMessage.style.display = 'none';
        } else {
            btnAcceptSwap.style.display = 'none';
            btnRejectSwap.style.display = 'none';
            if (!isPending) {
                actionMessage.textContent = `Esta solicitação já foi ${troca.status}.`;
                actionMessage.className = `action-message ${troca.status === 'aceita' ? 'success' : 'error'}`;
                actionMessage.style.display = 'block';
            } else {
                actionMessage.textContent = 'Aguardando resposta do destinatário.';
                actionMessage.className = 'action-message'; 
                actionMessage.style.display = 'block';
            }
        }
        swapDetailsCard.style.display = 'block';
    }

    async function sendSwapResponse(action) { 
        loadingSpinner.style.display = 'block';
        btnAcceptSwap.disabled = true;
        btnRejectSwap.disabled = true;
        actionMessage.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}/api/trocas/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ trocaId: currentTrocaId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || `Falha ao ${action} a troca.`);
            }

            const result = await response.json();
            actionMessage.textContent = result.msg;
            actionMessage.className = 'action-message success';
            actionMessage.style.display = 'block';
            
            await fetchSwapDetails();

        } catch (error) {
            console.error(`Erro ao ${action} a troca:`, error);
            actionMessage.textContent = error.message;
            actionMessage.className = 'action-message error';
            actionMessage.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
            btnAcceptSwap.disabled = false;
            btnRejectSwap.disabled = false;
        }
    }

    btnAcceptSwap.addEventListener('click', () => sendSwapResponse('aceitar'));
    btnRejectSwap.addEventListener('click', () => sendSwapResponse('recusar'));

    fetchSwapDetails();
});