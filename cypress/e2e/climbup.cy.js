describe('ClimbUP - Tests de Integración', () => {
    beforeEach(() => {
        cy.visit('/login');
    });

    it('Carga correctamente la página de inicio de sesión', () => {
        cy.contains('Bienvenido de nuevo').should('be.visible');
    });

    it('Inicio de sesión', () => {
        cy.get('input[name="_username"]').type('admin@gmail.com');
        cy.get('input[name="_password"]').type('admin123');
        cy.get('button').contains('Iniciar Sesión').click();
        cy.url().should('not.include', '/login');
    });

    it('Ver rutas de escalada', () => {
        cy.visit('/routes/user');
        cy.contains('Explorar Rutas de Escalada').should('be.visible');
    });

    it('Acceder a la página de creación de rutas (debe requerir login)', () => {
        cy.visit('/route/new');
        cy.url().should('include', '/login');
    });
});
