Cypress.Commands.add('login', (email, password) => {
    cy.visit('/login');
    cy.get('input[name="_username"]').type(email);
    cy.get('input[name="_password"]').type(password);
    cy.get('button').contains('Iniciar Sesión').click();
    cy.url().should('not.include', '/login');
});
