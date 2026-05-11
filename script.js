const themeToggle = document.querySelector('.theme-toggle');
const body = document.querySelector('body');

themeToggle.addEventListener('click', () => {
    themeToggle.addEventListener('click', () => {
        if (body.getAttribute('data-theme') === 'dark') {
            body.removeAttribute('data-theme');
        } else {
            body.setAttribute('data-theme', 'dark');
        }
    });
});