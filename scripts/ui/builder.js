import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { system } from "@minecraft/server";
import { server } from "../server";
import { Translations } from "../utils/translations";
//TODO add error handling
class UIForm {
    id;
    form;
    cancelAction;
    constructor(form, name) {
        this.form = form;
        this.id = name;
        this.cancelAction = this.form.cancel;
    }
    async _show(player, wait, onRespond) {
        while (player.isValid && server.ui.inQueue(player, this)) {
            const buildError = this.form.buildErrorMsg;
            let form;
            try {
                form = this._build(player);
            }
            catch (e) {
                if (typeof buildError === "string") {
                    player.sendError(buildError, [e?.name ?? "", e?.message ?? ""]);
                }
                else {
                    player.sendError(Translations.Msg.GenericBuildError);
                }
                server.ui.queue.delete(player);
                server.ui.active.delete(player);
                throw e;
            }
            const buildData = this.getBuildData();
            let state = "pending"; //TODO make state an actual object
            const responsePromise = form.show(player).then((response) => {
                if (!wait || response?.cancelationReason !== "UserBusy") {
                    state = "responded";
                    server.ui.queue.delete(player);
                    server.ui.active.delete(player);
                    onRespond(response, buildData);
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
    actions = [];
    _build(player) {
        this.actions = [];
        const resolveElement = (element) => this.resolve(element, player);
        const formData = new ActionFormData();
        formData.title(resolveElement(this.form.title));
        formData.body(resolveElement(this.form.body) ?? "");
        if (this.form.back) { //TODO add an automatic back button by saving the previous uis and adding it in a context object?
            formData.button(`§l<-- ${Translations.Ui.General.BackButton}`, "textures/icons/back.png");
            this.actions.push((player) => server.ui.show(resolveElement(this.form.back), player));
        }
        for (const element of resolveElement(this.form.elements)) {
            switch (element.type) {
                case "button":
                    const text = element.subText ? `${resolveElement(element.text)}\n§r§8[ §b§o${resolveElement(element.subText)}§r§8 ]` : resolveElement(element.text);
                    formData.button(text, element.icon);
                    this.actions.push(element.action);
                    break;
                case "header":
                    formData.header(resolveElement(element.text));
                    break;
                case "label":
                    formData.label(resolveElement(element.text));
                    break;
                case "divider":
                    formData.divider();
                    break;
                default:
                    break;
            }
        }
        // for (const button of resolveElement(this.form.buttons)) {
        //     const text = button.subText ? `${resolveElement(button.text)}\n§r§8[ §b§o${resolveElement(button.subText)}§r§8 ]` : resolveElement(button.text);
        //     formData.button(text, button.icon);
        //     this.actions.push(button.action);
        // }
        return formData;
    }
    enter(player, wait, contextData) {
        return this._show(player, wait, (response, actions) => {
            if (response.canceled)
                return this.cancelAction?.(player, contextData);
            actions[response.selection]?.(player, contextData);
        });
    }
    getBuildData() {
        return this.actions;
    }
}
class ModalUIForm extends UIForm {
    inputNames = [];
    submitAction;
    constructor(form, name) {
        super(form, name);
        this.submitAction = this.form.submit;
    }
    _build(player) {
        this.inputNames = [];
        const resolveElement = (element) => this.resolve(element, player);
        const formData = new ModalFormData();
        formData.title(resolveElement(this.form.title));
        for (const element of resolveElement(this.form.elements)) {
            switch (element.type) {
                case "textField":
                    formData.textField(resolveElement(element.name), resolveElement(element.placeholder), { defaultValue: resolveElement(element.default) });
                    this.inputNames.push(element.inputId);
                    break;
                case "toggle":
                    formData.toggle(resolveElement(element.name), { defaultValue: resolveElement(element.default) });
                    this.inputNames.push(element.inputId);
                    break;
                case "slider":
                    formData.slider(resolveElement(element.name), resolveElement(element.minimum), resolveElement(element.maximum), { defaultValue: resolveElement(element.default), valueStep: resolveElement(element.step) });
                    this.inputNames.push(element.inputId);
                    break;
                case "dropdown":
                    formData.dropdown(resolveElement(element.name), resolveElement(element.items), { defaultValueIndex: resolveElement(element.default) });
                    this.inputNames.push(element.inputId);
                    break;
                case "header":
                    formData.header(resolveElement(element.text));
                    break;
                case "label":
                    formData.label(resolveElement(element.text));
                    break;
                case "divider":
                    formData.divider();
                    break;
                default:
                    break;
            }
        }
        // const formInputs = resolveElement(this.form.inputs);
        // for (const inputId in formInputs) {
        //     const input = formInputs[inputId];
        //
        //     switch (input.type) {
        //         case "textField":
        //             formData.textField(resolveElement(input.name), resolveElement(input.placeholder), { defaultValue: resolveElement(input.default) });
        //             break;
        //         case "toggle":
        //             formData.toggle(resolveElement(input.name), { defaultValue: resolveElement(input.default) });
        //             break;
        //         case "slider":
        //             formData.slider(resolveElement(input.name), resolveElement(input.minimum), resolveElement(input.maximum), { defaultValue: resolveElement(input.default), valueStep: resolveElement(input.step) });
        //             break;
        //         case "dropdown":
        //             formData.dropdown(resolveElement(input.name), resolveElement(input.items), { defaultValueIndex: resolveElement(input.default) });
        //             break;
        //         default:
        //             continue;
        //     }
        //     this.inputNames.push(inputId);
        // }
        if (this.form.submitText)
            formData.submitButton(resolveElement(this.form.submitText));
        return formData;
    }
    enter(player, wait, contextData) {
        return this._show(player, wait, (response, inputNames) => {
            if (response.canceled)
                return this.cancelAction?.(player, contextData);
            const inputs = {};
            for (const [index, value] of response.formValues.entries()) {
                if (value === undefined)
                    continue;
                inputs[inputNames[index]] = value;
            }
            this.submitAction?.(inputs, player, contextData);
        });
    }
    getBuildData() {
        return this.inputNames;
    }
}
class MessageUIForm extends UIForm {
    actions;
    onRespond;
    constructor(form, name) {
        super(form, name);
        this.actions = [this.form.button1.action, this.form.button2.action];
        this.onRespond = this.form.onRespond;
    }
    _build(player) {
        const resolveElement = (element) => this.resolve(element, player);
        return new MessageFormData()
            .title(resolveElement(this.form.title))
            .body(resolveElement(this.form.body) ?? "")
            .button1(resolveElement(this.form.button1.text))
            .button2(resolveElement(this.form.button2.text));
    }
    enter(player, wait, contextData) {
        return this._show(player, wait, (response, actions) => {
            if (response.canceled) {
                this.cancelAction?.(player, contextData);
                return this.onRespond?.(player, contextData);
            }
            actions[response.selection](player, contextData);
            this.onRespond?.(player, contextData);
        });
    }
    getBuildData() {
        return this.actions;
    }
}
export class UIManager {
    forms = new Map();
    queue = new Map();
    active = new Map();
    register(name, form) {
        if (this.forms.has(name)) {
            throw `Error, the ui ${name} has already been registered.`;
        }
        if (form.type === "action") {
            this.forms.set(name, new ActionUIForm(form, name));
        }
        else if (form.type === "modal") {
            this.forms.set(name, new ModalUIForm(form, name));
        }
        else if (form.type === "message") {
            this.forms.set(name, new MessageUIForm(form, name));
        }
    }
    /**
     * Show the specified ui to a player.
     * @param ui The name of the UI.
     * @param player The player that the UI will be shown to.
     * @param wait
     * @param contextData
     * @returns True if the UI is found. False if the UI isn't found or the player is already in a UI.
     */
    //TODO make this work with permissions
    show(ui, player, wait = false, contextData = {}) {
        if (this.displayingUI(player))
            return false;
        const form = this.forms.get(ui);
        if (!form) {
            return false;
        }
        else {
            this.queue.delete(player);
            this.queue.set(player, form);
            form.enter(player, wait, contextData);
            return true;
        }
    }
    confirm(title, body, player, yes, onRespond, no, contextData = {}) {
        const form = new MessageUIForm({
            title,
            body,
            button1: { text: "%ui.confirm.yes", action: yes },
            button2: { text: "%ui.confirm.no", action: no ?? (() => { }) },
            onRespond: onRespond ?? (() => { }),
            cancel: no ?? (() => { })
        });
        this.queue.delete(player);
        this.queue.set(player, form);
        form.enter(player, false, contextData);
    }
    displayingUI(player, ui = undefined) {
        if (!this.active.has(player))
            return false;
        if (ui) {
            return this.active.get(player)?.id === ui;
        }
        else {
            return this.active.has(player);
        }
    }
    inQueue(player, form) {
        if (!this.queue.has(player))
            return false;
        return this.queue.get(player) === form;
    }
}
