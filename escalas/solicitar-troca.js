document.addEventListener('DOMContentLoaded', () => {
    const loader = document.querySelector('.loader');
    const step1 = document.getElementById('step-1-choose-schedule');
    const step2 = document.getElementById('step-2-choose-volunteer');
    const mySchedulesList = document.getElementById('my-schedules-list');
    const availableVolunteersList = document.getElementById('available-volunteers-list');
    const backBtn = document.getElementById('back-to-step-1');
    const feedbackMessageEl = document.getElementById('feedback-message');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');

    // ===================================================================
    // --- VARIÁVEL ADICIONADA ---
    let selectedScheduleId = null; // Guarda o ID da escala escolhida no passo 1
    // ===================================================================

    function showFeedback(message) {
        loader.style.display = 'none';
        step1.style.display = 'none';
        step2.style.display = 'none';
        feedbackMessageEl.textContent = message;
        feedbackMessageEl.style.display = 'block';
    }

    async function loadMySchedules() {
        if (!token) {
            window.location.href = '../login/login.html';
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/escalas/me/todas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const schedules = await response.json();
            loader.style.display = 'none';
            if (schedules.length === 0) {
                showFeedback('Você não tem nenhuma escala futura para solicitar troca. 😊');
                return;
            }
            mySchedulesList.innerHTML = '';
            schedules.forEach(schedule => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.dataset.id = schedule._id;
                const dataFormatada = new Date(schedule.data).toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
                });
                item.innerHTML = `
                    <div class="schedule-item-header">
                        <span class="schedule-item-date">${dataFormatada}</span>
                        <span class="schedule-item-ministry">${schedule.ministerio.nome}</span>
                    </div>
                    <p class="schedule-item-details">Turno: ${schedule.turno}</p>
                `;
                mySchedulesList.appendChild(item);
            });
            step1.classList.add('active');
        } catch (error) {
            console.error('Erro ao carregar minhas escalas:', error);
            showFeedback('Não foi possível carregar suas escalas. Tente novamente mais tarde.');
        }
    }

    async function loadAvailableVolunteers(scheduleId) {
        step1.classList.remove('active');
        loader.style.display = 'block';
        try {
            const response = await fetch(`${API_URL}/api/escalas/${scheduleId}/voluntarios-para-troca`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error();
            const volunteers = await response.json();
            loader.style.display = 'none';
            availableVolunteersList.innerHTML = '';
            if (volunteers.length === 0) {
                 availableVolunteersList.innerHTML = `<p class="subtitle">Nenhum voluntário encontrado para troca nesta data.</p>`;
            } else {
                volunteers.forEach(vol => {
                    const item = document.createElement('div');
                    item.className = 'list-item';
                    item.dataset.id = vol._id;
                    item.innerHTML = `
                        <div class="volunteer-item-header">
                            <span class="volunteer-item-name">${vol.nome} ${vol.sobrenome}</span>
                            <span class="volunteer-item-contact-btn">Solicitar</span>
                        </div>
                    `;
                    availableVolunteersList.appendChild(item);
                });
            }
            step2.classList.add('active');
        } catch (error) {
            console.error('Erro ao carregar voluntários para troca:', error);
            loader.style.display = 'none';
            step1.classList.add('active');
            alert('Erro ao buscar voluntários. Tente novamente.');
        }
    }

    mySchedulesList.addEventListener('click', (e) => {
        const selectedSchedule = e.target.closest('.list-item');
        if (selectedSchedule) {
            selectedScheduleId = selectedSchedule.dataset.id; // Guarda o ID da escala
            loadAvailableVolunteers(selectedScheduleId);
        }
    });

    // ===================================================================
    // --- LISTENER DE CLIQUE TOTALMENTE ATUALIZADO ---
    availableVolunteersList.addEventListener('click', async (e) => {
        const selectedVolunteer = e.target.closest('.list-item');
        if(selectedVolunteer && selectedScheduleId) {
            const destinatarioId = selectedVolunteer.dataset.id;
            const volunteerName = selectedVolunteer.querySelector('.volunteer-item-name').textContent;

            if (confirm(`Tem certeza que deseja solicitar a troca com ${volunteerName}?`)) {
                try {
                    loader.style.display = 'block';
                    step2.style.display = 'none';
                    const response = await fetch(`${API_URL}/api/escalas/trocas/solicitar`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            turnoId: selectedScheduleId,
                            destinatarioId: destinatarioId
                        })
                    });
                    if (!response.ok) throw new Error('Falha ao enviar a solicitação.');
                    showFeedback('Sua solicitação de troca foi enviada com sucesso! A outra pessoa já foi notificada. ✅');
                } catch (error) {
                    console.error('Erro na solicitação de troca:', error);
                    showFeedback('Houve um erro ao enviar sua solicitação. Tente novamente mais tarde.');
                }
            }
        }
    });
    // ===================================================================
    
    backBtn.addEventListener('click', () => {
        step2.classList.remove('active');
        step1.classList.add('active');
    });

    loadMySchedules();
});