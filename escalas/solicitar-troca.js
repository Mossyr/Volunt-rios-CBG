// solicitar-troca.js
document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const mainLoader = document.getElementById('main-loader');
    
    // Passos
    const step1 = document.getElementById('step-1-choose-schedule');
    const step2 = document.getElementById('step-2-choose-volunteer');
    const feedbackCard = document.getElementById('feedback-message');
    
    // Indicadores do Stepper
    const indicator1 = document.getElementById('indicator-1');
    const indicator2 = document.getElementById('indicator-2');
    
    // Listas
    const mySchedulesList = document.getElementById('my-schedules-list');
    const availableVolunteersList = document.getElementById('available-volunteers-list');
    
    const backBtn = document.getElementById('back-to-step-1');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    let selectedScheduleId = null;

    // --- FUNÇÕES UI (Toast & Modal) ---
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

    function showConfirmModal(title, text, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🤝</div>
                <h3 style="margin:0 0 8px 0; font-size:1.2rem; color:#1f2937;">${title}</h3>
                <p style="margin:0; color:#6b7280; font-size:0.9rem;">${text}</p>
                <div class="modal-actions">
                    <button class="btn-modal btn-cancel">Cancelar</button>
                    <button class="btn-modal btn-confirm">Solicitar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        overlay.querySelector('.btn-cancel').onclick = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.querySelector('.btn-confirm').onclick = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
            onConfirm();
        };
    }

    function goToStep(stepNumber) {
        if (stepNumber === 1) {
            step1.classList.remove('hidden');
            step2.classList.add('hidden');
            feedbackCard.classList.add('hidden');
            indicator1.classList.add('active');
            indicator2.classList.remove('active');
        } else if (stepNumber === 2) {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            indicator1.classList.remove('active'); // Opcional: manter o 1 ativo também? Normalmente sim, mas aqui destaca o atual
            indicator2.classList.add('active');
        }
    }

    function showFeedback(title, message, isSuccess = true) {
        step1.classList.add('hidden');
        step2.classList.add('hidden');
        feedbackCard.classList.remove('hidden');
        
        // Remove indicadores
        document.querySelector('.stepper-container').style.display = 'none';

        document.getElementById('feedback-title').textContent = title;
        document.getElementById('feedback-text').textContent = message;
        
        const iconBox = document.querySelector('.feedback-icon-box');
        const icon = document.getElementById('feedback-icon');
        
        if (!isSuccess) {
            iconBox.style.background = '#fee2e2';
            iconBox.style.color = '#ef4444';
            icon.className = 'ph ph-x';
        }
    }

    // --- CARREGAMENTO DE DADOS ---
    async function loadMySchedules() {
        if (!token) { window.location.href = '../login/login.html'; return; }
        
        try {
            const response = await fetch(`${API_URL}/api/escalas/me/todas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const schedules = await response.json();
            
            mainLoader.style.display = 'none';
            
            if (schedules.length === 0) {
                mySchedulesList.innerHTML = `
                    <div style="text-align:center; padding: 40px; color: #6b7280;">
                        <i class="ph ph-calendar-x" style="font-size: 3rem; margin-bottom: 10px; color: #cbd5e1;"></i>
                        <p>Você não tem escalas futuras agendadas.</p>
                    </div>`;
                return;
            }

            mySchedulesList.innerHTML = '';
            
            // Pega o ID da URL se existir (redirecionamento do calendário)
            const urlParams = new URLSearchParams(window.location.search);
            const preSelectedId = urlParams.get('escalaId');

            schedules.forEach(schedule => {
                const dataObj = new Date(schedule.data);
                const dia = dataObj.getUTCDate();
                const mes = dataObj.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.','');
                
                const item = document.createElement('div');
                item.className = 'schedule-card';
                item.dataset.id = schedule._id;

                item.innerHTML = `
                    <div class="date-box">
                        <span class="date-day">${dia}</span>
                        <span class="date-month">${mes}</span>
                    </div>
                    <div class="info-box">
                        <span class="ministry-label">${schedule.ministerio.nome}</span>
                        <div class="turno-label">
                            <i class="ph ph-clock"></i> ${schedule.turno}
                        </div>
                    </div>
                    <i class="ph ph-caret-right arrow-icon"></i>
                `;
                
                // Se veio da URL, clica automaticamente
                if(preSelectedId && schedule._id === preSelectedId) {
                    setTimeout(() => item.click(), 100);
                }

                mySchedulesList.appendChild(item);
            });
            
        } catch (error) {
            console.error(error);
            showToast('Erro ao carregar escalas.');
        }
    }

    async function loadAvailableVolunteers(scheduleId) {
        // Mostra loader suave ou apenas muda de passo com loading interno
        goToStep(2);
        availableVolunteersList.innerHTML = '<div style="text-align:center; padding:20px;"><i class="ph ph-spinner-gap ph-spin" style="font-size:1.5rem; color:var(--primary);"></i></div>';
        
        try {
            const response = await fetch(`${API_URL}/api/escalas/${scheduleId}/voluntarios-para-troca`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const volunteers = await response.json();
            
            availableVolunteersList.innerHTML = '';
            
            if (volunteers.length === 0) {
                availableVolunteersList.innerHTML = `
                    <div style="text-align:center; padding: 30px; color: #94a3b8;">
                        <i class="ph ph-users-three" style="font-size: 2.5rem; margin-bottom: 10px; color: #cbd5e1;"></i>
                        <p>Ninguém disponível para troca nesta data.</p>
                    </div>`;
            } else {
                volunteers.forEach(vol => {
                    const item = document.createElement('div');
                    item.className = 'volunteer-item';
                    item.dataset.id = vol._id;
                    item.dataset.name = `${vol.nome} ${vol.sobrenome || ''}`;
                    
                    const initial = vol.nome.charAt(0).toUpperCase();

                    item.innerHTML = `
                        <div class="avatar-initial">${initial}</div>
                        <div class="volunteer-info">
                            <span class="v-name">${vol.nome} ${vol.sobrenome || ''}</span>
                            <span class="v-action">Toque para solicitar</span>
                        </div>
                        <i class="ph ph-paper-plane-right" style="color: #cbd5e1;"></i>
                    `;
                    availableVolunteersList.appendChild(item);
                });
            }
        } catch (error) {
            console.error(error);
            showToast('Erro ao buscar voluntários.');
            goToStep(1);
        }
    }

    // --- EVENTOS ---

    // Passo 1: Selecionar Escala
    mySchedulesList.addEventListener('click', (e) => {
        const card = e.target.closest('.schedule-card');
        if (card) {
            selectedScheduleId = card.dataset.id;
            loadAvailableVolunteers(selectedScheduleId);
        }
    });

    // Passo 2: Selecionar Voluntário
    availableVolunteersList.addEventListener('click', (e) => {
        const card = e.target.closest('.volunteer-item');
        if (card && selectedScheduleId) {
            const destId = card.dataset.id;
            const destName = card.dataset.name;

            showConfirmModal(
                'Confirmar Solicitação',
                `Deseja pedir troca com <strong>${destName}</strong>?`,
                async () => {
                    // Lógica de envio
                    try {
                        // Mostra feedback de loading se quiser, ou vai direto pro feedback
                        const response = await fetch(`${API_URL}/api/escalas/trocas/solicitar`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                turnoId: selectedScheduleId,
                                destinatarioId: destId
                            })
                        });
                        
                        if (!response.ok) throw new Error('Erro na API');
                        
                        showFeedback('Tudo certo! 🎉', 'Sua solicitação foi enviada. Avisaremos quando houver resposta.');
                        
                    } catch (error) {
                        console.error(error);
                        showToast('Erro ao enviar solicitação.', 'error');
                    }
                }
            );
        }
    });

    backBtn.addEventListener('click', () => {
        goToStep(1);
        selectedScheduleId = null;
    });

    // Início
    loadMySchedules();
});