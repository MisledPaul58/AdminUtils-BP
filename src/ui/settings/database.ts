import { world } from "@minecraft/server";
import { DB } from "../../database/databaseManager";
import {
    AUTO_BACKUP_MINUTES,
    backupReasonName,
    backups,
    clampAutoBackupInterval,
    formatBackupDate,
    formatBackupSize,
    getAutoBackupIntervalMinutes
} from "../../database/backups";
import { server } from "../../server";
import {
    ActionButton,
    ActionElement,
    ActionForm,
    Divider,
    Label,
    ModalForm,
    Slider,
    TextField,
    Toggle
} from "../builder";

function storageSummary(): string {
    const stored = backups.list().length;
    const used = formatBackupSize(world.getDynamicPropertyTotalByteCount());
    return `§7Stored backups: §f${stored}/${backups.maxBackups}\n§7Dynamic property storage: §f${used}`;
}

export const manageDatabases: ActionForm = {
    type: "action",
    title: "%settings.database.title",
    body: storageSummary,
    elements: [
        {
            type: "button",
            text: "%settings.database.create",
            icon: "textures/icons/add.png",
            permission: "ui.settings.databases.backup",
            action: (context) => {
                context.goTo("createBackup");
            }
        } as ActionButton,
        {
            type: "button",
            text: "%settings.database.manage",
            subText: () => `${backups.list().length}/${backups.maxBackups}`,
            icon: "textures/icons/database.png",
            permission: "ui.settings.databases.manage",
            action: (context) => {
                context.goTo("manageBackups");
            }
        } as ActionButton,
        {
            type: "divider"
        } as Divider,
        {
            type: "button",
            text: "%settings.database.auto",
            subText: () => DB.Config.get("autoBackup")
                ? `On §8· §7${getAutoBackupIntervalMinutes()} min`
                : "Off",
            icon: "textures/icons/settings2.png",
            permission: "ui.settings.databases.config",
            action: (context) => {
                context.goTo("databaseSettings");
            }
        } as ActionButton
    ]
};

export const createBackup: ModalForm = {
    type: "modal",
    title: "%settings.database.create.title",
    elements: [
        {
            type: "textField",
            inputId: "name",
            name: "%settings.database.create.name",
            placeholder: "Manual backup",
            default: () => "Manual backup"
        } as TextField
    ],
    submitText: "%ui.submitText.save",
    submit: (inputs, player, context) => {
        const result = backups.create("manual", inputs.name as string);
        if (!result.ok) {
            player.sendError("settings.database.backupError");
            return;
        }

        player.sendSuccess("settings.database.backupSuccess");
        context.back();
    }
};

export const manageBackups: ActionForm = {
    type: "action",
    title: "%settings.database.list.title",
    body: storageSummary,
    elements: () => {
        const elements: ActionElement[] = [];
        const stored = backups.list();

        if (stored.length === 0) {
            elements.push({
                type: "label",
                text: "%settings.database.list.empty"
            } as Label);

            return elements;
        }

        for (const backup of stored) {
            elements.push({
                type: "button",
                text: backup.name,
                subText: `${backupReasonName(backup.reason)} §8· §7${formatBackupDate(backup.createdAt)} §8· §7${formatBackupSize(backup.bytes)}`,
                icon: "textures/icons/database.png",
                permission: "ui.settings.databases.manage",
                action: (context) => {
                    context.setData("backupSlot", backup.slot);
                    context.goTo("backupActions");
                }
            } as ActionButton);
        }

        return elements;
    }
};

export const backupActions: ActionForm = {
    type: "action",
    title: "%settings.database.list.title",
    elements: (context) => {
        const slot = context.getData<number>("backupSlot");
        const backup = slot === undefined ? undefined : backups.get(slot);

        if (slot === undefined || !backup) {
            return [
                {
                    type: "label",
                    text: "%settings.database.notFound"
                } as Label
            ];
        }

        return [
            {
                type: "label",
                text: `§7Name: §f${backup.name}`
            } as Label,
            {
                type: "label",
                text: `§7Created: §f${formatBackupDate(backup.createdAt)}`
            } as Label,
            {
                type: "label",
                text: `§7Type: §f${backupReasonName(backup.reason)}`
            } as Label,
            {
                type: "label",
                text: `§7Tables: §f${backup.tables.join(", ")}`
            } as Label,
            {
                type: "label",
                text: `§7Size: §f${formatBackupSize(backup.bytes)}`
            } as Label,
            {
                type: "divider"
            } as Divider,
            {
                type: "button",
                text: "%settings.database.restore",
                icon: "textures/icons/tick.png",
                permission: "ui.settings.databases.restore",
                action: (context) => {
                    context.confirm(
                        "%settings.database.restore",
                        "%settings.database.restore.confirm",
                        (context) => {
                            const result = server.restoreDatabase(slot);
                            if (!result.ok) {
                                context.player.sendError("settings.database.restoreError");
                                return;
                            }

                            context.player.sendSuccess("settings.database.restoreSuccess");
                            context.back(2);
                        }
                    );
                }
            } as ActionButton,
            {
                type: "button",
                text: "%settings.database.delete",
                icon: "textures/icons/delete.png",
                permission: "ui.settings.databases.delete",
                action: (context) => {
                    context.confirm(
                        "%settings.database.delete",
                        "%settings.database.delete.confirm",
                        (context) => {
                            if (!backups.delete(slot)) {
                                context.player.sendError("settings.database.deleteError");
                                return;
                            }

                            context.player.sendSuccess("settings.database.deleteSuccess");
                            context.back(2);
                        }
                    );
                }
            } as ActionButton
        ];
    }
};

export const databaseSettings: ModalForm = {
    type: "modal",
    title: "%settings.database.auto.title",
    elements: [
        {
            type: "label",
            text: "%settings.database.auto.info"
        } as Label,
        {
            type: "toggle",
            inputId: "autoBackup",
            name: "%settings.database.auto.toggle",
            default: () => DB.Config.get("autoBackup") ?? false
        } as Toggle,
        {
            type: "slider",
            inputId: "autoBackupInterval",
            name: "%settings.database.auto.interval",
            minimum: AUTO_BACKUP_MINUTES.min,
            maximum: AUTO_BACKUP_MINUTES.max,
            step: AUTO_BACKUP_MINUTES.step,
            default: () => getAutoBackupIntervalMinutes()
        } as Slider
    ],
    submitText: "%ui.submitText.save",
    submit: (inputs, player, context) => {
        const enabled = Boolean(inputs.autoBackup);
        DB.Config.assignMemory({
            autoBackup: enabled,
            autoBackupIntervalMinutes: clampAutoBackupInterval(inputs.autoBackupInterval)
        });

        player.sendSuccess(enabled ? "settings.database.autoOn" : "settings.database.autoOff");
        context.back();
    }
};
