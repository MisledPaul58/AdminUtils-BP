import {
    ActionFormData,
    ActionFormResponse, FormResponse,
    MessageFormData,
    MessageFormResponse,
    ModalFormData,
    ModalFormResponse
} from "@minecraft/server-ui";
import { Player, RawMessage, system, world } from "@minecraft/server";
import { server } from "../server";
import { Translations } from "../utils/translations";

export type FormData = ActionFormData | ModalFormData | MessageFormData;
export type UIAction<T> = (player: Player, contextData: ContextData) => T;
export type SubmitAction = (inputs: { [key: string]: string | number | boolean }, player: Player, contextData: ContextData) => void;
export type BuildData = UIAction<void>[] | string[];
export type ContextData = { [key: string]: any };
export type LocalizedText =  string | RawMessage; //TODO add Translations type

export type DynamicElement<T> = T | UIAction<T>;

export interface BaseInput {
    type: string;
    name: DynamicElement<LocalizedText>;
    default?: DynamicElement<string | number | boolean>;
}

export interface TextField extends BaseInput {
    type: "textField";
    placeholder: DynamicElement<LocalizedText>;
    default?: DynamicElement<string>;
}

export interface Toggle extends BaseInput {
    type: "toggle";
    default?: DynamicElement<boolean>;
}

export interface Slider extends BaseInput {
    type: "slider";
    minimum: DynamicElement<number>;
    maximum: DynamicElement<number>;
    step?: DynamicElement<number>;
    default?: DynamicElement<number>;
}

export interface Dropdown extends BaseInput {
    type: "dropdown";
    items: DynamicElement<LocalizedText[]>;
    default?: DynamicElement<number>;
}

type Input = TextField | Toggle | Slider | Dropdown;

export interface Button {
    // Cant be <LocalizedText> for now because text, subText etc. are my custom implementations
    text: DynamicElement<string>;
    action: UIAction<void>
}

export interface ActionButton extends Button {
    subText?: DynamicElement<string>;
    icon?: string;
}

export interface BaseForm {
    title: DynamicElement<LocalizedText>;
    cancel?: UIAction<void>;
}

export interface ActionForm extends BaseForm {
    buttons: DynamicElement<ActionButton[]>;
    body?: DynamicElement<LocalizedText>;
    back?: DynamicElement<string>;
}

export interface ModalForm extends BaseForm {
    inputs: DynamicElement<{ [key: string]: Input }>;
    submit: SubmitAction;
    submitText?: DynamicElement<LocalizedText>;
}

export interface MessageForm extends BaseForm {
    button1: Button;
    button2: Button;
    body?: DynamicElement<LocalizedText>;
}

export type Form = ActionForm | ModalForm | MessageForm;

//TODO add error handling
abstract class UIForm {
    readonly id: string | undefined;
    protected readonly form: any;
    protected readonly cancelAction: UIAction<void>;

    constructor(form: Form, name?: string) {
        this.form = form;
        this.id = name;
        this.cancelAction = this.form.cancel;
    }

    protected abstract _build(player: Player): FormData;

    abstract enter(player: Player, wait: boolean, contextData: ContextData): Promise<boolean>;

    protected abstract getBuildData(): BuildData;

    protected async _show(player: Player, wait: boolean, onRespond) {
        while (player.isValid && server.ui.inQueue(player, this)) {
            world.sendMessage("aa")
            const form: FormData = this._build(player);
            const buildData: BuildData = this.getBuildData();

            let state = "pending"; //TODO make state an actual object
            world.sendMessage("lol")
            const responsePromise = form.show(player).then((response: FormResponse) => {
                if (!wait || response?.cancelationReason !== "UserBusy") {
                    state = "responded";
                    server.ui.queue.delete(player);
                    server.ui.active.delete(player);
                    onRespond(response, buildData);
                } else {
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
            } else if (server.ui.displayingUI(player, this.id)) { // If something went wrong
                // Reset UI states
                server.ui.active.delete(player);
                server.ui.queue.set(player, this);
            }
        }
        return false;
    }

    protected resolve(element, player: Player) {
        return element instanceof Function ? element(player) : element;
    }
}

class ActionUIForm extends UIForm {
    private actions: UIAction<void>[] = [];

    protected _build(player: Player): ActionFormData {
        this.actions = [];
        const resolveElement = (element) => this.resolve(element, player);

        const formData = new ActionFormData();
        formData.title(resolveElement(this.form.title));
        formData.body(resolveElement(this.form.body) ?? "");

        if (this.form.back) {
            formData.button(`§l<-- ${Translations.Ui.General.BackButton}`, "textures/icons/back.png");
            this.actions.push((player: Player) => server.ui.show(resolveElement(this.form.back), player));
        }

        for (const button of resolveElement(this.form.buttons)) {
            const text = button.subText ? `${resolveElement(button.text)}\n§r§8[ §b§o${resolveElement(button.subText)}§r§8 ]` : resolveElement(button.text);
            formData.button(text, button.icon);
            this.actions.push(button.action);
        }

        return formData;
    }

    enter(player: Player, wait: boolean, contextData: ContextData): Promise<boolean> {
        return this._show(player, wait, (response: ActionFormResponse, actions: UIAction<void>[]) => {
            if (response.canceled) return this.cancelAction?.(player, contextData);

            actions[response.selection as number]?.(player, contextData);
        });
    }

    protected getBuildData(): BuildData {
        return this.actions;
    }
}

class ModalUIForm extends UIForm {
    private inputNames: string[] = [];
    private readonly submitAction: SubmitAction;

    constructor(form: any, name?: string) {
        super(form, name);
        this.submitAction = this.form.submit;
    }

    protected _build(player: Player): ModalFormData {
        this.inputNames = [];
        const resolveElement = (element) => this.resolve(element, player);

        const formData = new ModalFormData();
        formData.title(resolveElement(this.form.title));

        const formInputs = resolveElement(this.form.inputs);
        for (const inputId in formInputs) {
            const input = formInputs[inputId];

            switch (input.type) {
                case "textField":
                    formData.textField(resolveElement(input.name), resolveElement(input.placeholder), { defaultValue: resolveElement(input.default) });
                    break;
                case "toggle":
                    formData.toggle(resolveElement(input.name), { defaultValue: resolveElement(input.default) });
                    break;
                case "slider":
                    formData.slider(resolveElement(input.name), resolveElement(input.minimum), resolveElement(input.maximum), { defaultValue: resolveElement(input.default), valueStep: resolveElement(input.step) });
                    break;
                case "dropdown":
                    formData.dropdown(resolveElement(input.name), resolveElement(input.items), { defaultValueIndex: resolveElement(input.default) });
                    break;
                default:
                    continue;
            }
            this.inputNames.push(inputId);
        }

        if (this.form.submitText) formData.submitButton(resolveElement(this.form.submitText));
        return formData;
    }

    enter(player: Player, wait: boolean, contextData: ContextData): Promise<boolean> {
        return this._show(player, wait, (response: ModalFormResponse, inputNames: string[]) => {
            if (response.canceled) return this.cancelAction?.(player, contextData);

            const inputs: { [key: string]: string | number | boolean } = {};

            for (const [index, value] of response.formValues!.entries()) {
                if (value === undefined) continue;
                inputs[inputNames[index]] = value;
            }

            this.submitAction?.(inputs, player, contextData);
        });
    }

    protected getBuildData(): BuildData {
        return this.inputNames;
    }
}

class MessageUIForm extends UIForm {
    private readonly actions: UIAction<void>[];
    private readonly onRespond: UIAction<void>;

    constructor(form: any, name?: string) {
        super(form, name);
        this.actions = [this.form.button1.action, this.form.button2.action];
        this.onRespond = this.form.onRespond;
    }

    protected _build(player: Player): MessageFormData {
        const resolveElement = (element) => this.resolve(element, player);

        return new MessageFormData()
            .title(resolveElement(this.form.title))
            .body(resolveElement(this.form.body) ?? "")
            .button1(resolveElement(this.form.button1.text))
            .button2(resolveElement(this.form.button2.text));
    }

    enter(player: Player, wait: boolean, contextData: ContextData): Promise<boolean> {
        return this._show(player, wait, (response: MessageFormResponse, actions: UIAction<void>[]) => {
            if (response.canceled) {
                this.cancelAction?.(player, contextData);
                return this.onRespond?.(player, contextData);
            }

            actions[response.selection as number](player, contextData);
            this.onRespond?.(player, contextData);
        });
    }

    protected getBuildData(): BuildData {
        return this.actions;
    }
}

export class UIManager {
    forms = new Map<string, UIForm>();
    queue = new Map<Player, UIForm>();
    active = new Map<Player, UIForm>();

    register(name: string, form: Form): void {
        if (this.forms.has(name)) {
            throw `Error, the ui ${name} has already been registered.`;
        }

        if ("buttons" in form) {
            this.forms.set(name, new ActionUIForm(form as ActionForm, name));

        } else if ("inputs" in form) {
            this.forms.set(name, new ModalUIForm(form as ModalForm, name));

        } else if ("button1" in form) {
            this.forms.set(name, new MessageUIForm(form as MessageForm, name));
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
    show(ui: string, player: Player, wait: boolean = false, contextData: ContextData = {}): boolean {
        if (this.displayingUI(player)) return false;

        const form = this.forms.get(ui);
        if (!form) {
            return false;
        } else {
            world.sendMessage(`${this.inQueue(player, form)}`)
            this.queue.delete(player);
            this.queue.set(player, form);
            form.enter(player, wait, contextData);

            return true;
        }
    }

    confirm(title: string, body: string, player: Player, yes: UIAction<void>, onRespond?: UIAction<void>, no?: UIAction<void>, contextData: ContextData = {}): void {
        const form = new MessageUIForm({
            title,
            body,
            button1: { text: "%ui.confirm.yes", action: yes },
            button2: { text: "%ui.confirm.no", action: no ?? (() => {}) },
            onRespond: onRespond ?? (() => {}),
            cancel: no ?? (() => {})
        });
        this.queue.delete(player);
        this.queue.set(player, form);
        form.enter(player, false, contextData);
    }

    displayingUI(player: Player, ui: string | undefined = undefined): boolean {
        if (!this.active.has(player)) return false;

        if (ui) {
            return this.active.get(player)?.id === ui;
        } else {
            return this.active.has(player);
        }
    }

    inQueue(player: Player, form: UIForm): boolean {
        if (!this.queue.has(player)) return false;

        return this.queue.get(player) === form;
    }
}