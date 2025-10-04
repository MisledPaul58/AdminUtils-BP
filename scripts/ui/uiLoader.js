export class UiLoader {
    *loadUis(bootstrap) {
        for (const id in this.uiIndex) {
            yield bootstrap.ui.register(id, this.uiIndex[id]);
        }
    }
}
