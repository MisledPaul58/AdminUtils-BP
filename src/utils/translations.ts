export const Translations = Object.freeze({
    Msg: {
        SystemReload: "system.reload" as const,
        GenericBuildError: "ui.genericBuildError" as const,
        Permissions: {
            InvalidIdentifier: "permissions.invalidIdentifier" as const,
            InvalidName: "permissions.invalidName" as const,
            ExistingGroupError: "permissions.existingGroupError" as const,
            GroupCreated: "permissions.groupCreated" as const,
            GroupPropertiesError: "permissions.groupPropertiesError" as const
        }
    },
    Ui: {
        General: {
            BackButton: "%back.button.text" as const,
            SubTextOpen: "%ui.subText.open" as const,
            SubTextEdit: "%ui.subText.edit" as const,
            SubTextManage: "%ui.subText.manage" as const,
            SubTextToggle: "%ui.subText.toggle" as const,
            SubmitTextConfirm: "%ui.submitText.confirm" as const,
            ConfirmYes: "%ui.confirm.yes" as const,
            ConfirmNo: "%ui.confirm.no" as const,
            StateEnabled: "%ui.StateEnabled" as const,
            StateDisabled: "%ui.StateDisabled" as const,
        },
        MainMenu: {
            Title: "%mainMenu.title" as const,
            Button1Text: "%mainMenu.button1.text" as const,
            Button2Text: "%mainMenu.button2.text" as const,
            Button3Text: "%mainMenu.button3.text" as const,
        },
        Settings: {
            Main: {
                Title: "%settings.main.title" as const,
                Button1Text: "%settings.main.button1.text" as const,
                Button2Text: "%settings.main.button2.text" as const,
            },
            Config: {
                Title: "%settings.config.title" as const,
                Input1Name: "%settings.config.input1.name" as const,
                Input2Name: "%settings.config.input2.name" as const,
                Input3Name: "%settings.config.input3.name" as const,
            },
            Admins: {
                Title: "%settings.admins.main.title" as const,
                Body: "%settings.admins.main.body" as const,
                Button1Text: "%settings.admins.main.button1.text" as const,
            },
        },
        Plugins: {
            Main: {
                Title: "%pluginsMain.title" as const,
                PermissionsButtonText: "%pluginsMain.buttons.permissions.text" as const,
            },
            Permissions: {
                Title: "%plugins.permissions.title" as const,
                ConfirmEnableBody: "%plugins.permissions.confirmEnable.body" as const,
                ConfirmDisableBody: "%plugins.permissions.confirmDisable.body" as const,
                Groups: "%plugins.permissions.groups" as const,
                Users: "%plugins.permissions.users" as const,
                Permissions: "%plugins.permissions.permissions" as const,
                CreateNewGroup: "%plugins.permissions.createNewGroup" as const,
                EditProperties: "%plugins.permissions.editProperties" as const,
                ManagePermissions: "%plugins.permissions.managePermissions" as const,
                ManageInheritance: "%plugins.permissions.manageInheritance" as const,
                CreateGroup: "%plugins.permissions.createGroup" as const,
                Identifier: "%plugins.permissions.identifier" as const,
                DisplayName: "%plugins.permissions.displayName" as const,
                Weight: "%plugins.permissions.weight" as const,
                InheritsFrom: "%plugins.permissions.inheritsFrom" as const
            }
        },
    },
} as const);

type LeafValues<T> = T extends string
    ? T
    : T extends Record<string, any>
        ? LeafValues<T[keyof T]>
        : never;

export type TranslationsType = LeafValues<typeof Translations>;