import { PermissionHolder } from "./model/permissionHolder";

export class Cache<T extends PermissionHolder<T>> {
    public permissions = new Map<string, boolean>();

    invalidateCache() {
        this.permissions.clear(); //Hacer una caché inteligente? Que solo invalide la caché del user si hay algún cambio grande como quitar una herencia, si no, bastaría con borrar de la caché el permiso que se ha borrado, por ejemplo
    }
}