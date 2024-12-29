import { Player, world } from "@minecraft/server";

abstract class UIForm<T extends {}> {
    private readonly form: Form<T>;
    protected readonly cancelAction?: UIAction<T, void>;
    private xd: Player;

    constructor(form: Form<T>) {
        //xd
        this.form = form;
        this.cancelAction = form.cancel;
        this.xd = world.getPlayers()[0];
    }
}

interface BaseForm<T extends {}> {
    /** The title of the UI form */
    title: any;
    /** Action to perform when the user exits or cancels the form */
    cancel?: any;
}

/** A form with a message and two options */
interface MessageForm<T extends {}> extends BaseForm<T> {
    message: any;
    button1: any;
    button2: any;
}

/** A form with an array of buttons to interact with */
interface ActionForm<T extends {}> extends BaseForm<T> {
    /** Text that appears above the array of buttons */
    message?: any;
    /** The array of buttons to interact with */
    buttons: any;
}

interface ModalForm<T extends {}> extends BaseForm<T> {
    inputs: any;
    submit: any;
}

type UIFormName = `$${string}`;
type UIAction<T extends {}, S> = (ctx: MenuContext<T>, player: Player) => S;
type Form<T extends {}> = MessageForm<T> | ActionForm<T> | ModalForm<T>;

interface MenuContext<T extends {}> {
    readonly currentMenu: UIFormName;

    getData<S extends keyof T>(key: S): T[S];
    setData<S extends keyof T>(key: S, value: T[S]): void;
    goto(menu: UIFormName): void;
    returnto(menu: UIFormName): void;
    back(): void;
    confirm(title: any, message: any, yes: UIAction<T, void>, no?: UIAction<T, void>): void;
    error(errorMessage: any): void;
}

const enum aa {
    Apple = 0,
    Banana = 1
}
if (aa.Apple === 0) {

}