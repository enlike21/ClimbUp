import '../support/commands';

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
        cy.visit('/route/user_routes');
        cy.contains('Explorar Rutas de Escalada').should('be.visible');
    });

    it('Acceder a la página de creación de rutas (debe requerir login)', () => {
        cy.visit('/route/new');
        cy.url().should('include', '/login');
    });

    it('Registrar un nuevo usuario y acceder directamente', () => {
        let userEmail = `testuser${Date.now()}@gmail.com`;
        let userPassword = 'password123';

        // Visitar la página de registro
        cy.visit('/register');
        cy.get('input[name="registration_form[email]"]').type(userEmail);
        cy.get('input[name="registration_form[plainPassword][first]"]').type(userPassword);
        cy.get('input[name="registration_form[plainPassword][second]"]').type(userPassword);
        cy.get('input[name="registration_form[name]"]').type('Nuevo Usuario');
        cy.get('button').contains('Crear cuenta').click();

        // Asegurar que redirige a la página de login
        cy.url().should('include', '/login');
        cy.contains('Bienvenido de nuevo').should('be.visible');

        // Ahora inicia sesión con el usuario recién registrado
        cy.get('input[name="_username"]').type(userEmail);
        cy.get('input[name="_password"]').type(userPassword);
        cy.get('button').contains('Iniciar Sesión').click();

        cy.url().should('not.include', '/login');
        cy.contains('Cerrar sesión').should('be.visible');
    });
});
