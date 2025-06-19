export class Cache {
    constructor() {
        this.permissions = new Map();
    }
    invalidateCache() {
        this.permissions.clear(); //TODO Hacer una caché inteligente? Que solo invalide la caché del user si hay algún cambio grande como quitar una herencia, si no, bastaría con borrar de la caché el permiso que se ha borrado, por ejemplo
    }
}
