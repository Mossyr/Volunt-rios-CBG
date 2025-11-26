document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const API_URL = 'http://localhost:5000'; // URL base da sua API

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // MUDANÇA AQUI: de 'login-celular' para 'login-nome'
        const nome = document.getElementById('login-nome').value;
        const senha = document.getElementById('login-password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Entrando...';

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // MUDANÇA AQUI: enviando 'nome' em vez de 'celular'
                body: JSON.stringify({ nome, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Ocorreu um erro no servidor.');
            }

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.userData));

            window.location.href = '../home/home.html';

        } catch (error) {
            console.error('Erro de login:', error);
            alert(`Erro: ${error.message}`);
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});