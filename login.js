document.addEventListener('DOMContentLoaded', () => {
    
    // --- NOVO: Verifica se já existe um token válido ---
    // Se o usuário entrar na página de login mas já estiver logado,
    // redireciona automaticamente para a Home.
    const token = localStorage.getItem('authToken');
    if (token) {
        window.location.href = '../home/home.html';
        return; // Para a execução do script aqui
    }
    // ---------------------------------------------------

    const loginForm = document.getElementById('login-form');
    const API_URL = 'https://back-end-volunt-rios.onrender.com'; // URL base da sua API

    if (!loginForm) return; // Segurança caso o script rode em outra página sem querer

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = document.getElementById('login-nome').value;
        const senha = document.getElementById('login-password').value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        try {
            // Feedback visual de carregamento
            submitButton.disabled = true;
            submitButton.textContent = 'Entrando...';

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ nome, senha }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || 'Ocorreu um erro no servidor.');
            }

            // Salva o token e os dados do usuário
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.userData));

            // Redireciona para a home
            window.location.href = '../home/home.html';

        } catch (error) {
            console.error('Erro de login:', error);
            alert(`Erro: ${error.message}`);
            
            // Restaura o botão em caso de erro
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
});