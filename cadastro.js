document.addEventListener('DOMContentLoaded', () => {
    // --- INÍCIO DA LÓGICA DA MÁSCARA ---

    // 1. Pega o elemento do input de celular
    const phoneInput = document.getElementById('register-celular');

    // 2. Define as opções da máscara para o padrão brasileiro
    const maskOptions = {
        mask: '+{55} (00) 00000-0000'
    };
    
    // 3. Aplica a máscara ao input
    const phoneMask = IMask(phoneInput, maskOptions);

    // --- FIM DA LÓGICA DA MÁSCARA ---

    const registerForm = document.getElementById('register-form');
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Coleta os dados do formulário
        const userData = {
            nome: document.getElementById('register-nome').value,
            sobrenome: document.getElementById('register-sobrenome').value,
            // Pega apenas os números, sem a formatação da máscara
            celular: phoneMask.unmaskedValue,
            senha: document.getElementById('register-password').value,
        };

        // Verifica se o celular tem o DDI + DDD + 9 dígitos (13 caracteres no total)
        if (userData.celular.length < 13) {
            alert('Por favor, insira um número de celular válido com DDD.');
            return; // Interrompe o envio do formulário
        }

        // Salva os dados no sessionStorage para usar na próxima tela
        sessionStorage.setItem('registrationData', JSON.stringify(userData));

        // Redireciona para a tela de seleção de ministérios
        window.location.href = '../cadastroministerios/ministerios.html';
    });
});