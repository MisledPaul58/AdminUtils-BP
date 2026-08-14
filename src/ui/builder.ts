import {
    ActionFormData,
    ActionFormResponse, FormResponse,
    MessageFormData,
    MessageFormResponse,
    ModalFormData,
    ModalFormResponse
} from "@minecraft/server-ui";
import { Player, RawMessage, system, world } from "@minecraft/server";
import { Translations, TranslationsType } from "../utils/translations";
import { server } from "../server";
import { PermissionManager } from "../permissions/permissionManager";

export type FormData = ActionFormData | ModalFormData | MessageFormData;

interface BuildResult<T extends FormData> {
    form: T;
    buildData: BuildData;
}

export type UIAction<T> = (context: MenuContext, player: Player) => T;
export type SubmitAction = (inputs: { [key: string]: string | number | boolean }, player: Player, context: MenuContext) => void;
type ModalBuildData = { [key: string]: any }[];
export type BuildData = UIAction<void>[] | string[] | ModalBuildData;
export type ContextData = { [key: string]: any };
export type LocalizedText =  string | RawMessage; //TODO add Translations type

export type DynamicElement<T> = T | UIAction<T>;

export interface StackFrame {
    form: UIForm,
    data: ContextData
}

export interface BaseInput {
    type: string;
    inputId: string;
    name: DynamicElement<LocalizedText>;
    default?: DynamicElement<string | number | boolean>;
}

export interface TextField extends BaseInput {
    type: "textField";
    placeholder?: DynamicElement<LocalizedText>;
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

export interface Header {
    type: "header";
    text: DynamicElement<LocalizedText>;
}

export interface Label {
    type: "label";
    text: DynamicElement<LocalizedText>;
}

export interface Divider {
    type: "divider";
}

type Input = TextField | Toggle | Slider | Dropdown;
export type ModalElement = Input | Header | Label | Divider;

export interface Button {
    type: "button";
    // Cant be <LocalizedText> for now because text, subText etc. are my custom implementations
    text: DynamicElement<string>;
    action: UIAction<void>
}

export type PermissionType = (PermissionManager["PERMISSIONS"])[number];
export interface ActionButton extends Button {
    subText?: DynamicElement<string>;
    icon?: string;
    permission?: PermissionType;
}

export type ActionElement = ActionButton | Header | Label | Divider;

export interface BaseForm {
    type: string;
    title: DynamicElement<LocalizedText>;
    cancel?: UIAction<void>;
    buildErrorMsg?: string;
}

export interface ActionForm extends BaseForm {
    type: "action";
    elements: DynamicElement<ActionElement[]>;
    body?: DynamicElement<LocalizedText>;
    disableBackButton?: boolean;
    back?: DynamicElement<string>;
}

export interface ModalForm extends BaseForm {
    type: "modal";
    elements: DynamicElement<ModalElement[]>;
    submit: SubmitAction;
    submitText?: DynamicElement<LocalizedText>;
}

export interface MessageForm extends BaseForm {
    type: "message";
    button1: Button;
    button2: Button;
    onRespond: UIAction<void>;
    body?: DynamicElement<LocalizedText>;
}

export type Form = ActionForm | ModalForm | MessageForm;

//TODO add error handling
abstract class UIForm {
    readonly id: string;
    readonly form: Form;
    readonly cancelAction: UIAction<void> | undefined;

    constructor(form: Form, name: string) {
        this.form = form;
        this.id = name;
        this.cancelAction = this.form.cancel;
    }

    static resolve<T>(element: DynamicElement<T>, context: MenuContext): T {
        return element instanceof Function ? element(context, context.player) : element;
    }

    protected abstract _build(context: MenuContext): BuildResult<FormData>;

    abstract enter(context: MenuContext, wait: boolean): Promise<boolean>;

    protected async _show(context: MenuContext, wait: boolean, onRespond) {
        const { player } = context;
        const { manager } = context;
        while (player.isValid && manager.inQueue(player, this)) {
            const buildError: TranslationsType | undefined = this.form.buildErrorMsg;

            let buildResult: BuildResult<FormData>;
            try {
                buildResult = this._build(context);
            } catch (e) {
                if (typeof buildError === "string") {
                    player.sendError(buildError, [(e as Error)?.name ?? "", (e as Error)?.message ?? ""]);
                } else {
                    player.sendError(Translations.Msg.GenericBuildError);
                }
                manager.queue.delete(player);
                manager.active.delete(player);
                throw e;
            }

            const { form, buildData } = buildResult;

            let state = "pending"; //TODO make state an actual object
            const responsePromise = form.show(player).then((response: FormResponse) => {
                if (!wait || response?.cancelationReason !== "UserBusy") {
                    state = "responded";
                    manager.queue.delete(player);
                    manager.active.delete(player);
                    onRespond(response, buildData);
                } else {
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
            } else if (manager.displayingUI(player, this.id)) { // If something went wrong
                // Reset UI states
                manager.active.delete(player);
                manager.queue.set(player, this);
            }
        }
        return false;
    }
}

class ActionUIForm extends UIForm { //TODO add only view buttons if you have a permission
    readonly form: ActionForm;

    constructor(form: ActionForm, name: string) {
        super(form, name);
        this.form = form;
    }

    protected _build(context: MenuContext): BuildResult<ActionFormData> {
        const actions: UIAction<void>[] = [];
        const resolveElement = <T>(element: DynamicElement<T>) => UIForm.resolve(element, context);

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
                    if (element.permission && server.permission.hasPermission(element.permission, context.player, true) === false) // The "true" value here is important
                        continue;

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

    enter(context: MenuContext, wait: boolean): Promise<boolean> {
        return this._show(context, wait, (response: ActionFormResponse, actions: UIAction<void>[]) => {
            if (response.canceled) return this.cancelAction?.(context, context.player);

            actions[response.selection as number]?.(context, context.player);
        });
    }
}

class ModalUIForm extends UIForm {
    readonly form: ModalForm;
    private readonly submitAction: SubmitAction;

    constructor(form: any, name: string) {
        super(form, name);
        this.form = form;
        this.submitAction = this.form.submit;
    }

    protected _build(context: MenuContext): BuildResult<ModalFormData> {
        const inputData: ModalBuildData = [];
        const resolveElement = <T>(element: DynamicElement<T>) => UIForm.resolve(element, context);

        const formData = new ModalFormData();
        formData.title(resolveElement(this.form.title));

        for (const element of resolveElement(this.form.elements) as ModalElement[]) {
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
                    let items: LocalizedText[] = resolveElement(element.items);
                    if (items.length === 0) items = [""];
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

        if (this.form.submitText) formData.submitButton(resolveElement(this.form.submitText));
        return { form: formData, buildData: inputData };
    }

    enter(context: MenuContext, wait: boolean): Promise<boolean> {
        return this._show(context, wait, (response: ModalFormResponse, inputData: ModalBuildData) => {
            if (response.canceled) {
                if (!this.cancelAction) {
                    return context.back();
                }
                return this.cancelAction(context, context.player);
            }

            const inputs: { [key: string]: any } = {};

            // Filter out wrong values due to labels, dividers, etc.
            const filteredFormValues = response.formValues!.filter(element => element !== undefined && element !== null);

            for (const [index, value] of filteredFormValues.entries()) {
                const currentInput = inputData[index];

                if (currentInput === undefined || currentInput === null) continue;
                if ("items" in currentInput)  { // If the input is a dropdown
                    const itemIndex = value as number;
                    inputs[currentInput.id] = currentInput.items[itemIndex]; // Save in inputs the selected item with the input name as the key
                } else {
                    inputs[currentInput.id] = value;
                }
            }

            this.submitAction?.(inputs, context.player, context);
        });
    }
}

class MessageUIForm extends UIForm {
    readonly form: MessageForm;
    private readonly actions: UIAction<void>[];
    private readonly onRespond?: UIAction<void>;

    constructor(form: any, name: string) {
        super(form, name);
        this.form = form;
        this.actions = [this.form.button1.action, this.form.button2.action];
        this.onRespond = this.form.onRespond;
    }

    protected _build(context: MenuContext): BuildResult<MessageFormData> {
        const resolveElement = <T>(element: DynamicElement<T>) => UIForm.resolve(element, context);

        return {
            form: new MessageFormData()
                .title(resolveElement(this.form.title))
                .body(resolveElement(this.form.body) ?? "")
                .button1(resolveElement(this.form.button1.text))
                .button2(resolveElement(this.form.button2.text)),
            buildData: this.actions
        }
    }

    enter(context: MenuContext, wait: boolean): Promise<boolean> {
        return this._show(context, wait, (response: MessageFormResponse, actions: UIAction<void>[]) => {
            const { player } = context;
            if (response.canceled) {
                this.cancelAction?.(context, player);
                return this.onRespond?.(context, player);
            }

            actions[response.selection as number](context, player);
            this.onRespond?.(context, player);
        });
    }
}

class MenuContext {
    private stack: StackFrame[] = [];
    private data: ContextData = {};
    public readonly player: Player;
    public readonly manager: UIManager;

    constructor(player: Player, manager: UIManager) {
        this.player = player;
        this.manager = manager;
    }

    getData<T>(key: string): T | undefined {
        return this.data[key] as T;
    }

    setData<T>(key: string, value: T): void {
        this.data[key] = value as T;
    }

    goTo(ui: string, wait: boolean = false): boolean {
        const form = this.manager.forms.get(ui);

        if (this.stack.length >= 100) throw Error("UI stack overflow");

        if (form && this.stack[this.stack.length - 1]?.form !== form) { //TODO vigilar bien los confirms o los messageformdatas en this.stack
            this.stack.push({ form, data: {...this.data} });
        }
        return this.manager._goTo(ui, this.player, this, wait);
    }

    back(n: number = 1) { //Hacer que se pueda hacer back pero solo para borrar un poco el stack, sin mostrar ui? para holder.ts manageSelectedParent editGroup
        const currentFrame = this.stack.pop(); // Remove current form from stack
        let previousFrame: StackFrame | undefined;

        for (let i = 0; i < n; i++) {
            previousFrame = this.stack.pop();

            while (previousFrame?.form.id.startsWith("__internal_confirm_")) { // If the previous form was a confirm menu or a MessageFormData
                previousFrame = this.stack.pop();
            }
        }

        if (!currentFrame || !previousFrame) return;

        const currentForm = currentFrame.form;
        const previousForm = previousFrame.form;

        this.data = {...previousFrame.data};

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

    confirm(title: LocalizedText, body: LocalizedText, yes: UIAction<void>, onRespond?: UIAction<void>, no?: UIAction<void>) {
        const formId = `__internal_confirm_${Date.now()}__`;
        const defaultAction: UIAction<void> = !onRespond && !no ? (context) => context.back() : no ?? (() => {});

        const form = new MessageUIForm({
            title,
            body,
            button1: { text: "%ui.confirm.yes", action: yes },
            button2: { text: "%ui.confirm.no", action: defaultAction },
            onRespond,
            cancel: defaultAction
        }, formId);

        this.stack.push({ form, data: { ...this.data } });

        this.manager.queue.delete(this.player);
        this.manager.queue.set(this.player, form);
        form.enter(this, false);
    }
}

export class UIManager {
    forms = new Map<string, UIForm>();
    queue = new Map<Player, UIForm>();
    active = new Map<Player, UIForm>();

    register(name: string, form: Form): void { //TODO create a type or an enum that contains all the possible ui names
        if (this.forms.has(name)) { //TODO prevent names that begin with __internal_confirm_
            throw `Error, the ui ${name} has already been registered.`;
        }

        if (form.type === "action") {
            this.forms.set(name, new ActionUIForm(form as ActionForm, name));

        } else if (form.type === "modal") {
            this.forms.set(name, new ModalUIForm(form as ModalForm, name));

        } else if (form.type === "message") {
            this.forms.set(name, new MessageUIForm(form as MessageForm, name));
        }
    }

    /**
     * Show the specified ui to a player.
     * @param ui The name of the UI.
     * @param player The player that the UI will be shown to.
     * @param wait
     * @returns True if the UI is found. False if the UI isn't found or the player is already in a UI.
     */
    show(ui: string, player: Player, wait: boolean = false): boolean {
        if (this.displayingUI(player)) return false;

        const context = new MenuContext(player, this);
        return context.goTo(ui, wait);
    }

    _goTo(ui: string, player: Player, context: MenuContext, wait: boolean): boolean {
        if (this.displayingUI(player)) return false;

        const form = this.forms.get(ui);
        if (!form) {
            return false;
        } else {
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