class Rank {
    constructor(id, displayName, weight) {
        this.id = id;
        this.displayName = displayName;
        this.weight = weight;

        this.members = [];
        this.parents = [];
        this.permissions = {};
    }


}

class RankBuilder {
    /**
     * @type Map
     */
    #ranks;

    constructor() {
        this.enabled = false;
        this.#ranks = new Map();
    }

    fetch() {

    }

    register() {

    }

    remove() {

    }

    get() {

    }

    has() {

    }
}

export const ranks = new RankBuilder();