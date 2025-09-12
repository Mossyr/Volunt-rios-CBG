// disponibilidade.js
document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearHeader = document.getElementById('month-year-header');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');

    const API_URL = 'https://back-end-volunt-rios.onrender.com';
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = '../login/login.html';
        return;
    }

    let currentDate = new Date();
    currentDate.setDate(1); // Garante que estamos sempre no início do mês
    let unavailableDates = new Set();

    async function fetchUnavailableDates() {
        try {
            const response = await fetch(`${API_URL}/disponibilidade/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar indisponibilidades.');
            const dates = await response.json();
            unavailableDates = new Set(dates);
        } catch (error) {
            console.error(error);
        }
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        
        monthYearHeader.textContent = new Date(year, month).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            
            const date = new Date(year, month, day);
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            dayEl.dataset.date = dateString;

            if (date < today) {
                dayEl.classList.add('past-day');
            }
            if (date.getTime() === today.getTime()) {
                dayEl.classList.add('today');
            }
            if (unavailableDates.has(dateString)) {
                dayEl.classList.add('unavailable');
            }

            calendarGrid.appendChild(dayEl);
        }
    }

    async function toggleAvailability(dateString, dayEl) {
        try {
            dayEl.style.pointerEvents = 'none'; // Previne cliques duplos
            const response = await fetch(`${API_URL}/disponibilidade/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ data: dateString })
            });
            const result = await response.json();

            if (result.status === 'indisponivel') {
                unavailableDates.add(dateString);
                dayEl.classList.add('unavailable');
            } else {
                unavailableDates.delete(dateString);
                dayEl.classList.remove('unavailable');
            }
        } catch (error) {
            console.error('Erro ao salvar disponibilidade:', error);
            alert('Não foi possível salvar a alteração.');
        } finally {
            dayEl.style.pointerEvents = 'auto';
        }
    }

    calendarGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.calendar-day');
        if (dayEl && !dayEl.classList.contains('past-day') && dayEl.dataset.date) {
            toggleAvailability(dayEl.dataset.date, dayEl);
        }
    });

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    async function init() {
        await fetchUnavailableDates();
        renderCalendar();
    }

    init();
});