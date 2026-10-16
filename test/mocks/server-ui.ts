/**
 * Minimal stand-in for `@minecraft/server-ui`.
 *
 * Forms are chainable no-ops and `show()` resolves to a cancelled response, which is
 * enough for modules that merely reference the form classes at import time.
 */

class MockFormData {
    title(): this {
        return this;
    }
    body(): this {
        return this;
    }
    button(): this {
        return this;
    }
    button1(): this {
        return this;
    }
    button2(): this {
        return this;
    }
    textField(): this {
        return this;
    }
    toggle(): this {
        return this;
    }
    slider(): this {
        return this;
    }
    dropdown(): this {
        return this;
    }
    show(): Promise<{ canceled: boolean }> {
        return Promise.resolve({ canceled: true });
    }
}

export class ActionFormData extends MockFormData {}
export class MessageFormData extends MockFormData {}
export class ModalFormData extends MockFormData {}
