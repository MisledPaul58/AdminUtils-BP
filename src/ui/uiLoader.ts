import { ServerBootstrap } from "../server";
import { UiIndex } from "./index";

export abstract class UiLoader {
    abstract uiIndex: UiIndex;

    *loadUis(bootstrap: ServerBootstrap) {
        for (const id in this.uiIndex) {
            yield bootstrap.ui.register(id, this.uiIndex[id]);
        }
    }
}