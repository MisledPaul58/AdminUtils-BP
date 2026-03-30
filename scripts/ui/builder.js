import { ActionFormData, MessageFormData, ModalFormData } from "@minecraft/server-ui";
import { system, world } from "@minecraft/server";
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
    static resolve(element, context) {
        return element instanceof Function ? element(context, context.player) : element;
    }
    async _show(context, wait, onRespond) {
        const { player } = context;
        const { manager } = context;
        while (player.isValid && manager.inQueue(player, this)) {
            const buildError = this.form.buildErrorMsg;
            let buildResult;
            try {
                buildResult = this._build(context);
            }
            catch (e) {
                if (typeof buildError === "string") {
                    player.sendError(buildError, [e?.name ?? "", e?.message ?? ""]);
                }
                else {
                    player.sendError(Translations.Msg.GenericBuildError);
                }
                manager.queue.delete(player);
                manager.active.delete(player);
                throw e;
            }
            const { form, buildData } = buildResult;
            let state = "pending"; //TODO make state an actual object
            const responsePromise = form.show(player).then((response) => {
                if (!wait || response?.cancelationReason !== "UserBusy") {
                    state = "responded";
                    manager.queue.delete(player);
                    manager.active.delete(player);
                    onRespond(response, buildData);
                }
                else {
                    state = "busy";
                }
            });
            await system.waitTicks(2);
            // If there's still no response it must mean the UI has been opened
            if (state === "pending" && manager.inQueue(player, this)) {
                manager.queue.delete(player);
                manager.active.set(player, this);
            }
            await responsePromise;
            if (state === "responded") {
                return true;
            }
            else if (manager.displayingUI(player, this.id)) { // If something went wrong
                // Reset UI states
                manager.active.delete(player);
                manager.queue.set(player, this);
            }
        }
        return false;
    }
}
class ActionUIForm extends UIForm {
    form;
    constructor(form, name) {
        super(form, name);
        this.form = form;
    }
    _build(context) {
        const actions = [];
        const resolveElement = (element) => UIForm.resolve(element, context);
        const formData = new ActionFormData();
        formData.title(resolveElement(this.form.title));
        formData.body(resolveElement(this.form.body) ?? "");
        if (!this.form.disableBackButton) {
            formData.button(`§l<-- ${Translations.Ui.General.BackButton}`, "textures/icons/back.png");
            actions.push(context => context.back());
        }
        for (const element of resolveElement(this.form.elements)) {
            switch (element.type) {
                case "button":
                    const text = element.subText ? `${resolveElement(element.text)}\n§r§8[ §b§o${resolveElement(element.subText)}§r§8 ]` : resolveElement(element.text);
                    formData.button(text, element.icon);
                    actions.push(element.action);
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
        return { form: formData, buildData: actions };
    }
    enter(context, wait) {
        return this._show(context, wait, (response, actions) => {
            if (response.canceled)
                return this.cancelAction?.(context, context.player);
            actions[response.selection]?.(context, context.player);
        });
    }
}
class ModalUIForm extends UIForm {
    form;
    submitAction;
    constructor(form, name) {
        super(form, name);
        this.form = form;
        this.submitAction = this.form.submit;
    }
    _build(context) {
        const inputData = [];
        const resolveElement = (element) => UIForm.resolve(element, context);
        const formData = new ModalFormData();
        formData.title(resolveElement(this.form.title));
        for (const element of resolveElement(this.form.elements)) {
            switch (element.type) {
                case "textField":
                    formData.textField(resolveElement(element.name), resolveElement(element.placeholder ?? ""), { defaultValue: resolveElement(element.default) });
                    inputData.push({ id: element.inputId });
                    break;
                case "toggle":
                    formData.toggle(resolveElement(element.name), { defaultValue: resolveElement(element.default) });
                    inputData.push({ id: element.inputId });
                    break;
                case "slider":
                    formData.slider(resolveElement(element.name), resolveElement(element.minimum), resolveElement(element.maximum), { defaultValue: resolveElement(element.default), valueStep: resolveElement(element.step) });
                    inputData.push({ id: element.inputId });
                    break;
                case "dropdown":
                    const items = resolveElement(element.items);
                    formData.dropdown(resolveElement(element.name), items, { defaultValueIndex: resolveElement(element.default) });
                    inputData.push({ id: element.inputId, items });
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
        if (this.form.submitText)
            formData.submitButton(resolveElement(this.form.submitText));
        return { form: formData, buildData: inputData };
    }
    enter(context, wait) {
        return this._show(context, wait, (response, inputData) => {
            if (response.canceled) {
                if (!this.cancelAction) {
                    return context.back();
                }
                return this.cancelAction(context, context.player);
            }
            const inputs = {};
            world.sendMessage(`${JSON.stringify(response.formValues)}`);
            for (const [index, value] of response.formValues.entries()) {
                if (value === undefined || value === null)
                    continue;
                const currentInput = inputData[index];
                if (currentInput === undefined || currentInput === null)
                    continue;
                if ("items" in currentInput) { // If the input is a dropdown
                    const itemIndex = value;
                    inputs[currentInput.id] = currentInput.items[itemIndex]; // Save in inputs the selected item with the input name as the key
                }
                else {
                    inputs[currentInput.id] = value;
                }
            }
            this.submitAction?.(inputs, context.player, context);
        });
    }
}
class MessageUIForm extends UIForm {
    form;
    actions;
    onRespond;
    constructor(form, name) {
        super(form, name);
        this.form = form;
        this.actions = [this.form.button1.action, this.form.button2.action];
        this.onRespond = this.form.onRespond;
    }
    _build(context) {
        const resolveElement = (element) => UIForm.resolve(element, context);
        return {
            form: new MessageFormData()
                .title(resolveElement(this.form.title))
                .body(resolveElement(this.form.body) ?? "")
                .button1(resolveElement(this.form.button1.text))
                .button2(resolveElement(this.form.button2.text)),
            buildData: this.actions
        };
    }
    enter(context, wait) {
        return this._show(context, wait, (response, actions) => {
            const { player } = context;
            if (response.canceled) {
                this.cancelAction?.(context, player);
                return this.onRespond?.(context, player);
            }
            actions[response.selection](context, player);
            this.onRespond?.(context, player);
        });
    }
}
class MenuContext {
    stack = [];
    data = {};
    player;
    manager;
    constructor(player, manager) {
        this.player = player;
        this.manager = manager;
    }
    getData(key) {
        return this.data[key];
    }
    setData(key, value) {
        this.data[key] = value;
    }
    goTo(ui, wait = false) {
        const form = this.manager.forms.get(ui);
        if (this.stack.length >= 100)
            throw Error("UI stack overflow");
        if (form && this.stack[this.stack.length - 1] !== form)
            this.stack.push(form); //TODO vigilar bien los confirms o los messageformdatas en this.stack
        return this.manager._goTo(ui, this.player, this, wait);
    }
    back(n = 1) {
        const currentForm = this.stack.pop(); // Remove current form from stack
        let previousForm;
        for (let i = 0; i < n; i++) {
            previousForm = this.stack.pop();
            while (previousForm?.id.startsWith("__internal_confirm_")) { // If the previous form was a confirm menu or a MessageFormData
                previousForm = this.stack.pop();
            }
        }
        if (!(currentForm instanceof UIForm) || !(previousForm instanceof UIForm))
            return;
        if (currentForm instanceof ActionUIForm) {
            if (!currentForm.form.back) {
                return this.goTo(previousForm.id);
            }
            // Override previous form
            const backForm = UIForm.resolve(currentForm.form.back, this);
            return this.goTo(backForm);
        }
        return this.goTo(previousForm.id);
    }
    confirm(title, body, yes, onRespond, no) {
        const formId = `__internal_confirm_${Date.now()}__`;
        const defaultAction = !onRespond && !no ? (context) => context.back() : no ?? (() => { });
        const form = new MessageUIForm({
            title,
            body,
            button1: { text: "%ui.confirm.yes", action: yes },
            button2: { text: "%ui.confirm.no", action: defaultAction },
            onRespond,
            cancel: defaultAction
        }, formId);
        this.stack.push(form);
        this.manager.queue.delete(this.player);
        this.manager.queue.set(this.player, form);
        form.enter(this, false);
    }
}
export class UIManager {
    forms = new Map();
    queue = new Map();
    active = new Map();
    register(name, form) {
        if (this.forms.has(name)) { //TODO prevent names that begin with __internal_confirm_
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
     * @returns True if the UI is found. False if the UI isn't found or the player is already in a UI.
     */
    //TODO make this work with permissions!! Actually implement it while building the uis for a player!
    show(ui, player, wait = false) {
        if (this.displayingUI(player))
            return false;
        const context = new MenuContext(player, this);
        return context.goTo(ui, wait);
    }
    _goTo(ui, player, context, wait) {
        if (this.displayingUI(player))
            return false;
        const form = this.forms.get(ui);
        if (!form) {
            return false;
        }
        else {
            this.queue.delete(player);
            this.queue.set(player, form);
            form.enter(context, wait);
            return true;
        }
    }
    // confirm(title: string, body: string, player: Player, yes: UIAction<void>, onRespond?: UIAction<void>, no?: UIAction<void>, contextData: ContextData = {}): void {
    //     const formId = `__internal_confirm_${Date.now()}`;
    //     const form = new MessageUIForm({
    //         title,
    //         body,
    //         button1: { text: "%ui.confirm.yes", action: yes },
    //         button2: { text: "%ui.confirm.no", action: no ?? (() => {}) },
    //         onRespond, //TODO está mal?, he estado usando el onrespond como un cancel?
    //         cancel: no
    //     }, formId);
    //     this.queue.delete(player);
    //     this.queue.set(player, form);
    //     form.enter(player, false, contextData);
    // }
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
