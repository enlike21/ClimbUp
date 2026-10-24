// End-to-end smoke test for the Al Filo minigame (/juego): start screen, a real jump driven
// by the keyboard, pause/resume and the sound toggle. window.__alFilo is a read-only state
// hook exposed by public/js/game/main.js for this suite.
describe('ClimbUP - Al Filo (minijuego)', () => {
    const key = (win, type, code) => win.dispatchEvent(new win.KeyboardEvent(type, { code, bubbles: true }));

    beforeEach(() => {
        cy.clearLocalStorage();
        cy.visit('/juego');
        cy.window().its('__alFilo.state').should('eq', 'idle');
    });

    it('Muestra la pantalla de inicio con los dos modos', () => {
        cy.get('#gameStartOverlay').should('be.visible');
        cy.get('#gameStartBtn').should('contain', 'Escalada libre');
        cy.get('#gameDailyBtn').should('contain', 'Reto diario');
        cy.get('#gameRoute li').should('have.length', 8);
    });

    it('Empieza una partida y el escalador salta', () => {
        cy.get('#gameStartBtn').click();
        cy.window().its('__alFilo.state').should('eq', 'playing');
        cy.get('#gameStartOverlay').should('not.be.visible');
        cy.get('#gameTutorial').should('be.visible');

        cy.window().then((win) => key(win, 'keydown', 'Space'));
        cy.wait(400);
        cy.window().then((win) => key(win, 'keyup', 'Space'));
        // The simulation keeps ticking and the run is recorded from the first jump.
        cy.window().its('__alFilo.tick').should('be.gt', 60);
        cy.window().its('__alFilo.height').should('be.gte', 0);
    });

    it('Pausa con Esc y continúa', () => {
        cy.get('#gameStartBtn').click();
        cy.window().its('__alFilo.state').should('eq', 'playing');
        cy.window().then((win) => key(win, 'keydown', 'Escape'));
        cy.get('#gamePauseOverlay').should('be.visible');
        cy.window().its('__alFilo.state').should('eq', 'paused');

        cy.window().then((win) => {
            const tick = win.__alFilo.tick;
            cy.wait(500);
            cy.window().its('__alFilo.tick').should('eq', tick); // time stands still
        });

        cy.get('#gameResumeBtn').click();
        cy.get('#gamePauseOverlay').should('not.be.visible');
        cy.window().its('__alFilo.state').should('eq', 'playing');
    });

    it('Silencia y reactiva el sonido con M', () => {
        cy.get('#gameSoundBtn').should('have.attr', 'aria-pressed', 'false');
        cy.window().then((win) => key(win, 'keydown', 'KeyM'));
        cy.get('#gameSoundBtn').should('have.attr', 'aria-pressed', 'true');
        cy.window().then((win) => key(win, 'keydown', 'KeyM'));
        cy.get('#gameSoundBtn').should('have.attr', 'aria-pressed', 'false');
    });
});
