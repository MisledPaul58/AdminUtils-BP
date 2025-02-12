import {
    ActionFormData,
    ActionFormResponse, FormResponse,
    MessageFormData,
    MessageFormResponse,
    ModalFormData,
    ModalFormResponse
} from "@minecraft/server-ui";
import { Player, system } from "@minecraft/server";
import { server } from "../server";

export type FormData = ActionFormData | ModalFormData | MessageFormData;
export type UIAction = (player: Player) => void;
export type SubmitAction = (inputs: { [key: string]: string | number | boolean }, player: Player) => void;
export type BuildData = UIAction[] | string[];

//TODO add error handling
abstract class UIForm {
    readonly id: string | undefined;
    protected readonly form: any;
    protected readonly cancelAction: UIAction;

    constructor(form: any, name?: string) {
        this.form = form;
        this.id = name;
        this.cancelAction = this.form.cancel;
    }

    protected abstract _build(player: Player): FormData;

    abstract enter(player: Player, wait: boolean): Promise<boolean>;

    protected abstract getBuildData(): BuildData;

    protected async _show(player: Player, wait: boolean, onRespond) {
        while (player.isValid() && server.ui.inQueue(player, this)) {
            const form: FormData = this._build(player);
            const buildData: BuildData = this.getBuildData();

            let state = "pending"; //TODO make state an actual object

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
    private actions: UIAction[] = [];

    protected _build(player: Player): ActionFormData {
        this.actions = [];
        const resolveElement = (element) => this.resolve(element, player);

        const formData = new ActionFormData();
        formData.title(resolveElement(this.form.title));
        formData.body(resolveElement(this.form.body) ?? "");

        if (this.form.back) {
            formData.button("§l<-- %back.button.text", "textures/icons/back.png");
            this.actions.push((player: Player) => server.ui.show(this.form.back, player));
        }

        for (const button of resolveElement(this.form.buttons)) {
            const text = button.subText ? `${button.text}\n§r§8[ §b§o${button.subText}§r§8 ]` : button.text;
            formData.button(text, button.icon);
            this.actions.push(button.action);
        }

        return formData;
    }

    enter(player: Player, wait: boolean): Promise<boolean> {
        return this._show(player, wait, (response: ActionFormResponse, actions: UIAction[]) => {
            if (response.canceled) return this.cancelAction?.(player);

            actions[response.selection as number]?.(player);
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

        if (this.form.submitText) formData.submitButton(resolveElement(this.form.submitText));
        return formData;
    }

    enter(player: Player, wait: boolean): Promise<boolean> {
        return this._show(player, wait, (response: ModalFormResponse, inputNames: string[]) => {
            if (response.canceled) return this.cancelAction?.(player);

            const inputs: { [key: string]: string | number | boolean } = {};

            for (const [index, value] of response.formValues!.entries()) {
                inputs[inputNames[index]] = value;
            }

            this.submitAction?.(inputs, player);
        });
    }

    protected getBuildData(): BuildData {
        return this.inputNames;
    }
}

class MessageUIForm extends UIForm {
    private readonly actions: UIAction[];

    constructor(form: any, name?: string) {
        super(form, name);
        this.actions = [this.form.button2.action, this.form.button1.action];
    }

    protected _build(player: Player): MessageFormData {
        const resolveElement = (element) => this.resolve(element, player);

        return new MessageFormData()
            .title(resolveElement(this.form.title))
            .body(resolveElement(this.form.body) ?? "")
            .button1(resolveElement(this.form.button2.text))
            .button2(resolveElement(this.form.button1.text));
    }

    enter(player: Player, wait: boolean): Promise<boolean> {
        return this._show(player, wait, (response: MessageFormResponse, actions: UIAction[]) => {
            if (response.canceled) return this.cancelAction?.(player);

            actions[response.selection as number](player);
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

    register(name: string, form): void {
        if (this.forms.has(name)) {
            throw `Error, the ui ${name} has already been registered.`;
        }

        if ("buttons" in form) {
            this.forms.set(name, new ActionUIForm(form, name));

        } else if ("inputs" in form) {
            this.forms.set(name, new ModalUIForm(form, name));

        } else if ("button1" in form) {
            this.forms.set(name, new MessageUIForm(form, name));
        }
    }

    /**
     * Show the specified ui to a player.
     * @param ui The name of the UI.
     * @param player The player that the UI will be shown to.
     * @param wait
     * @returns True if
     */
    show(ui: string, player: Player, wait: boolean = false): boolean {
        if (this.displayingUI(player)) return false;

        const form = this.forms.get(ui);
        if (!form) {
            return false;
        } else {
            this.queue.delete(player);
            this.queue.set(player, form);
            form.enter(player, wait);

            return true;
        }
    }

    confirm(title: string, body: string, player: Player, yes: UIAction, no?: UIAction): void {
        const form = new MessageUIForm({
            title,
            body,
            button1: { text: "%ui.confirm.yes", action: yes },
            button2: { text: "%ui.confirm.no", action: no ?? (() => {}) },
            cancel: no ?? (() => {})
        });
        this.queue.delete(player);
        this.queue.set(player, form);
        form.enter(player, false);
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