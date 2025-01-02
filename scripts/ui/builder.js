import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import { server } from "../server";
class UIForm {
    constructor(form, name) {
        this.id = name;
        this.form = form;
        this.cancelAction = form.cancel;
    }
    /**
     *
     * @param { Player } player
     * @param wait
     * @param onShow
     */
    async _show(player, wait, onShow) {
        while (player.isValid() && server.ui.inQueue(player, this)) {
            const form = this._build(player);
            const buildData = this.getBuildData();
            let state = "pending"; //TODO make state an actual object
            const responsePromise = form.show(player).then((response) => {
                if (!wait || response?.cancelationReason !== "UserBusy") {
                    state = "responded";
                    server.ui.queue.delete(player);
                    server.ui.active.delete(player);
                    onShow(response, buildData);
                }
                else {
                    state = "busy";
                }
            });
            await system.waitTicks(2);
            // If there's still no response it must mean the UI has been opened
            if (state === "pending" && server.ui.inQueue(player, this)) {
                server.ui.queue.delete(player);
                server.ui.active.set(player, this);
            }
            await responsePromise;
            if (state === "responded") {
                return true;
            }
            else if (server.ui.displayingUI(player, this.id)) { // If something went wrong
                // Reset UI states
                server.ui.active.delete(player);
                server.ui.queue.set(player, this);
            }
        }
        return false;
    }
    resolve(element, player) {
        return element instanceof Function ? element(player) : element;
    }
}
class ActionUIForm extends UIForm {
    constructor() {
        super(...arguments);
        this.actions = [];
    }
    _build(player) {
        this.actions = [];
        const resolveElement = (element) => this.resolve(element, player);
        const formData = new ActionFormData();
        formData.title(resolveElement(this.form.title));
        formData.body(resolveElement(this.form.body) ?? "");
        if (this.form.back) {
            formData.button("§l<-- %back.button.text", "textures/icons/back.png");
            this.actions.push((player) => server.ui.show(this.form.back, player));
        }
        for (const button of resolveElement(this.form.buttons)) {
            const text = button.subText ? `${button.text}\n§r§8[ §b§o${button.subText}§r§8 ]` : button.text;
            formData.button(text, button.icon);
            this.actions.push(button.action);
        }
        return formData;
    }
    /**
     *
     * @param { Player } player
     * @param { Boolean } wait
     * @return {Promise<void>}
     */
    enter(player, wait) {
        return this._show(player, wait, (response, actions) => {
            if (response.canceled)
                return this.cancelAction?.(player);
            actions[response.selection]?.(player);
        });
    }
    getBuildData() {
        return this.actions;
    }
}
class ModalUIForm extends UIForm {
    constructor(form, name) {
        super(form, name);
        this.inputNames = [];
        this.submitAction = form.submit;
    }
    _build(player) {
        this.inputNames = [];
        const resolveElement = (element) => this.resolve(element, player);
        const formData = new ModalFormData();
        formData.title(resolveElement(this.form.title));
        const formInputs = resolveElement(this.form.inputs);
        for (const inputId in formInputs) {
            const input = formInputs[inputId];
            switch (input.type) {
                case "textField":
                    formData.textField(resolveElement(input.name), resolveElement(input.placeholder), resolveElement(input.default));
                    break;
                case "toggle":
                    formData.toggle(resolveElement(input.name), resolveElement(input.default));
                    break;
                case "slider":
                    formData.slider(resolveElement(input.name), resolveElement(input.minimum), resolveElement(input.maximum), resolveElement(input.step), resolveElement(input.default));
                    break;
                case "dropdown":
                    formData.dropdown(resolveElement(input.name), resolveElement(input.options), resolveElement(input.default));
                    break;
                default:
                    continue;
            }
            this.inputNames.push(inputId);
        }
        if (this.form.submitText)
            formData.submitButton(resolveElement(this.form.submitText));
        return formData;
    }
    enter(player, wait) {
        return this._show(player, wait, (response, inputNames) => {
            if (response.canceled)
                return this.cancelAction?.(player);
            const inputs = {};
            for (const i in response.formValues) {
                inputs[inputNames[i]] = response.formValues[i];
            }
            this.submitAction?.(inputs, player);
        });
    }
    getBuildData() {
        return this.inputNames;
    }
}
class MessageUIForm extends UIForm {
    constructor() {
        super(...arguments);
        this.actions = [];
    }
    _build(player) {
        this.actions = [];
        const resolveElement = (element) => this.resolve(element, player);
        const formData = new MessageFormData()
            .title(resolveElement(this.form.title))
            .body(resolveElement(this.form.body) ?? "")
            .button2(resolveElement(this.form.button1.text))
            .button1(resolveElement(this.form.button2.text));
        this.actions.push(this.form.button1.action);
        this.actions.push(this.form.button2.action);
        return formData;
    }
    enter(player, wait) {
        return this._show(player, wait, (response, actions) => {
            if (response.canceled)
                return this.cancelAction?.(player);
            actions[0 - response.selection]?.(player);
        });
    }
    getBuildData() {
        return this.actions;
    }
}
export class UIManager {
    constructor() {
        this.forms = new Map();
        this.queue = new Map();
        this.active = new Map();
    }
    register(name, form) {
        if (this.forms.has(name)) {
            throw `Error, the ui ${name} has already been registered.`;
        }
        if ("buttons" in form) {
            this.forms.set(name, new ActionUIForm(form, name));
        }
        else if ("inputs" in form) {
            this.forms.set(name, new ModalUIForm(form, name));
        }
        else if ("button1" in form) {
            this.forms.set(name, new MessageUIForm(form, name));
        }
    }
    /**
     * Show the specified ui to a player.
     * @param { String } ui The name of the UI.
     * @param { Player } player The player that the UI will be shown to.
     * @param { Boolean } wait
     */
    show(ui, player, wait = false) {
        if (this.displayingUI(player))
            return false;
        const form = this.forms.get(ui);
        if (!form) {
            return false;
        }
        else {
            this.queue.delete(player);
            this.queue.set(player, form);
            form.enter(player, wait);
            return true;
        }
    }
    displayingUI(player, ui = undefined) {
        if (!this.active.has(player))
            return false;
        if (ui && this.forms.has(ui)) {
            return this.active.get(player)?.id === ui;
        }
        else {
            return this.active.has(player);
        }
    }
    /**
     *
     * @param { Player } player
     * @param form
     */
    inQueue(player, form) {
        if (!this.queue.has(player))
            return false;
        return this.queue.get(player) === form;
    }
}
